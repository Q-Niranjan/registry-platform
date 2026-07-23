import { BaseWidgetConfig, SectionConfig } from '../../../types';
import { getValueByPath } from '../../../utils/pathUtils';
import { buildScopeResolver } from '../../../context/SectionScopeContext';
import { collectWidgets } from '../../../utils/sectionValidate';
import {
  extractTableRecordsFromSnapshot,
  isTableLikeWidget,
} from '../../../utils/extractTableRecordsFromSnapshot';
import { SectionChanges } from '../types';

export type SectionRecordsEditAction = 'always' | 'when-register-id';
export type SectionRecordsWhenEmpty = 'empty-array' | 'single-record' | 'raw-snapshot';

export interface BuildSectionRecordsOptions {
  sectionRegisterId?: string;
  editAction?: SectionRecordsEditAction;
  whenEmpty?: SectionRecordsWhenEmpty;
}

const collectWidgetPathSnapshot = (
  widgets: BaseWidgetConfig[],
  sourceData: Record<string, unknown>,
  sectionRegisterId?: string,
): { snapshot: Record<string, unknown>; hasTable: boolean } => {
  const toStorePath = buildScopeResolver(sectionRegisterId);
  const snapshot: Record<string, unknown> = {};
  let hasTable = false;

  widgets.forEach((widget) => {
    const widgetPath = widget['widget-data-path'];
    if (!widgetPath) return;

    if (isTableLikeWidget(widget)) {
      hasTable = true;
    }

    if (typeof widgetPath === 'object') {
      Object.values(widgetPath).forEach((path: unknown) => {
        if (typeof path === 'string' && path.length > 0) {
          const storePath = toStorePath ? toStorePath(path) : path;
          snapshot[path] = getValueByPath(sourceData, storePath);
        }
      });
    } else if (typeof widgetPath === 'string') {
      const storePath = toStorePath ? toStorePath(widgetPath) : widgetPath;
      snapshot[widgetPath] = getValueByPath(sourceData, storePath);
    }
  });

  return { snapshot, hasTable };
};

const buildRawSnapshotRecord = (
  widgets: BaseWidgetConfig[],
  sourceData: Record<string, unknown>,
  sectionRegisterId?: string,
): unknown[] => {
  const { snapshot } = collectWidgetPathSnapshot(widgets, sourceData, sectionRegisterId);
  return [{ ...snapshot }];
};

export const buildSectionRecords = (
  widgets: BaseWidgetConfig[],
  sourceData: Record<string, unknown>,
  {
    sectionRegisterId,
    editAction = 'when-register-id',
    whenEmpty = 'single-record',
  }: BuildSectionRecordsOptions = {},
): unknown[] => {
  if (!widgets.length) {
    if (whenEmpty === 'empty-array') return [];
    if (whenEmpty === 'raw-snapshot') return buildRawSnapshotRecord(widgets, sourceData, sectionRegisterId);
    const sectionData = sectionRegisterId
      ? (sourceData[sectionRegisterId] as Record<string, unknown> | undefined) ?? {}
      : {};
    return [
      {
        ...sectionData,
        ...(editAction === 'always' || sectionRegisterId ? { edit_action: 'UPDATE' as const } : {}),
      },
    ];
  }

  const { snapshot, hasTable } = collectWidgetPathSnapshot(widgets, sourceData, sectionRegisterId);

  if (!hasTable) {
    /**
     * Snapshot keys are schema paths:
     * - Scoped (new): already relative field names (e.g. "prefix", "documents") — use as-is.
     * - Legacy (old): UUID-prefixed strings (e.g. "uuid.prefix") — strip first segment.
     *
     * When sectionRegisterId is provided we are in scoped mode and keys are field-relative;
     * no stripping is needed. Legacy behavior is preserved when sectionRegisterId is absent.
     */
    const cleanedSnapshot: Record<string, unknown> = {};
    Object.entries(snapshot).forEach(([schemaPath, value]) => {
      const fieldPath = sectionRegisterId
        ? schemaPath
        : schemaPath.includes('.')
          ? schemaPath.split('.').slice(1).join('.')
          : schemaPath;
      cleanedSnapshot[fieldPath] = value;
    });

    const sectionData = sectionRegisterId
      ? (sourceData[sectionRegisterId] as Record<string, unknown> | undefined) ?? {}
      : {};

    const includeEditAction =
      editAction === 'always' ||
      (editAction === 'when-register-id' && sectionRegisterId);

    return [
      {
        ...sectionData,
        ...cleanedSnapshot,
        ...(includeEditAction ? { edit_action: 'UPDATE' as const } : {}),
      },
    ];
  }

  return extractTableRecordsFromSnapshot(snapshot, widgets);
};

export const collectSectionSupportingFiles = (
  section: SectionConfig,
  sourceData: Record<string, unknown>,
  sectionRegisterId?: string,
): unknown[] => {
  const toStorePath = buildScopeResolver(sectionRegisterId);
  const files: unknown[] = [];
  const supportingDocuments = section['section-supporting-documents'] || [];
  supportingDocuments.forEach((doc) => {
    const path = doc['document-data-path'];
    if (path) {
      const storePath = toStorePath ? toStorePath(path) : path;
      files.push(getValueByPath(sourceData, storePath));
    }
  });
  return files;
};

/** Save flow: records for change detection and onSectionSave payloads. */
export const trackSectionChanges = (
  widgets: ReturnType<typeof collectWidgets>,
  sourceData: Record<string, unknown>,
  sectionRegisterId?: string,
): unknown[] =>
  buildSectionRecords(widgets, sourceData, {
    sectionRegisterId,
    editAction: 'always',
    whenEmpty: 'empty-array',
  });

/** Dirty-state baseline: records + supporting-document files. */
export const buildSectionSnapshot = (
  section: SectionConfig,
  sourceData: Record<string, unknown>,
  hasSupportingDocuments: boolean,
  sectionRegisterId?: string,
): { records: unknown[]; files: unknown[] } => {
  const sectionWidgets = collectWidgets(section.panels);

  const records =
    sectionWidgets.length > 0
      ? buildSectionRecords(sectionWidgets, sourceData, {
          sectionRegisterId,
          editAction: 'always',
          whenEmpty: 'empty-array',
        })
      : buildSectionRecords(sectionWidgets, sourceData, {
          sectionRegisterId,
          whenEmpty: 'raw-snapshot',
        });

  const files = hasSupportingDocuments
    ? collectSectionSupportingFiles(section, sourceData, sectionRegisterId)
    : [];

  return { records, files };
};

/** Form submit / draft: full SectionChanges payload for one section. */
export function buildSectionChanges(
  section: SectionConfig,
  storeValues: Record<string, unknown>,
  options?: { dbSectionId?: string; sectionRegisterId?: string },
): SectionChanges {
  const sectionWidgets = collectWidgets(section.panels);
  const { sectionRegisterId } = options || {};

  const records = buildSectionRecords(sectionWidgets, storeValues, {
    sectionRegisterId,
    editAction: 'when-register-id',
    whenEmpty: 'single-record',
  });

  const files = collectSectionSupportingFiles(section, storeValues, sectionRegisterId);

  return {
    section_id: options?.dbSectionId ?? section['section-id'],
    section_register_id: sectionRegisterId,
    records,
    files: files.length > 0 ? files : undefined,
  };
}

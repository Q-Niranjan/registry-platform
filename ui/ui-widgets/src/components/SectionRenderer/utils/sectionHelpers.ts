import { PanelConfig, SectionConfig, SupportingDocumentConfig } from '../../../types';
import { getValueByPath, setWidgetValue } from '../../../utils/pathUtils';
import { setValues } from '../../../store/widgetSlice';
import { collectWidgets } from '../../../utils/sectionValidate';
import { extractTableRecordsFromSnapshot, isTableLikeWidget } from '../../../utils/extractTableRecordsFromSnapshot';
import { SectionMode } from '../../SectionsContainer';

export const READONLY_VALUE_ROW_ROOT_CLASSES = [
  'TextDisplayWidget',
  'TextAreaDisplayWidget',
  'SelectDisplayWidget',
  'PhoneDisplayWidget',
  'NumberDisplayWidget',
  'CurrencyDisplayWidget',
  'RadioDisplayWidget',
  'DateDisplayWidget',
  'DateTimeDisplayWidget',
  'CheckboxDisplayWidget',
  'BooleanDisplayWidget',
  'FileDisplayWidget',
  'DisplayFieldWidget',
] as const;

export const READONLY_SINGLE_LINE_VALUE_ROW_CLASSES = [
  'TextDisplayWidget',
  'SelectDisplayWidget',
  'PhoneDisplayWidget',
  'NumberDisplayWidget',
  'CurrencyDisplayWidget',
  'RadioDisplayWidget',
  'DateDisplayWidget',
  'DateTimeDisplayWidget',
  'CheckboxDisplayWidget',
  'BooleanDisplayWidget',
  'DisplayFieldWidget',
] as const;

export function scopedClassSelectors(sectionClassId: string, classNames: readonly string[]): string {
  return classNames.map((c) => `.${sectionClassId} .${c}`).join(',\n        ');
}

export function countVerticalPanels(panels: SectionConfig['panels']): number {
  let count = 0;
  for (const panel of panels) {
    const orientation = panel['panel-orientation'] || 'vertical';

    if (orientation === 'horizontal' && panel.panels) {
      count += countVerticalPanels(panel.panels);
    } else if (orientation === 'vertical') {
      const columnSpan = panel['panel-column-span'] || 1;
      count += columnSpan;
      if (panel.panels && panel.panels.length > 0) {
        count += countVerticalPanels(panel.panels);
      }
    }
  }
  return count;
}

export function checkForTableWidget(panels: PanelConfig[]): boolean {
  for (const panel of panels) {
    if (panel.widgets) {
      for (const widget of panel.widgets) {
        if (widget.widget === 'table' || widget['widget-type'] === 'table') {
          return true;
        }
      }
    }
    if (panel.panels && checkForTableWidget(panel.panels)) {
      return true;
    }
  }
  return false;
}

export function getTableWidgetColumnSpan(panels: PanelConfig[]): number | null {
  for (const panel of panels) {
    if (panel.widgets) {
      for (const widget of panel.widgets) {
        if (widget.widget === 'table' || widget['widget-type'] === 'table') {
          return widget['widget-column-span'] || null;
        }
      }
    }
    if (panel.panels) {
      const nestedSpan = getTableWidgetColumnSpan(panel.panels);
      if (nestedSpan !== null) {
        return nestedSpan;
      }
    }
  }
  return null;
}

export function computeColumnSpan(
  section: SectionConfig,
  gridColumnSpan?: number
): { columnSpan: number; hasTableWidget: boolean; hasExplicitTableSpan: boolean } {
  const hasTableWidget = checkForTableWidget(section.panels);
  const tableWidgetColumnSpan = getTableWidgetColumnSpan(section.panels);
  const verticalPanelsCount = countVerticalPanels(section.panels);
  const columnSpan =
    gridColumnSpan ??
    (tableWidgetColumnSpan !== null
      ? tableWidgetColumnSpan
      : hasTableWidget
        ? Math.max(verticalPanelsCount, 2)
        : verticalPanelsCount);

  return {
    columnSpan,
    hasTableWidget,
    hasExplicitTableSpan: tableWidgetColumnSpan !== null,
  };
}

export function makePanelsEditable(
  panels: PanelConfig[],
  editable: boolean,
  sectionEditable: boolean
): PanelConfig[] {
  return panels.map((panel) => ({
    ...panel,
    panels: panel.panels ? makePanelsEditable(panel.panels, editable, sectionEditable) : undefined,
    widgets: panel.widgets?.map((widget) => ({
      ...widget,
      'widget-readonly': editable
        ? sectionEditable
          ? false
          : widget['widget-readonly'] || false
        : true,
    })),
  }));
}

export function trackSectionChages(
  widgets: any[],
  sourceData: any,
  pathPrefix?: string,
  sectionRegisterId?: string
) {
  if (!widgets || widgets.length === 0) return [];

  const snapshot: Record<string, any> = {};
  let hasTable = false;

  const resolvePath = (path: string) => (pathPrefix ? `${pathPrefix}.${path}` : path);

  widgets.forEach((widget) => {
    const widgetPath = widget['widget-data-path'];
    if (!widgetPath) return;

    if (isTableLikeWidget(widget)) {
      hasTable = true;
    }

    if (typeof widgetPath === 'object') {
      Object.values(widgetPath).forEach((path: unknown) => {
        if (typeof path === 'string' && path.length > 0) {
          snapshot[path] = getValueByPath(sourceData, resolvePath(path));
        }
      });
    } else if (typeof widgetPath === 'string') {
      snapshot[widgetPath] = getValueByPath(sourceData, resolvePath(widgetPath));
    }
  });

  if (!hasTable) {
    const cleanedSnapshot: Record<string, any> = {};

    Object.entries(snapshot).forEach(([fullPath, value]) => {
      const fieldPath = fullPath.includes('.') ? fullPath.split('.').slice(1).join('.') : fullPath;
      cleanedSnapshot[fieldPath] = value;
    });

    const sectionData = sectionRegisterId
      ? pathPrefix
        ? getValueByPath(sourceData, resolvePath(sectionRegisterId))
        : sourceData[sectionRegisterId]
      : {};

    return [
      {
        ...sectionData,
        ...cleanedSnapshot,
        edit_action: 'UPDATE',
      },
    ];
  }

  return extractTableRecordsFromSnapshot(snapshot as Record<string, unknown>, widgets);
}

export function buildSectionSnapshot(
  originalSection: SectionConfig,
  sourceData: Record<string, any>,
  hasSupportingDocuments: boolean,
  sectionRegisterId?: string,
  pathPrefix?: string
): { records: unknown[]; files: unknown[] } {
  const sectionWidgets = collectWidgets(originalSection.panels);
  const resolvePath = (path: string) => (pathPrefix ? `${pathPrefix}.${path}` : path);

  let records: unknown[];
  const recordsFromTrack = trackSectionChages(sectionWidgets, sourceData, pathPrefix, sectionRegisterId);

  if (recordsFromTrack.length > 0) {
    records = recordsFromTrack;
  } else {
    const snapshot: Record<string, any> = {};
    sectionWidgets.forEach((widget) => {
      const widgetPath = widget['widget-data-path'];
      if (!widgetPath) return;
      if (typeof widgetPath === 'object') {
        Object.values(widgetPath).forEach((path: unknown) => {
          if (typeof path === 'string' && path.length > 0) {
            snapshot[path] = getValueByPath(sourceData, resolvePath(path));
          }
        });
      } else if (typeof widgetPath === 'string') {
        snapshot[widgetPath] = getValueByPath(sourceData, resolvePath(widgetPath));
      }
    });
    records = [{ ...snapshot }];
  }

  const files: unknown[] = [];
  if (hasSupportingDocuments) {
    const originalSupportingDocuments = originalSection['section-supporting-documents'] || [];
    originalSupportingDocuments.forEach((doc) => {
      const originalDataPath = doc['document-data-path'];
      const storeDataPath =
        pathPrefix && originalDataPath ? `${pathPrefix}.${originalDataPath}` : originalDataPath;
      files.push(getValueByPath(sourceData, storeDataPath));
    });
  }

  return { records, files };
}

function resolveStoreDataPath(
  originalDataPath: string | Record<string, string>,
  namespace?: string
): string | Record<string, string> | undefined {
  if (!namespace || !originalDataPath) {
    return originalDataPath;
  }
  if (typeof originalDataPath === 'string') {
    return `${namespace}.${originalDataPath}`;
  }
  return Object.fromEntries(
    Object.entries(originalDataPath).map(([key, path]) => [key, `${namespace}.${path}`])
  );
}

export function revertSectionToOriginalValues(options: {
  originalSection: SectionConfig;
  schemaData?: Record<string, any>;
  contextSchemaData?: Record<string, any>;
  storeValues: Record<string, any>;
  namespace?: string;
  hasSupportingDocuments: boolean;
  sectionId: string;
}): Record<string, any> {
  const {
    originalSection,
    schemaData,
    contextSchemaData,
    storeValues,
    namespace,
    hasSupportingDocuments,
    sectionId,
  } = options;

  const sectionWidgets = collectWidgets(originalSection.panels);
  const oldSchemaData = schemaData || contextSchemaData || {};
  let newStoreValues = storeValues;

  sectionWidgets.forEach((widget) => {
    const originalWidgetId = widget['widget-id'];
    const namespacedWidgetId = namespace ? `${namespace}__${originalWidgetId}` : originalWidgetId;
    const widgetId = namespacedWidgetId;
    const originalDataPath = widget['widget-data-path'];
    if (!widgetId || !originalDataPath) {
      return;
    }

    const storeDataPath = resolveStoreDataPath(originalDataPath, namespace);

    let oldValue: any;
    if (typeof originalDataPath === 'object') {
      oldValue = {};
      Object.entries(originalDataPath).forEach(([key, path]) => {
        if (typeof path === 'string') {
          oldValue[key] = getValueByPath(oldSchemaData, path);
        }
      });
    } else if (typeof originalDataPath === 'string') {
      oldValue = getValueByPath(oldSchemaData, originalDataPath);
    }

    if (oldValue !== undefined) {
      newStoreValues = setWidgetValue(newStoreValues, storeDataPath, widgetId, oldValue);
      newStoreValues = { ...newStoreValues, [widgetId]: oldValue };
    }
  });

  if (hasSupportingDocuments) {
    const originalSupportingDocuments = originalSection['section-supporting-documents'] || [];
    originalSupportingDocuments.forEach((doc, index) => {
      const widgetId = `supporting-doc-${sectionId}-${index}`;
      const originalDataPath = doc['document-data-path'];
      const storeDataPath =
        namespace && originalDataPath ? `${namespace}.${originalDataPath}` : originalDataPath;
      const oldValue = getValueByPath(oldSchemaData, originalDataPath);
      newStoreValues = setWidgetValue(newStoreValues, storeDataPath, widgetId, oldValue);
    });
  }

  return newStoreValues;
}

export function applySectionRevertToStore(options: {
  originalSection: SectionConfig;
  schemaData?: Record<string, any>;
  contextSchemaData?: Record<string, any>;
  storeValues: Record<string, any>;
  namespace?: string;
  hasSupportingDocuments: boolean;
  sectionId: string;
  dispatch: (action: ReturnType<typeof setValues>) => void;
}): void {
  const { dispatch, storeValues, ...revertOptions } = options;
  const newStoreValues = revertSectionToOriginalValues({ ...revertOptions, storeValues });

  if (newStoreValues !== storeValues) {
    dispatch(setValues(newStoreValues));
  }
}

export function createDocumentWidgetConfig(
  doc: SupportingDocumentConfig,
  sectionId: string,
  index: number,
  mode: SectionMode,
  isDraft?: boolean
) {
  const documentType = doc['document-type'] || 'file';
  const accept =
    doc['document-accept'] ||
    (documentType === 'image' ? 'image/*' : documentType === 'pdf' ? '.pdf' : '*/*');

  const widgetId = `supporting-doc-${sectionId}-${index}`;

  return {
    widget: 'file',
    'widget-type': 'input' as const,
    'widget-label': doc['document-label'] || doc['document-data-path'] || `Document ${index + 1}`,
    'widget-id': widgetId,
    'widget-data-path': doc['document-data-path'],
    'widget-required': doc['document-required'] || false,
    'widget-readonly': mode === 'IntakeForm' && isDraft === false,
    'widget-data-options': {
      accept,
      multiple: false,
      maxSize: doc['document-max-size'],
    },
  };
}

export function getCrViewData(
  mode: SectionMode,
  currentSchemaData: Record<string, any>,
  storeValues: Record<string, any>
) {
  if (mode !== 'CRView') return null;
  const dataSource = { ...storeValues, ...currentSchemaData };
  const recordPath = Object.keys(dataSource)[0];

  return {
    createdBy: getValueByPath(dataSource, `${recordPath}.created_by`),
    createdDate: getValueByPath(dataSource, `${recordPath}.created_at`),
    approvedBy: getValueByPath(dataSource, `${recordPath}.last_approved_by`),
    approvedDate: getValueByPath(dataSource, `${recordPath}.last_approved_at`),
  };
}

export function collectSectionFiles(
  originalSection: SectionConfig,
  currentSchemaData: Record<string, any>,
  namespace?: string
): unknown[] {
  const sectionFiles: unknown[] = [];
  const originalSupportingDocuments = originalSection['section-supporting-documents'] || [];
  originalSupportingDocuments.forEach((doc) => {
    const originalDataPath = doc['document-data-path'];
    const storeDataPath =
      namespace && originalDataPath ? `${namespace}.${originalDataPath}` : originalDataPath;
    sectionFiles.push(getValueByPath(currentSchemaData, storeDataPath));
  });
  return sectionFiles;
}

export function extractProfileImageFromRecords(
  records: unknown[]
): { records: unknown[]; profileImage: File | null } {
  let profileImage: File | null = null;
  const updatedRecords = records.map((record) => {
    if (typeof record !== 'object' || record === null) {
      return record;
    }
    const copy = { ...(record as Record<string, unknown>) };
    for (const [key, value] of Object.entries(copy)) {
      if (value instanceof File) {
        profileImage = value;
        copy[key] = '';
      }
    }
    return copy;
  });
  return { records: updatedRecords, profileImage };
}

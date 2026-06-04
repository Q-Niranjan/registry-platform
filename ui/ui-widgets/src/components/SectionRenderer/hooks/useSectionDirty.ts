import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { SectionConfig } from '../../../types';
import { SectionMode } from '../../SectionsContainer';
import { getValueByPath } from '../../../utils/pathUtils';
import { buildSectionSnapshot } from '../utils/sectionHelpers';

export function useSectionDirty(options: {
  mode: SectionMode;
  isDraft?: boolean;
  isEditMode: boolean;
  originalSection: SectionConfig;
  hasSupportingDocuments: boolean;
  sectionRegisterId?: string;
  namespace?: string;
  sectionId: string;
  storeValues: Record<string, any>;
  schemaData?: Record<string, any>;
  contextSchemaData?: Record<string, any>;
  onSectionDirtyChange?: (sectionId: string, isDirty: boolean) => void;
}) {
  const {
    mode,
    isDraft,
    isEditMode,
    originalSection,
    hasSupportingDocuments,
    sectionRegisterId,
    namespace,
    sectionId,
    storeValues,
    schemaData,
    contextSchemaData,
    onSectionDirtyChange,
  } = options;

  const baselineSnapshotRef = useRef<{ records: unknown[]; files: unknown[] } | null>(null);
  const [intakeFormBaselineTrigger, setIntakeFormBaselineTrigger] = useState(0);

  const effectiveEditModeForDirty = mode === 'IntakeForm' ? isDraft !== false : isEditMode;

  const buildSnapshot = useCallback(
    (sourceData: Record<string, any>, pathPrefix?: string) =>
      buildSectionSnapshot(
        originalSection,
        sourceData,
        hasSupportingDocuments,
        sectionRegisterId,
        pathPrefix
      ),
    [originalSection, hasSupportingDocuments, sectionRegisterId]
  );

  const isDirty = useMemo(() => {
    if (!effectiveEditModeForDirty) return false;
    const baseline = baselineSnapshotRef.current;
    if (!baseline) return false;

    const currentSnapshot = buildSnapshot(storeValues, namespace);
    return JSON.stringify(baseline) !== JSON.stringify(currentSnapshot);
  }, [
    effectiveEditModeForDirty,
    storeValues,
    namespace,
    buildSnapshot,
    intakeFormBaselineTrigger,
  ]);

  useEffect(() => {
    if (effectiveEditModeForDirty) {
      const oldSchemaData = schemaData || contextSchemaData || {};
      if (namespace) {
        const namespacedSchema = getValueByPath(oldSchemaData, namespace);
        baselineSnapshotRef.current = namespacedSchema
          ? buildSnapshot(namespacedSchema as Record<string, any>)
          : buildSnapshot(oldSchemaData);
      } else {
        baselineSnapshotRef.current = buildSnapshot(oldSchemaData);
      }
    } else {
      baselineSnapshotRef.current = null;
      onSectionDirtyChange?.(sectionId, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveEditModeForDirty]);

  useEffect(() => {
    if (effectiveEditModeForDirty && onSectionDirtyChange) {
      onSectionDirtyChange(sectionId, isDirty);
    }
  }, [effectiveEditModeForDirty, isDirty, sectionId, onSectionDirtyChange]);

  const updateBaselineAfterSave = useCallback(
    (currentSchemaData: Record<string, any>) => {
      baselineSnapshotRef.current = buildSnapshot(currentSchemaData, namespace);
      setIntakeFormBaselineTrigger((prev) => prev + 1);
    },
    [buildSnapshot, namespace]
  );

  return {
    isDirty,
    effectiveEditModeForDirty,
    baselineSnapshotRef,
    updateBaselineAfterSave,
  };
}

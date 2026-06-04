import { useState, useCallback, useMemo } from 'react';
import { useStore } from 'react-redux';
import { SectionConfig } from '../../../types';
import { SectionMode } from '../../SectionsContainer';
import { sectionValidate, collectWidgets } from '../../../utils/sectionValidate';
import { SectionChanges } from '../types';
import {
  trackSectionChages,
  collectSectionFiles,
  extractProfileImageFromRecords,
} from '../utils/sectionHelpers';

export function useIntakeForm(options: {
  mode: SectionMode;
  sectionIndex?: number;
  expandedSectionIndex?: number | null;
  isAccessible?: boolean;
  isDraft?: boolean;
  onExpandSection?: (index: number) => void;
  onSectionSaveSuccess?: (index: number) => void;
  onPreviousSection?: (index: number) => void;
  onSectionSave?: (changes: SectionChanges) => Promise<void> | void;
  onSectionDirtyChange?: (sectionId: string, isDirty: boolean) => void;
  originalSection: SectionConfig;
  schemaData?: Record<string, any>;
  contextSchemaData?: Record<string, any>;
  namespace?: string;
  hasSupportingDocuments: boolean;
  dbSectionId?: string;
  sectionRegisterId?: string;
  sectionId: string;
  isDirty: boolean;
  updateBaselineAfterSave: (currentSchemaData: Record<string, any>) => void;
  dispatch: ReturnType<typeof import('react-redux').useDispatch>;
}) {
  const {
    mode,
    sectionIndex,
    expandedSectionIndex,
    isAccessible = false,
    isDraft,
    onExpandSection,
    onSectionSaveSuccess,
    onPreviousSection,
    onSectionSave,
    onSectionDirtyChange,
    originalSection,
    schemaData,
    contextSchemaData,
    namespace,
    hasSupportingDocuments,
    dbSectionId,
    sectionRegisterId,
    sectionId,
    isDirty,
    updateBaselineAfterSave,
    dispatch,
  } = options;

  const store = useStore();

  const [standaloneExpanded, setStandaloneExpanded] = useState(true);
  const [hasBeenSavedByUser, setHasBeenSavedByUser] = useState(false);

  const isExpandedFromContainer =
    typeof sectionIndex === 'number' && expandedSectionIndex === sectionIndex;
  const isExpandedStandalone = sectionIndex === undefined && standaloneExpanded;
  const isExpanded = mode === 'IntakeForm' && (isExpandedFromContainer || isExpandedStandalone);

  const handleAccordionToggle = useCallback(() => {
    if (mode !== 'IntakeForm') return;
    if (sectionIndex === undefined) {
      setStandaloneExpanded((prev) => !prev);
    } else if (isAccessible && onExpandSection) {
      onExpandSection(sectionIndex);
    }
  }, [mode, sectionIndex, isAccessible, onExpandSection]);

  const intakeFormSectionStatus = useMemo<'saved' | 'modified' | null>(() => {
    if (mode !== 'IntakeForm' || isDraft === false) return null;
    if (isDirty) return 'modified';
    if (hasBeenSavedByUser) return 'saved';
    return null;
  }, [mode, isDirty, hasBeenSavedByUser, isDraft]);

  const handleIntakeFormSave = useCallback(async () => {
    if (sectionIndex === undefined) return;

    if (isDraft !== false && store && onSectionSave) {
      const sectionWidgets = collectWidgets(originalSection.panels);
      const currentState = (store.getState() as any).widget;
      const currentSchemaData = currentState.values || {};

      const isSectionValid = sectionValidate(
        originalSection,
        currentSchemaData,
        dispatch,
        true
      );
      if (!isSectionValid) return;

      const oldSchemaData = schemaData || contextSchemaData;
      const newSchemaData = trackSectionChages(
        sectionWidgets,
        currentSchemaData,
        namespace,
        sectionRegisterId
      );

      const sectionFiles = hasSupportingDocuments
        ? collectSectionFiles(originalSection, currentSchemaData, namespace)
        : [];

      if (JSON.stringify(oldSchemaData) !== JSON.stringify(newSchemaData)) {
        const { records, profileImage } = extractProfileImageFromRecords(newSchemaData);

        try {
          await onSectionSave({
            section_id: dbSectionId ?? originalSection['section-id'],
            section_register_id: sectionRegisterId,
            records: [...records],
            files: [...sectionFiles],
            ...(profileImage ? { image: profileImage } : {}),
          });
        } catch (error) {
          console.error('Section Changes Save failed', error);
          return;
        }
      }

      if (mode === 'IntakeForm') {
        updateBaselineAfterSave(currentSchemaData);
        setHasBeenSavedByUser(true);
      }
      onSectionDirtyChange?.(sectionId, false);
    } else if (mode === 'IntakeForm') {
      setHasBeenSavedByUser(true);
    }

    onSectionSaveSuccess?.(sectionIndex);
  }, [
    store,
    onSectionSave,
    onSectionSaveSuccess,
    sectionIndex,
    originalSection,
    schemaData,
    contextSchemaData,
    namespace,
    hasSupportingDocuments,
    dbSectionId,
    sectionRegisterId,
    dispatch,
    updateBaselineAfterSave,
    sectionId,
    onSectionDirtyChange,
    mode,
    isDraft,
  ]);

  return {
    isExpanded,
    handleAccordionToggle,
    intakeFormSectionStatus,
    handleIntakeFormSave,
    onPreviousSection,
    sectionIndex,
  };
}

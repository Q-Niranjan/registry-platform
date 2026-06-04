import { useCallback } from 'react';
import { useStore, useDispatch } from 'react-redux';
import { SectionConfig } from '../../../types';
import { SectionMode } from '../../SectionsContainer';
import { sectionValidate, collectWidgets } from '../../../utils/sectionValidate';
import { SectionChanges } from '../types';
import {
  trackSectionChages,
  collectSectionFiles,
  extractProfileImageFromRecords,
} from '../utils/sectionHelpers';

export function useSectionSave(options: {
  mode: SectionMode;
  originalSection: SectionConfig;
  schemaData?: Record<string, any>;
  contextSchemaData?: Record<string, any>;
  namespace?: string;
  hasSupportingDocuments: boolean;
  sectionRegisterId?: string;
  dbSectionId?: string;
  onSectionSave?: (changes: SectionChanges) => Promise<void> | void;
  exitEditMode: () => void;
  revertToOriginalValues: () => void;
}) {
  const {
    mode,
    originalSection,
    schemaData,
    contextSchemaData,
    namespace,
    hasSupportingDocuments,
    sectionRegisterId,
    dbSectionId,
    onSectionSave,
    exitEditMode,
    revertToOriginalValues,
  } = options;

  const store = useStore();
  const dispatch = useDispatch();

  const handleSave = useCallback(async () => {
    if (!store || !onSectionSave) {
      console.warn('Missing store or onSectionSave in SectionRenderer');
      exitEditMode();
      return;
    }

    const sectionWidgets = collectWidgets(originalSection.panels);
    const currentState = (store.getState() as any).widget;
    const currentSchemaDataFromStore = currentState.values || {};

    const isSectionValid = sectionValidate(
      originalSection,
      currentSchemaDataFromStore,
      dispatch,
      true
    );
    if (!isSectionValid) {
      return;
    }

    const oldSchemaData = schemaData || contextSchemaData;
    const newSchemaData = trackSectionChages(
      sectionWidgets,
      currentSchemaDataFromStore,
      namespace,
      sectionRegisterId
    );

    const sectionFiles = hasSupportingDocuments
      ? collectSectionFiles(originalSection, currentSchemaDataFromStore, namespace)
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
      }
    }

    if (mode === 'RegistryView') {
      revertToOriginalValues();
    }

    exitEditMode();
  }, [
    store,
    onSectionSave,
    originalSection,
    schemaData,
    contextSchemaData,
    namespace,
    sectionRegisterId,
    hasSupportingDocuments,
    dbSectionId,
    dispatch,
    mode,
    revertToOriginalValues,
    exitEditMode,
  ]);

  return { handleSave };
}

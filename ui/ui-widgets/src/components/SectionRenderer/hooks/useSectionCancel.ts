import { useCallback } from 'react';
import { useStore, useDispatch } from 'react-redux';
import { SectionConfig } from '../../../types';
import { applySectionRevertToStore } from '../utils/sectionHelpers';

export function useSectionCancel(options: {
  originalSection: SectionConfig;
  schemaData?: Record<string, any>;
  contextSchemaData?: Record<string, any>;
  namespace?: string;
  hasSupportingDocuments: boolean;
  sectionId: string;
  exitEditMode: () => void;
}) {
  const {
    originalSection,
    schemaData,
    contextSchemaData,
    namespace,
    hasSupportingDocuments,
    sectionId,
    exitEditMode,
  } = options;

  const store = useStore();
  const dispatch = useDispatch();

  const revertToOriginalValues = useCallback(() => {
    const currentStoreValues = (store.getState() as any).widget.values;
    applySectionRevertToStore({
      originalSection,
      schemaData,
      contextSchemaData,
      storeValues: currentStoreValues,
      namespace,
      hasSupportingDocuments,
      sectionId,
      dispatch,
    });
  }, [
    originalSection,
    schemaData,
    contextSchemaData,
    store,
    namespace,
    hasSupportingDocuments,
    sectionId,
    dispatch,
  ]);

  const handleCancel = useCallback(() => {
    revertToOriginalValues();
    exitEditMode();
  }, [revertToOriginalValues, exitEditMode]);

  return { handleCancel, revertToOriginalValues };
}

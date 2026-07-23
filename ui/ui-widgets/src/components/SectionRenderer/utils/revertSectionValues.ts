import { Dispatch } from '@reduxjs/toolkit';
import { SectionConfig } from '../../../types';
import { getValueByPath, setWidgetValue } from '../../../utils/pathUtils';
import { collectWidgets } from '../../../utils/sectionValidate';
import { applySectionEditSnapshot, SectionEditSnapshot } from '../../../utils/sectionRevert';
import { setValues } from '../../../store/widgetSlice';
import { WidgetRootState } from '../../../store';
import { buildScopeResolver } from '../../../context/SectionScopeContext';

export const revertSectionValues = ({
  section,
  store,
  dispatch,
  schemaData,
  contextSchemaData,
  hasSupportingDocuments,
  sectionId,
  sectionRegisterId,
  editEntrySnapshot,
}: {
  section: SectionConfig;
  store: { getState: () => unknown };
  dispatch: Dispatch;
  schemaData?: Record<string, unknown>;
  contextSchemaData?: Record<string, unknown>;
  hasSupportingDocuments: boolean;
  sectionId: string;
  sectionRegisterId?: string;
  editEntrySnapshot: SectionEditSnapshot | null;
}) => {
  const sectionWidgets = collectWidgets(section.panels);
  const currentStoreValues = (store.getState() as WidgetRootState).widget.values;
  let newStoreValues = currentStoreValues;

  const toStorePath = buildScopeResolver(sectionRegisterId);

  if (editEntrySnapshot) {
    newStoreValues = applySectionEditSnapshot(currentStoreValues, editEntrySnapshot);
  } else {
    const oldSchemaData = schemaData || contextSchemaData;

    sectionWidgets.forEach((widget) => {
      const widgetId = widget['widget-id'];
      const originalDataPath = widget['widget-data-path'];

      if (widgetId && originalDataPath) {
        let oldValue: unknown;
        // Resolve paths to absolute store paths before reading from oldSchemaData
        if (typeof originalDataPath === 'object') {
          const resolvedObjectPath: Record<string, string> = {};
          oldValue = {};
          Object.entries(originalDataPath).forEach(([key, path]) => {
            if (typeof path === 'string') {
              const storePath = toStorePath ? toStorePath(path) : path;
              resolvedObjectPath[key] = storePath;
              (oldValue as Record<string, unknown>)[key] = getValueByPath(
                oldSchemaData,
                storePath,
              );
            }
          });
          newStoreValues = setWidgetValue(
            newStoreValues,
            toStorePath
              ? Object.fromEntries(
                  Object.entries(originalDataPath as Record<string, string>).map(([k, v]) => [
                    k,
                    toStorePath(v),
                  ])
                )
              : originalDataPath,
            widgetId,
            oldValue,
          );
          newStoreValues = { ...newStoreValues, [widgetId]: oldValue };
        } else if (typeof originalDataPath === 'string') {
          const storePath = toStorePath ? toStorePath(originalDataPath) : originalDataPath;
          oldValue = getValueByPath(oldSchemaData, storePath);

          if (oldValue !== undefined) {
            newStoreValues = setWidgetValue(
              newStoreValues,
              storePath,
              widgetId,
              oldValue,
            );
            newStoreValues = { ...newStoreValues, [widgetId]: oldValue };
          }
        }
      }
    });

    if (hasSupportingDocuments) {
      const supportingDocuments = section['section-supporting-documents'] || [];
      supportingDocuments.forEach((doc, index) => {
        const widgetId = `supporting-doc-${sectionId}-${index}`;
        const originalDataPath = doc['document-data-path'];
        const storePath = toStorePath ? toStorePath(originalDataPath) : originalDataPath;
        const oldValue = getValueByPath(oldSchemaData, storePath);
        newStoreValues = setWidgetValue(
          newStoreValues,
          storePath,
          widgetId,
          oldValue,
        );
      });
    }
  }

  dispatch(setValues(newStoreValues));
};

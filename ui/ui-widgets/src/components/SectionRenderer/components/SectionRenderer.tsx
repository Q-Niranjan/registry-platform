import { useState, useMemo, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setValues } from '../../../store/widgetSlice';
import { WidgetRootState } from '../../../store';
import { PanelRenderer } from '../../PanelRenderer';
import { useWidgetTranslation } from '../../../hooks/useWidgetTranslation';
import { useWidgetTheme } from '../../../hooks/useWidgetTheme';
import { themeToCSSVariables } from '../../../theme';
import { useWidgetContext } from '../../WidgetProvider';
import { namespaceSectionConfig } from '../../../utils/schemaNamespace';
import { rightArrowIcon } from '../../../assets';

import { SectionRendererProps, SectionChanges } from '../types';
import { useSectionEdit } from '../hooks/useSectionEdit';
import { useSectionDirty } from '../hooks/useSectionDirty';
import { useSectionSave } from '../hooks/useSectionSave';
import { useSectionCancel } from '../hooks/useSectionCancel';
import { useIntakeForm } from '../hooks/useIntakeForm';
import { SectionEditPortal } from './SectionEditPortal';
import { IntakeFormAccordionHeader } from './IntakeFormAccordionHeader';
import { IntakeFormAccordionContent } from './IntakeFormAccordionContent';
import { CRViewFooter } from './CRViewFooter';
import {
  computeColumnSpan,
  makePanelsEditable,
  getCrViewData,
} from '../utils/sectionHelpers';
import { buildSectionDynamicStyles } from '../styles/sectionDynamicStyles';

export const SectionRenderer = ({
  section,
  dataSourceRequestHandler: propDataSourceRequestHandler,
  schemaData,
  onValueChange,
  gridColumnSpan,
  onSectionSave,
  hideEditButton = false,
  mode = 'RegistryView',
  namespace,
  changeRequestType,
  showChangeRequestLabel = true,
  dbSectionId,
  sectionRegisterId,
  onSectionDirtyChange,
  sectionIndex,
  expandedSectionIndex,
  onExpandSection,
  onSectionSaveSuccess,
  onPreviousSection,
  isDraft,
  isAccessible = false,
  onEditModeChange,
  forceExitEdit,
}: SectionRendererProps) => {
  const { translateConfig, translate } = useWidgetTranslation();
  const resolvedTheme = useWidgetTheme();
  const portalCSSVariables = useMemo(() => themeToCSSVariables(resolvedTheme), [resolvedTheme]);
  const { schemaData: contextSchemaData, dataSourceRequestHandler: contextDataSourceRequestHandler } =
    useWidgetContext();
  const dispatch = useDispatch();
  const storeValues = useSelector((state: WidgetRootState) => state.widget?.values || {});

  const dataSourceRequestHandler = propDataSourceRequestHandler || contextDataSourceRequestHandler;
  const currentSchemaData = schemaData || contextSchemaData || {};

  const namespacedSection = useMemo(() => {
    if (namespace) {
      return namespaceSectionConfig(section, namespace);
    }
    return section;
  }, [section, namespace]);

  const namespacedSchemaData = useMemo(() => {
    if (!namespace || !currentSchemaData) {
      return schemaData;
    }
    return { ...currentSchemaData, [namespace]: currentSchemaData };
  }, [namespace, schemaData, currentSchemaData]);

  useEffect(() => {
    if (namespace && namespacedSchemaData) {
      dispatch(setValues(namespacedSchemaData));
    }
  }, [namespace, namespacedSchemaData, dispatch]);

  const crViewData = useMemo(
    () => getCrViewData(mode, currentSchemaData, storeValues),
    [mode, currentSchemaData, storeValues]
  );

  const originalSectionId = section['section-id'];
  const sectionToRender = namespacedSection;
  const sectionId = sectionToRender['section-id'];
  const gridId = `section-panels-${sectionId}`;
  const sectionClassId = `section-${sectionId}`;

  const { columnSpan, hasTableWidget, hasExplicitTableSpan } = useMemo(
    () => computeColumnSpan(sectionToRender, gridColumnSpan),
    [sectionToRender, gridColumnSpan]
  );

  const supportingDocuments = sectionToRender['section-supporting-documents'] || [];
  const hasSupportingDocuments = supportingDocuments.length > 0;
  const originalSection = section;

  const sectionRef = useRef<HTMLDivElement>(null);
  const [isDocumentsExpanded, setIsDocumentsExpanded] = useState(true);

  const { isEditMode, sectionHeight, editSectionPosition, handleEdit, exitEditMode } =
    useSectionEdit({
      forceExitEdit,
      originalSectionId,
      onEditModeChange,
      sectionRef,
    });

  const { isDirty, updateBaselineAfterSave } = useSectionDirty({
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
  });

  const widgetsEditable = mode === 'IntakeForm' ? isDraft !== false : isEditMode;
  const editableSection = useMemo(
    () => ({
      ...sectionToRender,
      panels: makePanelsEditable(
        sectionToRender.panels,
        widgetsEditable,
        sectionToRender['section-editable'] === true
      ),
    }),
    [sectionToRender, widgetsEditable]
  );

  const { handleCancel, revertToOriginalValues } = useSectionCancel({
    originalSection,
    schemaData,
    contextSchemaData,
    namespace,
    hasSupportingDocuments,
    sectionId,
    exitEditMode,
  });

  const { handleSave } = useSectionSave({
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
  });

  const {
    isExpanded,
    handleAccordionToggle,
    intakeFormSectionStatus,
    handleIntakeFormSave,
  } = useIntakeForm({
    mode,
    sectionIndex,
    expandedSectionIndex,
    isAccessible,
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
  });

  const dynamicStyles = useMemo(
    () =>
      buildSectionDynamicStyles({
        sectionClassId,
        gridId,
        columnSpan,
        hasTableWidget,
        hasExplicitTableSpan,
      }),
    [sectionClassId, gridId, columnSpan, hasTableWidget, hasExplicitTableSpan]
  );

  return (
    <>
      <SectionEditPortal
        isVisible={mode !== 'IntakeForm' && isEditMode}
        editSectionPosition={editSectionPosition}
        sectionClassId={sectionClassId}
        sectionId={sectionId}
        gridId={gridId}
        sectionTitle={sectionToRender['section-title']}
        translateConfig={translateConfig}
        translate={translate}
        portalCSSVariables={portalCSSVariables}
        editablePanels={editableSection.panels}
        dataSourceRequestHandler={dataSourceRequestHandler}
        namespacedSchemaData={namespacedSchemaData}
        onValueChange={onValueChange}
        hasSupportingDocuments={hasSupportingDocuments}
        supportingDocuments={supportingDocuments}
        mode={mode}
        isDraft={isDraft}
        isDocumentsExpanded={isDocumentsExpanded}
        onToggleDocumentsExpanded={() => setIsDocumentsExpanded(!isDocumentsExpanded)}
        onCancel={handleCancel}
        onSave={handleSave}
        isDirty={isDirty}
      />

      <style>{dynamicStyles}</style>

      <div
        ref={sectionRef}
        className={`section ${sectionClassId} px-4 sm:px-6 lg:px-8 border-2 ${mode === 'IntakeForm' ? 'intake-form-accordion-item' : ''}`}
        data-section-id={sectionId}
        data-has-table={hasTableWidget ? 'true' : 'false'}
        data-has-explicit-span={hasExplicitTableSpan ? 'true' : 'false'}
        data-edit-mode={isEditMode ? 'true' : 'false'}
        data-section-dirty={isEditMode && isDirty ? 'true' : 'false'}
        data-column-span={columnSpan}
        data-change-request-type={changeRequestType}
        data-intake-form-expanded={mode === 'IntakeForm' ? (isExpanded ? 'true' : 'false') : undefined}
        style={{
          gridColumn: `span ${columnSpan}`,
          width: '100%',
          borderRadius: 'var(--owt-section-border-radius, 10px)',
          borderColor: 'var(--owt-color-bg, #FFFFFF)',
          ...(mode === 'IntakeForm' && isExpanded
            ? {
                backgroundColor: 'var(--owt-color-primary-light, #FBE6AA)',
                border: '1px dashed var(--owt-color-primary-dark, #F07B1A)',
              }
            : {
                backgroundColor:
                  changeRequestType === 'old'
                    ? 'var(--owt-color-bg-alt, #F6F6F6)'
                    : 'var(--owt-section-bg, #FFFFFF)',
                opacity: changeRequestType === 'old' ? 0.95 : 1,
              }),
          ...(isEditMode && sectionHeight
            ? {
                height: `${sectionHeight}px`,
                minHeight: `${sectionHeight}px`,
              }
            : {
                minHeight: 'auto',
                height: 'auto',
              }),
        }}
      >
        {mode === 'IntakeForm' ? (
          <>
            <IntakeFormAccordionHeader
              sectionId={sectionId}
              sectionTitle={sectionToRender['section-title']}
              sectionIndex={sectionIndex}
              isAccessible={isAccessible}
              isExpanded={isExpanded}
              intakeFormSectionStatus={intakeFormSectionStatus}
              translateConfig={translateConfig}
              translate={translate}
              onToggle={handleAccordionToggle}
            />
            {isExpanded && (
              <IntakeFormAccordionContent
                sectionId={sectionId}
                gridId={gridId}
                panels={editableSection.panels}
                mode={mode}
                isDraft={isDraft}
                hasSupportingDocuments={hasSupportingDocuments}
                supportingDocuments={supportingDocuments}
                dataSourceRequestHandler={dataSourceRequestHandler}
                namespacedSchemaData={namespacedSchemaData}
                onValueChange={onValueChange}
                sectionIndex={sectionIndex}
                onPreviousSection={onPreviousSection}
                onNext={handleIntakeFormSave}
                translate={translate}
              />
            )}
          </>
        ) : (
          <>
            {sectionToRender['section-title'] && (
              <div
                style={{
                  marginTop: '35px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <h2 className="text-xl font-semibold" style={{ margin: 0 }}>
                  {translateConfig(sectionToRender['section-title'])}
                </h2>
                {mode === 'CRView' && changeRequestType && showChangeRequestLabel && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      backgroundColor:
                        changeRequestType === 'new'
                          ? 'var(--owt-color-success, #16A34A)'
                          : 'var(--owt-color-error-light, #FEE2E2)',
                      color:
                        changeRequestType === 'new'
                          ? 'var(--owt-color-bg, #FFFFFF)'
                          : 'var(--owt-color-error, #B91C1C)',
                      whiteSpace: 'nowrap',
                      boxShadow:
                        changeRequestType === 'new' ? '0 2px 4px rgba(40, 167, 69, 0.3)' : 'none',
                    }}
                  >
                    {changeRequestType === 'new' ? 'New' : 'Old'}
                  </span>
                )}
              </div>
            )}
            <div
              id={gridId}
              className="section-panels"
              style={mode === 'RegistryView' && hideEditButton ? { paddingBottom: '30px' } : {}}
            >
              {editableSection.panels.map((panel, index) => (
                <div
                  key={panel['panel-id'] || `section-panel-${index}`}
                  className="panel-wrapper"
                >
                  <PanelRenderer
                    panel={panel}
                    dataSourceRequestHandler={dataSourceRequestHandler}
                    schemaData={namespacedSchemaData}
                    onValueChange={onValueChange}
                  />
                </div>
              ))}
              {mode === 'CRView' && crViewData && <CRViewFooter crViewData={crViewData} />}
              {mode === 'RegistryView' && !hideEditButton && (
                <hr
                  className="w-full"
                  style={{
                    height: '1px',
                    marginTop: !isEditMode ? '10px' : 0,
                    marginBottom: '14px',
                    border: 'none',
                    backgroundColor: 'var(--owt-color-border, #C4C4C4)',
                  }}
                />
              )}
              {mode === 'RegistryView' && !isEditMode && !hideEditButton && (
                <div className="flex justify-center items-center" style={{ marginBottom: '20px' }}>
                  <button
                    onClick={handleEdit}
                    className="font-normal inline-flex items-center gap-2 bg-transparent border-0 p-0 cursor-pointer hover:opacity-80"
                    style={{
                      fontFamily: 'Roboto, sans-serif',
                      fontSize: '16px',
                      color: 'var(--owt-color-text-muted, #727474)',
                    }}
                  >
                    {translate('common.editDetails') || 'Edit Details'}
                    <img
                      src={rightArrowIcon}
                      alt="right-arrow"
                      className="w-3.5 h-3.5 brightness-0 opacity-50"
                    />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export type { SectionChanges, SectionRendererProps } from '../types';

import { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { SectionConfig, SupportingDocumentConfig } from '../../../types';
import { UseBaseWidgetOptions } from '../../../hooks/useBaseWidget';
import { PanelRenderer } from '../../PanelRenderer';
import { SupportingDocuments } from './SupportingDocuments';
import { EditControls } from './EditControls';
import { buildEditPortalGridStyles } from '../styles/sectionDynamicStyles';

interface SectionEditPortalProps {
  isVisible: boolean;
  editSectionPosition: { top: number; left: number; width: number } | null;
  sectionClassId: string;
  sectionId: string;
  gridId: string;
  sectionTitle?: SectionConfig['section-title'];
  translateConfig: (title: SectionConfig['section-title']) => string;
  translate: (key: string) => string;
  portalCSSVariables: CSSProperties;
  editablePanels: SectionConfig['panels'];
  dataSourceRequestHandler?: UseBaseWidgetOptions['dataSourceRequestHandler'];
  namespacedSchemaData?: UseBaseWidgetOptions['schemaData'];
  onValueChange?: UseBaseWidgetOptions['onValueChange'];
  hasSupportingDocuments: boolean;
  supportingDocuments: SupportingDocumentConfig[];
  mode: 'RegistryView' | 'CRView' | 'IntakeForm';
  isDraft?: boolean;
  isDocumentsExpanded: boolean;
  onToggleDocumentsExpanded: () => void;
  onCancel: () => void;
  onSave: () => void;
  isDirty: boolean;
}

export function SectionEditPortal({
  isVisible,
  editSectionPosition,
  sectionClassId,
  sectionId,
  gridId,
  sectionTitle,
  translateConfig,
  translate,
  portalCSSVariables,
  editablePanels,
  dataSourceRequestHandler,
  namespacedSchemaData,
  onValueChange,
  hasSupportingDocuments,
  supportingDocuments,
  mode,
  isDraft,
  isDocumentsExpanded,
  onToggleDocumentsExpanded,
  onCancel,
  onSave,
  isDirty,
}: SectionEditPortalProps) {
  if (!isVisible || !editSectionPosition) {
    return null;
  }

  const editGridId = `${gridId}-edit`;

  return createPortal(
    <>
      <style>{buildEditPortalGridStyles(editGridId)}</style>
      <div
        className={`section ${sectionClassId} ${sectionClassId}-edit px-4 sm:px-6 lg:px-8`}
        data-section-id={`${sectionId}-edit`}
        style={{
          ...portalCSSVariables,
          position: 'absolute',
          top: `${editSectionPosition.top}px`,
          left: `${editSectionPosition.left}px`,
          width: `${editSectionPosition.width}px`,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {sectionTitle && (
          <h2
            className="text-xl font-semibold mb-4"
            style={{ fontFamily: 'Roboto, sans-serif', marginTop: '35px' }}
          >
            {translateConfig(sectionTitle)}
          </h2>
        )}
        <div id={editGridId} className="section-panels">
          {editablePanels.map((panel, index) => {
            const isLastPanel = index === editablePanels.length - 1;
            return (
              <div
                key={panel['panel-id'] || `section-panel-${index}`}
                className={`panel-wrapper ${isLastPanel ? 'last-panel-wrapper' : ''}`}
              >
                <PanelRenderer
                  panel={panel}
                  dataSourceRequestHandler={dataSourceRequestHandler}
                  schemaData={namespacedSchemaData}
                  onValueChange={onValueChange}
                  isEditMode={true}
                />
              </div>
            );
          })}
          <hr
            className="w-full"
            style={{
              height: '1px',
              backgroundColor: 'var(--owt-section-divider-color, #F5BB1A)',
              border: 'none',
              margin: '25px 0 0 0',
            }}
          />
          {hasSupportingDocuments && (
            <SupportingDocuments
              sectionId={sectionId}
              supportingDocuments={supportingDocuments}
              mode={mode}
              isDraft={isDraft}
              translate={translate}
              collapsible
              isExpanded={isDocumentsExpanded}
              onToggleExpanded={onToggleDocumentsExpanded}
            />
          )}
          <hr
            className="w-full"
            style={{
              height: '1px',
              backgroundColor: 'var(--owt-section-divider-color, #F5BB1A)',
              border: 'none',
              marginTop: hasSupportingDocuments ? '20px' : 0,
              marginBottom: '20px',
            }}
          />
          <EditControls
            onCancel={onCancel}
            onSave={onSave}
            isDirty={isDirty}
            translate={translate}
          />
        </div>
      </div>
    </>,
    document.body
  );
}

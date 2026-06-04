import { SectionConfig, SupportingDocumentConfig } from '../../../types';
import { UseBaseWidgetOptions } from '../../../hooks/useBaseWidget';
import { PanelRenderer } from '../../PanelRenderer';
import { SectionMode } from '../../SectionsContainer';
import { SupportingDocuments } from './SupportingDocuments';
import { IntakeFormControls } from './EditControls';

interface IntakeFormAccordionContentProps {
  sectionId: string;
  gridId: string;
  panels: SectionConfig['panels'];
  mode: SectionMode;
  isDraft?: boolean;
  hasSupportingDocuments: boolean;
  supportingDocuments: SupportingDocumentConfig[];
  dataSourceRequestHandler?: UseBaseWidgetOptions['dataSourceRequestHandler'];
  namespacedSchemaData?: UseBaseWidgetOptions['schemaData'];
  onValueChange?: UseBaseWidgetOptions['onValueChange'];
  sectionIndex?: number;
  onPreviousSection?: (index: number) => void;
  onNext: () => void;
  translate: (key: string) => string;
}

export function IntakeFormAccordionContent({
  sectionId,
  gridId,
  panels,
  mode,
  isDraft,
  hasSupportingDocuments,
  supportingDocuments,
  dataSourceRequestHandler,
  namespacedSchemaData,
  onValueChange,
  sectionIndex,
  onPreviousSection,
  onNext,
  translate,
}: IntakeFormAccordionContentProps) {
  return (
    <div
      id={`intake-form-accordion-content-${sectionId}`}
      className="intake-form-accordion-content"
      role="region"
      aria-labelledby={`intake-form-accordion-header-${sectionId}`}
    >
      <div id={gridId} className="section-panels" style={{ paddingTop: '8px' }}>
        {panels.map((panel, index) => (
          <div key={panel['panel-id'] || `section-panel-${index}`} className="panel-wrapper">
            <PanelRenderer
              panel={panel}
              dataSourceRequestHandler={dataSourceRequestHandler}
              schemaData={namespacedSchemaData}
              onValueChange={onValueChange}
              isEditMode={isDraft !== false}
            />
          </div>
        ))}
        <hr
          className="w-full"
          style={{
            height: '1px',
            backgroundColor: 'var(--owt-section-divider-color, #F5BB1A)',
            border: 'none',
            margin: '15px 0 0 0',
          }}
        />
        {hasSupportingDocuments && (
          <SupportingDocuments
            sectionId={sectionId}
            supportingDocuments={supportingDocuments}
            mode={mode}
            isDraft={isDraft}
            translate={translate}
          />
        )}
        <IntakeFormControls
          sectionIndex={sectionIndex}
          onPreviousSection={onPreviousSection}
          onNext={onNext}
          translate={translate}
        />
      </div>
    </div>
  );
}

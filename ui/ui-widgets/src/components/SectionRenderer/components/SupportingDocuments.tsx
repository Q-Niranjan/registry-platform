import { SupportingDocumentConfig } from '../../../types';
import { SectionMode } from '../../SectionsContainer';
import { FileInputWidget } from '../../../widgets/FileInputWidget';
import { createDocumentWidgetConfig } from '../utils/sectionHelpers';
import { arrowUpIcon, arrowDownIcon } from '../../../assets';

interface SupportingDocumentsProps {
  sectionId: string;
  supportingDocuments: SupportingDocumentConfig[];
  mode: SectionMode;
  isDraft?: boolean;
  translate: (key: string) => string;
  collapsible?: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export function SupportingDocuments({
  sectionId,
  supportingDocuments,
  mode,
  isDraft,
  translate,
  collapsible = false,
  isExpanded = true,
  onToggleExpanded,
}: SupportingDocumentsProps) {
  if (supportingDocuments.length === 0) {
    return null;
  }

  return (
    <div className="supporting-documents-container">
      {collapsible ? (
        <button
          type="button"
          onClick={onToggleExpanded}
          className="supporting-documents-title-button w-full flex items-center text-left"
        >
          <span className="font-semibold" style={{ fontFamily: 'Roboto, sans-serif', fontSize: '16px' }}>
            {translate('common.supportedDocuments') || 'Supported Documents'}
          </span>
          <img
            src={isExpanded ? arrowUpIcon : arrowDownIcon}
            alt="Toggle Documents"
            className="w-4 h-2.25 transition-transform ml-2"
          />
        </button>
      ) : (
        <span className="font-semibold" style={{ fontFamily: 'Roboto, sans-serif', fontSize: '16px' }}>
          {translate('common.supportedDocuments') || 'Supported Documents'}
        </span>
      )}
      {(!collapsible || isExpanded) && (
        <div className="supporting-documents-grid mt-4">
          {supportingDocuments.map((doc, index) => {
            const docConfig = createDocumentWidgetConfig(doc, sectionId, index, mode, isDraft);
            return (
              <div key={`${sectionId}-doc-${index}`} className="supporting-document-item">
                <FileInputWidget config={docConfig} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

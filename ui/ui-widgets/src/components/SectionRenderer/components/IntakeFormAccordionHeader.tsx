import { SectionConfig } from '../../../types';
import { arrowUpIcon, arrowDownIcon } from '../../../assets';

interface IntakeFormAccordionHeaderProps {
  sectionId: string;
  sectionTitle?: SectionConfig['section-title'];
  sectionIndex?: number;
  isAccessible?: boolean;
  isExpanded: boolean;
  intakeFormSectionStatus: 'saved' | 'modified' | null;
  translateConfig: (title: SectionConfig['section-title']) => string;
  translate: (key: string) => string;
  onToggle: () => void;
}

export function IntakeFormAccordionHeader({
  sectionId,
  sectionTitle,
  sectionIndex,
  isAccessible = false,
  isExpanded,
  intakeFormSectionStatus,
  translateConfig,
  translate,
  onToggle,
}: IntakeFormAccordionHeaderProps) {
  const isInteractive = sectionIndex === undefined || isAccessible;

  return (
    <button
      type="button"
      id={`intake-form-accordion-header-${sectionId}`}
      className="intake-form-accordion-header"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-controls={isExpanded ? `intake-form-accordion-content-${sectionId}` : undefined}
      data-interactive={isInteractive ? 'true' : 'false'}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '16px 0',
        marginTop: '16px',
        marginBottom: 0,
        background: 'none',
        border: 'none',
        cursor: isInteractive ? 'pointer' : 'default',
        textAlign: 'left',
        fontFamily: 'Roboto, sans-serif',
      }}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <h2 className="text-xl font-semibold" style={{ margin: 0 }}>
          {sectionTitle ? translateConfig(sectionTitle) : `Section ${(sectionIndex ?? 0) + 1}`}
        </h2>
        {intakeFormSectionStatus === 'saved' && (
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: 'var(--owt-color-success-light, #D1FAE5)',
              color: 'var(--owt-color-success-dark, #047857)',
            }}
          >
            {translate('common.sectionSaved') || 'Saved'}
          </span>
        )}
        {intakeFormSectionStatus === 'modified' && (
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: 'var(--owt-color-error-light, #FEE2E2)',
              color: 'var(--owt-color-error, #B91C1C)',
            }}
          >
            {translate('common.sectionModified') || 'Modified and not saved'}
          </span>
        )}
      </div>
      <img
        src={isExpanded ? arrowUpIcon : arrowDownIcon}
        alt={isExpanded ? 'Collapse' : 'Expand'}
        className="w-5 h-5 transition-transform"
        style={{ flexShrink: 0, marginLeft: '12px' }}
        aria-hidden
      />
    </button>
  );
}

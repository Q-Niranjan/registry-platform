import { arrowLeftIcon, arrowRightIcon } from '../../../assets';

interface EditControlsProps {
  onCancel: () => void;
  onSave: () => void;
  isDirty: boolean;
  translate: (key: string) => string;
}

export function EditControls({ onCancel, onSave, isDirty, translate }: EditControlsProps) {
  return (
    <div className="edit-controls-container" style={{ marginBottom: '20px' }}>
      <div className="edit-controls-buttons">
        <button
          onClick={onCancel}
          className="text-sm font-medium px-6 py-2 transition-colors"
          style={{
            fontFamily: 'Roboto, sans-serif',
            borderRadius: 'var(--owt-btn-border-radius, 10px)',
            border: '1px solid var(--owt-btn-secondary-border, #C4C4C4)',
            backgroundColor: 'var(--owt-btn-secondary-bg, #FFFFFF)',
            color: 'var(--owt-btn-secondary-color, #011627)',
          }}
        >
          {translate('common.cancel') || 'Cancel'}
        </button>
        <button
          onClick={onSave}
          disabled={!isDirty}
          className="text-sm font-medium px-6 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            fontFamily: 'Roboto, sans-serif',
            borderRadius: 'var(--owt-btn-border-radius, 10px)',
            border: '1px solid var(--owt-btn-primary-border, #F07B1A)',
            backgroundColor: 'var(--owt-color-primary, #F5BB1A)',
            color: 'var(--owt-color-bg, #FFFFFF)',
          }}
        >
          {translate('common.save') || 'Save'}
        </button>
      </div>
    </div>
  );
}

interface IntakeFormControlsProps {
  sectionIndex?: number;
  onPreviousSection?: (index: number) => void;
  onNext: () => void;
  translate: (key: string) => string;
}

export function IntakeFormControls({
  sectionIndex,
  onPreviousSection,
  onNext,
  translate,
}: IntakeFormControlsProps) {
  return (
    <div
      className="intake-form-edit-controls"
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '12px',
        marginTop: '10px',
        marginBottom: '10px',
        width: '100%',
      }}
    >
      {typeof sectionIndex === 'number' && sectionIndex > 0 && (
        <button
          type="button"
          onClick={() => onPreviousSection?.(sectionIndex)}
          className="intake-form-prev-btn"
          style={{
            fontFamily: 'Roboto, sans-serif',
            fontSize: '14px',
            fontWeight: 400,
            padding: '8px 24px',
            borderRadius: 'var(--owt-btn-border-radius, 10px)',
            border: '1px solid var(--owt-btn-primary-border, #F07B1A)',
            background: 'var(--owt-btn-primary-bg, #FFFFFF)',
            color: 'var(--owt-color-text-muted, #727474)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <img
            src={arrowLeftIcon}
            alt=""
            aria-hidden
            style={{ width: '14px', height: '14px', opacity: 0.5 }}
          />
          {translate('common.previous') || 'Prev'}
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        className="intake-form-save-btn"
        style={{
          fontFamily: 'Roboto, sans-serif',
          fontSize: '14px',
          fontWeight: 400,
          padding: '8px 24px',
          borderRadius: 'var(--owt-btn-border-radius, 10px)',
          border: '1px solid var(--owt-btn-primary-border, #F07B1A)',
          background: 'var(--owt-btn-primary-bg, #FFFFFF)',
          color: 'var(--owt-color-text-muted, #727474)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {translate('common.next') || 'Next'}
        <img
          src={arrowRightIcon}
          alt=""
          aria-hidden
          style={{ width: '14px', height: '14px' }}
        />
      </button>
    </div>
  );
}

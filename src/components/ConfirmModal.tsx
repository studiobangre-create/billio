import { useEffect } from 'react';
import Icon from '@/components/Icon';

interface Props {
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({ title, body, confirmLabel = 'Supprimer', onConfirm, onClose }: Props) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="inv-overlay" onClick={onClose}>
      <div
        className="inv-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
      >
        <div className="inv-modal-head">
          <div className="inv-modal-title">
            <Icon name="alert-triangle" size={16} ariaHidden />
            {title}
          </div>
          <button className="btn btn-icon" onClick={onClose} aria-label="Fermer">
            <Icon name="x" size={16} ariaHidden />
          </button>
        </div>
        <div className="inv-modal-body">
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{body}</p>
        </div>
        <div className="inv-modal-foot">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-ghost btn-danger"
            onClick={() => { onConfirm(); onClose(); }}
          >
            <Icon name="trash" size={14} ariaHidden /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

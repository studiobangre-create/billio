import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { mailtoUrl, whatsappUrl } from '@/lib/share-links';

export type SendChannel = 'email' | 'whatsapp' | 'copy';

/**
 * Prepares a message for an invoice or quote and hands it to the user's own
 * email app or WhatsApp (or copies it). Nothing is sent by Billio itself, so
 * the wording never claims a document was delivered.
 */
export default function SendDocumentDialog({
  title, recipientName, email, phone, subject, message, onSent, onClose, onDownloadPdf,
}: {
  title:          string;
  recipientName:  string;
  email?:         string;
  phone?:         string;
  subject:        string;
  message:        string;
  onSent:         (channel: SendChannel) => void;
  onClose:        () => void;
  onDownloadPdf?: () => void;
}) {
  const [text, setText]     = useState(message);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onSent('copy');
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="inv-overlay" onClick={onClose}>
      <div className="inv-modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="inv-modal-head">
          <div className="inv-modal-title">
            <Icon name="send" size={16} ariaHidden />
            {title}
          </div>
          <button className="btn btn-icon" onClick={onClose} aria-label="Fermer">
            <Icon name="x" size={16} ariaHidden />
          </button>
        </div>
        <div className="inv-modal-body">
          <div className="form-group">
            <label className="form-label" htmlFor="send-doc-message">Message pour {recipientName}</label>
            <textarea id="send-doc-message" className="form-input" rows={7} value={text} onChange={e => setText(e.target.value)} />
          </div>
          {onDownloadPdf && (
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
              Le PDF n'est pas joint automatiquement :{' '}
              <button type="button" className="crumb-link" style={{ color: 'var(--brand)', textDecoration: 'underline' }} onClick={onDownloadPdf}>téléchargez-le</button>{' '}
              puis ajoutez-le à votre message.
            </p>
          )}
        </div>
        <div className="inv-modal-foot" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button className="btn" onClick={copy}>
            <Icon name={copied ? 'check' : 'copy'} size={14} ariaHidden /> {copied ? 'Copié' : 'Copier le message'}
          </button>
          <a
            className="btn"
            style={{ textDecoration: 'none' }}
            href={whatsappUrl(phone, text)}
            target="_blank"
            rel="noreferrer"
            onClick={() => onSent('whatsapp')}
          >
            <Icon name="phone" size={14} ariaHidden /> WhatsApp
          </a>
          {email ? (
            <a className="btn btn-primary" style={{ textDecoration: 'none' }} href={mailtoUrl(email, subject, text)} onClick={() => onSent('email')}>
              <Icon name="mail" size={14} ariaHidden /> Email
            </a>
          ) : (
            <button className="btn btn-primary" disabled title="Ajoutez un email à ce client pour l'utiliser">
              <Icon name="mail" size={14} ariaHidden /> Email
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

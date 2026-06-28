import { useEffect } from 'react';
import Icon from '@/components/Icon';

interface DrawerPanelProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}

export default function DrawerPanel({ open, onClose, title, subtitle, children }: DrawerPanelProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      <div className={`acc-scrim${open ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`acc-drawer${open ? ' open' : ''}`} aria-hidden={!open}>
        <div className="acc-drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            {typeof title === 'string'
              ? <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>{title}</div>
              : title}
            {subtitle && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button className="acc-drawer-close" onClick={onClose} aria-label="Fermer">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="acc-drawer-body">{children}</div>
      </aside>
    </>
  );
}

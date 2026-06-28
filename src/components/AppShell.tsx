import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Icon from '@/components/Icon';
import { useToast } from '@/context/ToastContext';

export default function AppShell({ onLogout }: { onLogout: () => void }) {
  const { toastMsg, toastVisible, toastError } = useToast();

  return (
    <div className="app">
      <Sidebar onLogout={onLogout} />
      <div className="main-rel">
        <Outlet />
        <div className={`toast${toastVisible ? ' show' : ''}`} role="status" aria-live="polite">
          <Icon name="circle-check-filled" ariaHidden style={{ color: toastError ? '#F0A0A0' : '#7BD17B' }} />
          <span>{toastMsg}</span>
        </div>
      </div>
    </div>
  );
}

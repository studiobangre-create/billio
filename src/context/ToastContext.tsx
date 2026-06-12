import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react';

interface ToastContextValue {
  toastMsg:     string;
  toastVisible: boolean;
  toastError:   boolean;
  showToast:    (msg: string, isError?: boolean) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toastMsg,     setToastMsg]     = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastError,   setToastError]   = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string, isError = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastError(isError);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ toastMsg, toastVisible, toastError, showToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

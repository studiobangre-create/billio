import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { INITIAL_INVOICES, INITIAL_ACTIVITY, INITIAL_CLIENTS, INITIAL_PAYMENTS, INITIAL_PRODUCTS, INITIAL_QUOTES } from '../data';
import { fetchInvoices }   from '../lib/api/invoices';
import { fetchClients }    from '../lib/api/clients';
import { fetchPayments }   from '../lib/api/payments';
import { fetchProducts }   from '../lib/api/products';
import { fetchQuotes }     from '../lib/api/quotes';
import { fetchActivities } from '../lib/api/activities';
import type { Invoice, Activity, ClientRecord, Payment, Product, Quote, Client } from '../lib/schemas';

const MOCK = import.meta.env.VITE_MOCK_AUTH === 'true';

interface AppContextValue {
  // Entities
  invoices:    Invoice[];      setInvoices:    Dispatch<SetStateAction<Invoice[]>>;
  activity:    Activity[];     setActivity:    Dispatch<SetStateAction<Activity[]>>;
  clients:     ClientRecord[]; setClients:     Dispatch<SetStateAction<ClientRecord[]>>;
  payments:    Payment[];      setPayments:    Dispatch<SetStateAction<Payment[]>>;
  products:    Product[];      setProducts:    Dispatch<SetStateAction<Product[]>>;
  quotes:      Quote[];        setQuotes:      Dispatch<SetStateAction<Quote[]>>;
  // Derived lookup: client code → {name, city, av}
  clientsMap:  Record<string, Client>;
  // Auth
  userId:      string;
  orgId:       string;
  userLabel:   string;
  userInitials:string;
  // Onboarding
  needsOnboarding:    boolean;
  completeOnboarding: (bizName: string) => void;
  // UI
  loading:     boolean;
  toastMsg:    string;
  toastVisible:boolean;
  toastError:  boolean;
  showToast:   (msg: string, isError?: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [invoices,  setInvoices]  = useState<Invoice[]>(MOCK ? INITIAL_INVOICES : []);
  const [activity,  setActivity]  = useState<Activity[]>(MOCK ? INITIAL_ACTIVITY : []);
  const [clients,   setClients]   = useState<ClientRecord[]>(MOCK ? INITIAL_CLIENTS : []);
  const [payments,  setPayments]  = useState<Payment[]>(MOCK ? INITIAL_PAYMENTS : []);
  const [products,  setProducts]  = useState<Product[]>(MOCK ? INITIAL_PRODUCTS : []);
  const [quotes,    setQuotes]    = useState<Quote[]>(MOCK ? INITIAL_QUOTES : []);

  const [userId,          setUserId]          = useState(MOCK ? 'mock-user' : '');
  const [orgId,           setOrgId]           = useState(MOCK ? 'mock-org'  : '');
  const [userLabel,       setUserLabel]       = useState('');
  const [userInitials,    setUserInitials]    = useState('??');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading,         setLoading]         = useState(!MOCK);

  const [toastMsg,     setToastMsg]     = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastError,   setToastError]   = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Derived client lookup
  const clientsMap = useMemo<Record<string, Client>>(
    () => Object.fromEntries(clients.map(c => [c.code, { name: c.name, city: c.city, av: c.av }])),
    [clients],
  );

  useEffect(() => {
    if (MOCK) {
      setUserLabel('Serge W.');
      setUserInitials('SW');
      return;
    }

    async function boot() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setUserId(user.id);
      const email = user.email ?? '';
      const meta  = user.user_metadata as Record<string, string> | undefined;
      const first = meta?.first_name ?? meta?.firstName ?? '';
      const last  = meta?.last_name  ?? meta?.lastName  ?? '';
      if (first || last) {
        setUserLabel(`${first} ${last}`.trim());
        setUserInitials(`${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || email[0]?.toUpperCase() || '?');
      } else {
        const name = email.split('@')[0];
        setUserLabel(name);
        setUserInitials(name.slice(0, 2).toUpperCase());
      }

      // Resolve the user's org and check onboarding status
      const { data: membership } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      const resolvedOrgId = membership?.org_id ?? '';
      setOrgId(resolvedOrgId);

      if (!resolvedOrgId) {
        // No org membership found — new user whose trigger hasn't run yet
        setNeedsOnboarding(true);
      } else {
        const { data: org, error: orgErr } = await supabase
          .from('organizations')
          .select('onboarding_completed_at')
          .eq('id', resolvedOrgId)
          .single();
        if (orgErr) console.warn('[boot] org fetch error:', orgErr.message);
        setNeedsOnboarding(!org?.onboarding_completed_at);
      }

      try {
        const [inv, cli, pay, prod, quo, act] = await Promise.all([
          fetchInvoices(resolvedOrgId),
          fetchClients(resolvedOrgId),
          fetchPayments(resolvedOrgId),
          fetchProducts(resolvedOrgId),
          fetchQuotes(resolvedOrgId),
          fetchActivities(resolvedOrgId),
        ]);
        setInvoices(inv);
        setClients(cli);
        setPayments(pay);
        setProducts(prod);
        setQuotes(quo);
        setActivity(act);
      } finally {
        setLoading(false);
      }
    }

    boot();
  }, []);

  const completeOnboarding = useCallback((bizName: string) => {
    setNeedsOnboarding(false);
    setUserLabel(prev => prev || bizName);
  }, []);

  const showToast = useCallback((msg: string, isError = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastError(isError);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2600);
  }, []);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  return (
    <AppContext.Provider value={{
      invoices,  setInvoices,
      activity,  setActivity,
      clients,   setClients,
      payments,  setPayments,
      products,  setProducts,
      quotes,    setQuotes,
      clientsMap,
      userId,
      orgId,
      userLabel, userInitials,
      needsOnboarding, completeOnboarding,
      loading,
      toastMsg, toastVisible, toastError,
      showToast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

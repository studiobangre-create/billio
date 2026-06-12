import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import { useToast } from './ToastContext';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { INITIAL_INVOICES, INITIAL_ACTIVITY, INITIAL_CLIENTS, INITIAL_PAYMENTS, INITIAL_PRODUCTS, INITIAL_QUOTES } from '../data';
import { fetchInvoices,  dbToInvoice  } from '../lib/api/invoices';
import { fetchClients,   dbToClient   } from '../lib/api/clients';
import { fetchPayments,  dbToPayment  } from '../lib/api/payments';
import { fetchProducts,  dbToProduct  } from '../lib/api/products';
import { fetchQuotes,    dbToQuote    } from '../lib/api/quotes';
import { fetchActivities, dbToActivity } from '../lib/api/activities';
import { fetchOpeningBalanceAdopted } from '../lib/api/accounting';
import type { Invoice, Activity, ClientRecord, Payment, Product, Quote, Client } from '../lib/schemas';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface OrgSettings {
  name:           string;
  address:        string;
  city:           string;
  country:        string;
  email:          string;
  phone:          string;
  ifu:            string;
  rccm:           string;
  taxRegime:      string;
  divisionFiscale: string;
}

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
  // Org profile (used by invoice templates)
  orgSettings: OrgSettings;
  setOrgSettings: Dispatch<SetStateAction<OrgSettings>>;
  // Auth
  userId:      string;
  orgId:       string;
  userLabel:   string;
  userInitials:string;
  // Onboarding
  needsOnboarding:    boolean;
  completeOnboarding: (bizName: string) => void;
  // Opening balances
  openingBalancesAdopted:    boolean;
  setOpeningBalancesAdopted: Dispatch<SetStateAction<boolean>>;
  // UI
  loading:   boolean;
  showToast: (msg: string, isError?: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [invoices,  setInvoices]  = useState<Invoice[]>(MOCK ? INITIAL_INVOICES : []);
  const [activity,  setActivity]  = useState<Activity[]>(MOCK ? INITIAL_ACTIVITY : []);
  const [clients,   setClients]   = useState<ClientRecord[]>(MOCK ? INITIAL_CLIENTS : []);
  const [payments,  setPayments]  = useState<Payment[]>(MOCK ? INITIAL_PAYMENTS : []);
  const [products,  setProducts]  = useState<Product[]>(MOCK ? INITIAL_PRODUCTS : []);
  const [quotes,    setQuotes]    = useState<Quote[]>(MOCK ? INITIAL_QUOTES : []);

  const EMPTY_ORG: OrgSettings = { name: '', address: '', city: '', country: '', email: '', phone: '', ifu: '', rccm: '', taxRegime: '', divisionFiscale: '' };
  const [orgSettings,     setOrgSettings]     = useState<OrgSettings>(EMPTY_ORG);

  const [userId,          setUserId]          = useState(MOCK ? 'mock-user' : '');
  const [orgId,           setOrgId]           = useState(MOCK ? 'mock-org'  : '');
  const [userLabel,       setUserLabel]       = useState('');
  const [userInitials,    setUserInitials]    = useState('??');
  const [needsOnboarding,         setNeedsOnboarding]         = useState(false);
  const [openingBalancesAdopted,  setOpeningBalancesAdopted]  = useState(false);
  const [loading,                 setLoading]                 = useState(!MOCK);

  const { showToast } = useToast();
  const realtimeRef  = useRef<RealtimeChannel | null>(null);

  // Derived client lookup
  const clientsMap = useMemo<Record<string, Client>>(
    () => Object.fromEntries(clients.map(c => [c.code, { name: c.name, city: c.city, av: c.av, ifu: c.ifu, rccm: c.rccm, taxRegime: c.taxRegime }])),
    [clients],
  );

  useEffect(() => {
    if (MOCK) {
      setUserLabel('Serge W.');
      setUserInitials('SW');
      return;
    }

    async function boot(user: User) {
      setLoading(true);
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
        setNeedsOnboarding(true);
      } else {
        const { data: org, error: orgErr } = await supabase
          .from('organizations')
          .select('name, address, city, country, email, phone, ifu, rccm, tax_regime, division_fiscale, onboarding_completed_at')
          .eq('id', resolvedOrgId)
          .single();
        if (orgErr) console.warn('[boot] org fetch error:', orgErr.message);
        setNeedsOnboarding(!org?.onboarding_completed_at);
        if (org) {
          setOrgSettings({
            name:           org.name            ?? '',
            address:        org.address         ?? '',
            city:           org.city            ?? '',
            country:        org.country         ?? '',
            email:          org.email           ?? '',
            phone:          org.phone           ?? '',
            ifu:            org.ifu             ?? '',
            rccm:           org.rccm            ?? '',
            taxRegime:      org.tax_regime      ?? '',
            divisionFiscale: org.division_fiscale ?? '',
          });
        }
      }

      if (resolvedOrgId) {
        try {
          const year = new Date().getFullYear();
          const [inv, cli, pay, prod, quo, act, obAdopted] = await Promise.all([
            fetchInvoices(resolvedOrgId),
            fetchClients(resolvedOrgId),
            fetchPayments(resolvedOrgId),
            fetchProducts(resolvedOrgId),
            fetchQuotes(resolvedOrgId),
            fetchActivities(resolvedOrgId),
            fetchOpeningBalanceAdopted(resolvedOrgId, year),
          ]);
          setInvoices(inv);
          setClients(cli);
          setPayments(pay);
          setProducts(prod);
          setQuotes(quo);
          setActivity(act);
          setOpeningBalancesAdopted(obAdopted);
        } catch (err) {
          console.error('[boot] data fetch error:', err);
        }
        setupRealtime(resolvedOrgId);
      }
      setLoading(false);
    }

    function setupRealtime(orgId: string) {
      if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
      const ch = supabase
        .channel(`org:${orgId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices',  filter: `org_id=eq.${orgId}` }, ({ eventType, new: n, old: o }) => {
          const row = n as Record<string, unknown>;
          if (eventType === 'INSERT') setInvoices(prev => [dbToInvoice(row), ...prev]);
          if (eventType === 'UPDATE') setInvoices(prev => prev.map(x => x.id === row.id ? dbToInvoice(row) : x));
          if (eventType === 'DELETE') setInvoices(prev => prev.filter(x => x.id !== (o as Record<string, unknown>).id));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clients',   filter: `org_id=eq.${orgId}` }, ({ eventType, new: n, old: o }) => {
          const row = n as Record<string, unknown>;
          if (eventType === 'INSERT') setClients(prev => [...prev, dbToClient(row)].sort((a, b) => a.name.localeCompare(b.name)));
          if (eventType === 'UPDATE') setClients(prev => prev.map(x => x.code === row.code ? dbToClient(row) : x));
          if (eventType === 'DELETE') setClients(prev => prev.filter(x => x.code !== (o as Record<string, unknown>).code));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments',  filter: `org_id=eq.${orgId}` }, ({ eventType, new: n, old: o }) => {
          const row = n as Record<string, unknown>;
          if (eventType === 'INSERT') setPayments(prev => [dbToPayment(row), ...prev]);
          if (eventType === 'UPDATE') setPayments(prev => prev.map(x => x.id === row.id ? dbToPayment(row) : x));
          if (eventType === 'DELETE') setPayments(prev => prev.filter(x => x.id !== (o as Record<string, unknown>).id));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products',  filter: `org_id=eq.${orgId}` }, ({ eventType, new: n, old: o }) => {
          const row = n as Record<string, unknown>;
          if (eventType === 'INSERT') setProducts(prev => [...prev, dbToProduct(row)].sort((a, b) => a.name.localeCompare(b.name)));
          if (eventType === 'UPDATE') setProducts(prev => prev.map(x => x.id === row.id ? dbToProduct(row) : x));
          if (eventType === 'DELETE') setProducts(prev => prev.filter(x => x.id !== (o as Record<string, unknown>).id));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes',    filter: `org_id=eq.${orgId}` }, ({ eventType, new: n, old: o }) => {
          const row = n as Record<string, unknown>;
          if (eventType === 'INSERT') setQuotes(prev => [dbToQuote(row), ...prev]);
          if (eventType === 'UPDATE') setQuotes(prev => prev.map(x => x.id === row.id ? dbToQuote(row) : x));
          if (eventType === 'DELETE') setQuotes(prev => prev.filter(x => x.id !== (o as Record<string, unknown>).id));
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities', filter: `org_id=eq.${orgId}` }, ({ new: n }) => {
          setActivity(prev => [dbToActivity(n as Record<string, unknown>), ...prev].slice(0, 50));
        })
        .subscribe();
      realtimeRef.current = ch;
    }

    function teardownRealtime() {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user) {
        boot(session.user);
      }
      if (event === 'USER_UPDATED' && session?.user) {
        const user = session.user;
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
      }
      if (event === 'SIGNED_OUT') {
        teardownRealtime();
        setUserId('');
        setOrgId('');
        setUserLabel('');
        setUserInitials('??');
        setOrgSettings(EMPTY_ORG);
        setNeedsOnboarding(false);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      teardownRealtime();
    };
  }, []);

  const completeOnboarding = useCallback((bizName: string) => {
    setNeedsOnboarding(false);
    setUserLabel(prev => prev || bizName);
  }, []);

  return (
    <AppContext.Provider value={{
      invoices,  setInvoices,
      activity,  setActivity,
      clients,   setClients,
      payments,  setPayments,
      products,  setProducts,
      quotes,    setQuotes,
      clientsMap,
      orgSettings, setOrgSettings,
      userId,
      orgId,
      userLabel, userInitials,
      needsOnboarding, completeOnboarding,
      openingBalancesAdopted, setOpeningBalancesAdopted,
      loading,
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

import { supabase } from '../supabase';
import { INITIAL_CLIENTS } from '../../data';
import type { ClientRecord } from '../schemas';

const MOCK = import.meta.env.VITE_MOCK_AUTH === 'true';

function dbToClient(row: Record<string, unknown>): ClientRecord {
  return {
    code:     String(row.code),
    av:       String(row.av ?? 'av-a'),
    name:     String(row.name),
    contact:  String(row.contact ?? '—'),
    email:    String(row.email ?? '—'),
    phone:    String(row.phone ?? '—'),
    city:     String(row.city ?? '—'),
    invoices: Number(row.invoices_count ?? 0),
    billed:   Number(row.billed ?? 0),
    balance:  Number(row.balance ?? 0),
    status:   (row.status ?? 'active') as ClientRecord['status'],
  };
}

export async function fetchClients(_orgId: string): Promise<ClientRecord[]> {
  if (MOCK) return [...INITIAL_CLIENTS];
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToClient);
}

export async function createClient(
  orgId: string,
  payload: Omit<ClientRecord, 'invoices' | 'billed' | 'balance'> & { ifu?: string },
): Promise<ClientRecord> {
  if (MOCK) return { ...payload, invoices: 0, billed: 0, balance: 0 };
  const { data, error } = await supabase
    .from('clients')
    .insert({
      org_id:         orgId,
      code:           payload.code,
      av:             payload.av,
      name:           payload.name,
      contact:        payload.contact,
      email:          payload.email,
      phone:          payload.phone,
      city:           payload.city,
      ifu:            payload.ifu ?? '',
      status:         payload.status,
      invoices_count: 0,
      billed:         0,
      balance:        0,
    })
    .select()
    .single();
  if (error) throw error;
  return dbToClient(data as Record<string, unknown>);
}

export async function updateClient(code: string, patch: Partial<ClientRecord>): Promise<void> {
  if (MOCK) return;
  const { error } = await supabase.from('clients').update(patch).eq('code', code);
  if (error) throw error;
}

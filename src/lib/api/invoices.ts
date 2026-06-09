import { supabase } from '../supabase';
import { INITIAL_INVOICES } from '../../data';
import type { Invoice } from '../schemas';

const MOCK = import.meta.env.VITE_MOCK_AUTH === 'true';

function dbToInvoice(row: Record<string, unknown>): Invoice {
  return {
    id:      String(row.id),
    subject: String(row.subject ?? ''),
    client:  String(row.client_code),
    issued:  String(row.issued_at),
    due:     String(row.due_at),
    amount:  Number(row.amount),
    status:  row.status as Invoice['status'],
  };
}

export async function fetchInvoices(_orgId: string): Promise<Invoice[]> {
  if (MOCK) return [...INITIAL_INVOICES];
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('issued_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbToInvoice);
}

export async function createInvoice(
  orgId: string,
  payload: Pick<Invoice, 'id' | 'subject' | 'client' | 'issued' | 'due' | 'amount' | 'status'>,
): Promise<Invoice> {
  if (MOCK) return { ...payload };
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      id:          payload.id,
      org_id:      orgId,
      subject:     payload.subject,
      client_code: payload.client,
      issued_at:   payload.issued,
      due_at:      payload.due,
      amount:      payload.amount,
      status:      payload.status,
    })
    .select()
    .single();
  if (error) throw error;
  return dbToInvoice(data as Record<string, unknown>);
}

export async function updateInvoice(id: string, patch: Partial<Pick<Invoice, 'status'>>): Promise<void> {
  if (MOCK) return;
  const { error } = await supabase.from('invoices').update(patch).eq('id', id);
  if (error) throw error;
}

export async function removeInvoice(id: string): Promise<void> {
  if (MOCK) return;
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}

import { supabase } from '../supabase';
import { INITIAL_QUOTES } from '../../data';
import type { Quote } from '../schemas';

const MOCK = import.meta.env.VITE_MOCK_AUTH === 'true';

function dbToQuote(row: Record<string, unknown>): Quote {
  const validUntil = String(row.valid_until);
  const daysLeft   = (new Date(validUntil).getTime() - Date.now()) / 86_400_000;
  return {
    id:      String(row.id),
    subject: String(row.subject ?? ''),
    client:  String(row.client_code),
    issued:  String(row.issued_at),
    valid:   validUntil,
    expSoon: daysLeft > 0 && daysLeft <= 14,
    amount:  Number(row.amount),
    status:  (row.status ?? 'draft') as Quote['status'],
  };
}

export async function fetchQuotes(_orgId: string): Promise<Quote[]> {
  if (MOCK) return [...INITIAL_QUOTES];
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('issued_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbToQuote);
}

export async function createQuote(
  orgId: string,
  payload: Pick<Quote, 'id' | 'subject' | 'client' | 'issued' | 'valid' | 'amount' | 'status'>,
): Promise<Quote> {
  const daysLeft = (new Date(payload.valid).getTime() - Date.now()) / 86_400_000;
  const expSoon  = daysLeft > 0 && daysLeft <= 14;
  if (MOCK) return { ...payload, expSoon };
  const { data, error } = await supabase
    .from('quotes')
    .insert({
      id:          payload.id,
      org_id:      orgId,
      subject:     payload.subject,
      client_code: payload.client,
      issued_at:   payload.issued,
      valid_until: payload.valid,
      amount:      payload.amount,
      status:      payload.status,
    })
    .select()
    .single();
  if (error) throw error;
  return dbToQuote(data as Record<string, unknown>);
}

export async function updateQuote(id: string, patch: Partial<Pick<Quote, 'status'>>): Promise<void> {
  if (MOCK) return;
  const { error } = await supabase.from('quotes').update(patch).eq('id', id);
  if (error) throw error;
}

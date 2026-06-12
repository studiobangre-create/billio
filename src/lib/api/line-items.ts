import { supabase } from '../supabase';
import type { LineItem } from '../schemas';

const MOCK = import.meta.env.VITE_MOCK_AUTH === 'true';

function dbToLineItem(row: Record<string, unknown>): LineItem {
  return {
    id:    String(row.id),
    desc:  String(row.description),
    qty:   Number(row.qty),
    price: Number(row.price),
  };
}

export async function fetchLineItems(
  invoiceId?: string,
  quoteId?: string,
): Promise<LineItem[]> {
  if (MOCK) return [];
  let query = supabase.from('line_items').select('id, description, qty, price');
  if (invoiceId) query = query.eq('invoice_id', invoiceId);
  else if (quoteId) query = query.eq('quote_id', quoteId);
  else return [];
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(r => dbToLineItem(r as Record<string, unknown>));
}

export async function saveLineItems(
  orgId: string,
  lines: LineItem[],
  opts: { invoiceId?: string; quoteId?: string },
): Promise<void> {
  if (MOCK || lines.length === 0) return;
  const rows = lines.map(l => ({
    org_id:      orgId,
    invoice_id:  opts.invoiceId ?? null,
    quote_id:    opts.quoteId   ?? null,
    description: l.desc,
    qty:         l.qty,
    price:       l.price,
  }));
  const { error } = await supabase.from('line_items').insert(rows);
  if (error) throw error;
}

export async function deleteLineItems(opts: { invoiceId?: string; quoteId?: string }): Promise<void> {
  if (MOCK) return;
  if (opts.invoiceId) {
    const { error } = await supabase.from('line_items').delete().eq('invoice_id', opts.invoiceId);
    if (error) throw error;
  } else if (opts.quoteId) {
    const { error } = await supabase.from('line_items').delete().eq('quote_id', opts.quoteId);
    if (error) throw error;
  }
}

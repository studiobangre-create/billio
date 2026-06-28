import { supabase } from '@/lib/supabase';
import { INITIAL_PRODUCTS } from '@/data';
import type { Product } from '@/lib/schemas';

const MOCK = import.meta.env.VITE_MOCK_AUTH === 'true';

export function dbToProduct(row: Record<string, unknown>): Product {
  return {
    id:    String(row.id),
    name:  String(row.name),
    sku:   String(row.sku ?? '—'),
    type:  (row.type ?? 'service') as Product['type'],
    unit:  String(row.unit),
    price: Number(row.price),
    tax:   Number(row.tax ?? 0),
    used:  Number(row.used ?? 0),
    ico:   String(row.ico ?? 'package'),
    color: String(row.color ?? 'ico-blue'),
  };
}

export async function fetchProducts(orgId: string): Promise<Product[]> {
  if (MOCK) return [...INITIAL_PRODUCTS];
  const { data, error } = await supabase
    .from('products')
    .select('*, line_items(count)')
    .eq('org_id', orgId)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(row => {
    const r = row as Record<string, unknown>;
    const countArr = r.line_items as Array<{ count: number }> | undefined;
    const used = countArr?.[0]?.count ?? 0;
    return dbToProduct({ ...r, used });
  });
}

export async function createProduct(
  orgId: string,
  payload: Omit<Product, 'used'>,
): Promise<Product> {
  if (MOCK) return { ...payload, used: 0 };
  const { data, error } = await supabase
    .from('products')
    .insert({
      id:      payload.id,
      org_id:  orgId,
      name:    payload.name,
      sku:     payload.sku,
      type:    payload.type,
      unit:    payload.unit,
      price:   payload.price,
      tax:     payload.tax,
      used:    0,
      ico:     payload.ico,
      color:   payload.color,
    })
    .select()
    .single();
  if (error) throw error;
  return dbToProduct(data as Record<string, unknown>);
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<void> {
  if (MOCK) return;
  const { error } = await supabase.from('products').update(patch).eq('id', id);
  if (error) throw error;
}

export async function removeProduct(id: string): Promise<void> {
  if (MOCK) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

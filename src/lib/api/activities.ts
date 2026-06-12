import { supabase } from '../supabase';
import { INITIAL_ACTIVITY } from '../../data';
import type { Activity } from '../schemas';

const MOCK = import.meta.env.VITE_MOCK_AUTH === 'true';

export function dbToActivity(row: Record<string, unknown>): Activity {
  const ts = new Date(String(row.created_at));
  const time = ts.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  return {
    kind:  row.kind as Activity['kind'],
    parts: row.parts as Activity['parts'],
    time,
  };
}

export async function fetchActivities(orgId: string): Promise<Activity[]> {
  if (MOCK) return [...INITIAL_ACTIVITY];
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(dbToActivity);
}

export async function createActivity(
  orgId: string,
  payload: Pick<Activity, 'kind' | 'parts'>,
): Promise<Activity> {
  const now = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  if (MOCK) return { ...payload, time: "À l'instant" };
  const { error } = await supabase
    .from('activities')
    .insert({ org_id: orgId, kind: payload.kind, parts: payload.parts });
  if (error) throw error;
  return { ...payload, time: now };
}

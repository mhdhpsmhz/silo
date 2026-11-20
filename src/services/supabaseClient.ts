import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const rawPublishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ?? '';

function isValidSupabaseUrl(url: string): boolean {
  if (!url || url.includes('your-project-id')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const SUPABASE_CONFIGURED =
  isValidSupabaseUrl(rawUrl) &&
  rawPublishableKey.length > 20 &&
  !rawPublishableKey.includes('your-supabase-publishable-key');

export const supabase: SupabaseClient | null = SUPABASE_CONFIGURED
  ? createClient(rawUrl, rawPublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export function getSupabaseConnectionInfo() {
  return {
    configured: SUPABASE_CONFIGURED,
    url: SUPABASE_CONFIGURED ? rawUrl : null,
    mode: SUPABASE_CONFIGURED ? 'Supabase PostgreSQL' : 'Browser Local Storage (Dexie / IndexedDB)',
  };
}

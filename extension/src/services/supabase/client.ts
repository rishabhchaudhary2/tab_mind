import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ??
  import.meta.env.SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
  }
  return client;
}

// Debug hook — remove before shipping
if (typeof window !== 'undefined' && isSupabaseConfigured) {
  (window as Window & {
    __sb?: SupabaseClient;
  }).__sb = getSupabaseClient();
}
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loudly during development rather than producing confusing auth errors.
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // "Remember session": persist to localStorage and refresh automatically.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'audit-compliance-auth',
  },
});

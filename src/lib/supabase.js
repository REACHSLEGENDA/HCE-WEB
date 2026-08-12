import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key missing in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    timeout: 15000
  }
});

// Public pages must never inherit a user's access token. This keeps public
// catalog/webinar requests working even when a legacy authenticated session is invalid.
export const publicSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  db: {
    timeout: 15000
  }
});

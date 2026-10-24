import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && (supabaseAnonKey || supabaseServiceKey));

// Public / browser client
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey || supabaseServiceKey!)
  : null;

// Server-side admin client (can bypass RLS if service key is provided)
export const getSupabaseServerClient = () => {
  if (!isSupabaseConfigured) return null;
  const key = supabaseServiceKey || supabaseAnonKey;
  return createClient(supabaseUrl!, key!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '@/config/env';

if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
  console.warn('Missing Supabase environment variables. Check .env.local');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(
  SUPABASE_CONFIG.url || 'https://placeholder.supabase.co',
  SUPABASE_CONFIG.anonKey || 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

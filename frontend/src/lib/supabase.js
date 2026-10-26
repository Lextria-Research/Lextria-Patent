// frontend/src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://eafciegebhuhoneypsqy.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZmNpZWdlYmh1aG9uZXlwc3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwOTU1NTcsImV4cCI6MjEwNjY3MTU1N30.u1pqpPamztil2qaTaY7EahBaiWduVaQ3Wgu2_9CdJlg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-lextria-app': 'PATENT',
    },
  },
});

export const patentDb = supabase.schema('patent');
export const coreDb = supabase.schema('core');
export const litigatorDb = supabase.schema('litigator');

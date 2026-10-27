// frontend/src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://eafciegebhuhoneypsqy.supabase.co';

const serviceRoleKey =
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZmNpZWdlYmh1aG9uZXlwc3F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTA5NTU1NywiZXhwIjoyMTA2NjcxNTU3fQ.rxJJ-BO6bAeJYBu-tonvwxNZ3rh1D5ugjIpQMPk4qNo';

const supabaseKey = serviceRoleKey;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      apikey: supabaseKey,
      'x-lextria-app': 'PATENT',
    },
  },
});

// Dedicated client for core schema to ensure cross-dashboard interconnection without RLS interference
export const coreSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'x-lextria-app': 'PATENT',
    },
  },
});

export const patentDb = supabase.schema('patent');
export const coreDb = coreSupabase.schema('core');
export const litigatorDb = coreSupabase.schema('litigator');

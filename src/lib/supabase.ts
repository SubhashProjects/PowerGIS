// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SUPABASE CLIENT & REACTIVE DATA STORE
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// Safe resolution of environment variables across Vite, browser & Node.js test runners
const getEnvVar = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
  } catch {}
  try {
    const g = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
    if (g && g.process && g.process.env) {
      return g.process.env[key];
    }
  } catch {}
  return undefined;
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL') || 'https://puducherry-powergis.supabase.co';
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy';

export const isSupabaseConfigured = Boolean(
  getEnvVar('VITE_SUPABASE_URL') && getEnvVar('VITE_SUPABASE_ANON_KEY')
);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

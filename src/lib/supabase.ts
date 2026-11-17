// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SUPABASE CLIENT & REACTIVE DATA STORE
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// Safe resolution of environment variables across Vite, browser & Node.js test runners
const getEnvVar = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const val = (import.meta as any).env[key];
      if (val && typeof val === 'string' && !val.includes('YOUR_PROJECT_REF')) {
        return val;
      }
    }
  } catch {}
  try {
    const g = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
    if (g && g.process && g.process.env) {
      const val = g.process.env[key];
      if (val && typeof val === 'string' && !val.includes('YOUR_PROJECT_REF')) {
        return val;
      }
    }
  } catch {}
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(`powergis_${key.toLowerCase()}`) ||
                  window.localStorage.getItem(key.toLowerCase()) ||
                  window.localStorage.getItem(key);
      if (val && typeof val === 'string' && !val.includes('YOUR_PROJECT_REF')) {
        return val;
      }
    }
  } catch {}
  return undefined;
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY
);

// A loopback placeholder prevents accidental traffic to an unintended project.
// All production operations must check isSupabaseConfigured before using this client.
export const supabase = createClient(SUPABASE_URL || 'http://127.0.0.1:54321', SUPABASE_ANON_KEY || 'powergis-not-configured', {
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

export const saveSupabaseConfig = (url: string, anonKey: string): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('powergis_vite_supabase_url', url.trim());
    window.localStorage.setItem('powergis_vite_supabase_anon_key', anonKey.trim());
    window.location.reload();
  }
};

export const clearSupabaseConfig = (): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('powergis_vite_supabase_url');
    window.localStorage.removeItem('powergis_vite_supabase_anon_key');
    window.location.reload();
  }
};

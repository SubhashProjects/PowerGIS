/** Central Supabase client. Only build-time public configuration is trusted. */
import { createClient } from '@supabase/supabase-js';
import { RUNTIME_CONFIG } from '../config/runtimeConfig';

const configuredUrl = RUNTIME_CONFIG.supabaseUrl;
const configuredAnonKey = RUNTIME_CONFIG.supabaseAnonKey;

function isAllowedSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    const isHttps = url.protocol === 'https:';
    const isLocalDevelopment = RUNTIME_CONFIG.isDevelopment &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      url.protocol === 'http:';
    return (isHttps || isLocalDevelopment) && url.username === '' && url.password === '';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  isAllowedSupabaseUrl(configuredUrl) && configuredAnonKey &&
  !configuredAnonKey.includes('YOUR_') && !configuredAnonKey.includes('PLACEHOLDER'),
);

// Keep imports stable in simulator builds without ever targeting a real service.
// All repository/service entry points must check isSupabaseConfigured first.
export const supabase = createClient(
  isSupabaseConfigured ? configuredUrl! : 'https://powergis-not-configured.invalid',
  isSupabaseConfigured ? configuredAnonKey! : 'configuration-required',
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 10 } },
    global: { headers: { 'X-Client-Info': 'powergis-web' } },
  },
);

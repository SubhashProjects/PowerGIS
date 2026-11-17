declare const process: any;

/** Build-time runtime settings. Never accept backend trust roots from browser storage. */
const environment: any = (typeof import.meta !== 'undefined' && (import.meta as any).env)
  ? (import.meta as any).env
  : { DEV: typeof process !== 'undefined' ? process.env?.NODE_ENV !== 'production' : true };

export const RUNTIME_CONFIG = Object.freeze({
  isDevelopment: environment.DEV === true,
  baseUrl: environment.BASE_URL || './',
  supabaseUrl: environment.VITE_SUPABASE_URL?.trim(),
  supabaseAnonKey: environment.VITE_SUPABASE_ANON_KEY?.trim(),
});

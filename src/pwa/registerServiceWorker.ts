import { RUNTIME_CONFIG } from '../config/runtimeConfig';

/** Register the app-shell worker only in secure browser contexts. */
export async function registerPowerGISServiceWorker(): Promise<void> {
  if (RUNTIME_CONFIG.isDevelopment || typeof window === 'undefined' || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  try {
    const base = RUNTIME_CONFIG.baseUrl;
    await navigator.serviceWorker.register(`${base.replace(/\/$/, '')}/powergis-sw.js`, { scope: base });
  } catch (error) {
    // Registration failure must never block application startup.
    console.warn('PowerGIS offline app-shell registration failed:', error);
  }
}

import React, { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, Wifi } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';

export const ConnectionStatus: React.FC = () => {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [checking, setChecking] = useState(false);
  const [backend, setBackend] = useState<'unknown' | 'ok' | 'error'>(isSupabaseConfigured ? 'unknown' : 'ok');

  const checkBackend = async () => {
    if (!isSupabaseConfigured) return;
    setChecking(true);
    try {
      const response = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
      setBackend(response.ok ? 'ok' : 'error');
    } catch {
      // A static Vite/Supabase deployment may not expose /api/health. Keep the
      // browser network state authoritative rather than falsely claiming a backend outage.
      setBackend(online ? 'unknown' : 'error');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    const on = () => { setOnline(true); setBackend(isSupabaseConfigured ? 'unknown' : 'ok'); };
    const off = () => { setOnline(false); setBackend('error'); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const state = !online ? 'Offline' : backend === 'error' ? 'Backend unavailable' : backend === 'ok' ? 'Connected' : 'Online';
  const Icon = !online || backend === 'error' ? CloudOff : checking ? RefreshCw : Wifi;
  return (
    <button type="button" onClick={checkBackend} disabled={checking || !isSupabaseConfigured}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 text-[10px] font-bold text-neutral-700 disabled:cursor-default"
      title={isSupabaseConfigured ? 'Check connectivity' : 'Local/browser connectivity'}>
      <Icon className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} aria-hidden="true" />
      <span className="hidden lg:inline">{state}</span>
    </button>
  );
};

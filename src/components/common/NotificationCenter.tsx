import React, { useEffect, useState } from 'react';
import { Bell, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { persistentNotificationService } from '../../services/persistentNotificationService';
import type { PersistentNotification } from '../../repositories/domain/NotificationRepository';

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<PersistentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = async () => { setLoading(true); setError(null); try { setItems(await persistentNotificationService.list(user.id)); } catch (e: any) { setError(e?.message || 'Unable to load notifications.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [user.id]);
  const unread = items.filter(n => !n.read_at).length;
  return <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
    <div className="flex items-center justify-between border-b border-neutral-200 pb-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-md bg-neutral-900 text-white flex items-center justify-center"><Bell className="w-4 h-4" /></div><div><h1 className="text-lg font-bold">Notifications</h1><p className="text-xs">Persistent operational notifications · {unread} unread</p></div></div><div className="flex gap-2"><button onClick={() => void load()} className="px-3 py-2 border border-neutral-200 rounded-md text-xs font-bold"><RefreshCw className="w-3.5 h-3.5 inline mr-1" />Refresh</button><button onClick={() => void persistentNotificationService.markAllRead(user.id).then(load)} className="px-3 py-2 border border-neutral-200 rounded-md text-xs font-bold"><Check className="w-3.5 h-3.5 inline mr-1" />Mark all read</button></div></div>
    {error && <div className="p-3 border border-neutral-300 bg-neutral-50 rounded-md text-xs">{error}</div>}
    {loading ? <div className="p-6 text-xs">Loading notifications…</div> : items.length === 0 ? <div className="p-8 border border-neutral-200 rounded-md bg-white text-xs">No persistent notifications.</div> : <div className="space-y-2">{items.map(n => <button key={n.id} onClick={() => void persistentNotificationService.markRead(n.id).then(load)} className={`w-full text-left p-4 border rounded-md bg-white ${n.read_at ? 'border-neutral-200' : 'border-neutral-400'}`}><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-tight">{n.priority}</div><div className="text-sm font-bold mt-1">{n.title}</div><div className="text-xs mt-1">{n.message}</div></div><div className="text-[10px] whitespace-nowrap">{new Date(n.created_at).toLocaleString()}</div></div></button>)}</div>}
  </div>;
};

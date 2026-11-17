import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle, Clock3, Trash2, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import { offlineQueue } from '../../lib/offlineQueue';
import { offlineMutationQueue, OfflineMutation } from '../../lib/offlineMutationQueue';
import { offlineMutationProcessor } from '../../lib/offlineMutationProcessor';

const when = (value?: string) => value ? new Date(value).toLocaleString() : 'Not attempted';
export const SyncCenter: React.FC = () => {
  const [surveyCount, setSurveyCount] = useState(offlineQueue.getUnsyncedCount());
  const [items, setItems] = useState<OfflineMutation[]>(offlineMutationQueue.list());
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [storageError, setStorageError] = useState('');
  const summary = useMemo(() => ({ pending: items.filter(i => i.status === 'pending').length, syncing: items.filter(i => i.status === 'syncing').length, failed: items.filter(i => i.status === 'failed').length, blocked: items.filter(i => i.status === 'blocked').length, synced: items.filter(i => i.status === 'synced').length }), [items]);
  const totalAttention = surveyCount + summary.pending + summary.syncing + summary.failed + summary.blocked;
  useEffect(() => { void offlineMutationQueue.ready().then(() => { setStorageError(''); setItems(offlineMutationQueue.list()); }).catch(error => setStorageError(String((error as { message?: string })?.message ?? error))); return offlineMutationQueue.subscribe(setItems); }, []);
  useEffect(() => offlineQueue.subscribe(setSurveyCount), []);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  useEffect(() => { if (online) void offlineMutationProcessor.process().then(() => setItems(offlineMutationQueue.list())).catch(() => undefined); }, [online]);
  useEffect(() => { const timer = window.setInterval(() => { const now = Date.now(); const due = offlineMutationQueue.list().some(item => item.status === 'failed' && (!item.nextAttemptAt || Date.parse(item.nextAttemptAt) <= now)); if (online && due) void offlineMutationProcessor.process().then(() => setItems(offlineMutationQueue.list())).catch(() => undefined); }, 15000); return () => window.clearInterval(timer); }, [online]);
  const sync = useCallback(async () => { setBusy(true); try { await offlineQueue.attemptAutoSync(); await offlineMutationProcessor.process(); setItems(offlineMutationQueue.list()); } finally { setBusy(false); } }, []);
  const retry = async (id: string) => { await offlineMutationQueue.retry(id); setItems(offlineMutationQueue.list()); };
  const retryFailed = async () => { setBusy(true); try { await offlineMutationQueue.retryAllFailed(); await sync(); } finally { setBusy(false); } };
  const remove = async (item: OfflineMutation) => { if (item.status === 'syncing') return; await offlineMutationQueue.remove(item.id); };
  return <section className="border-b border-neutral-200 bg-white text-xs" aria-label="Synchronization center">
    <div className="flex min-h-9 flex-wrap items-center gap-2 px-3 py-1.5">
      {online ? <Wifi className="h-3.5 w-3.5 text-neutral-700" /> : <WifiOff className="h-3.5 w-3.5 text-neutral-700" />}
      <span className="font-bold">{online ? 'Online' : 'Offline'}</span>
      <span className="text-neutral-600">{totalAttention ? `${totalAttention} operation${totalAttention === 1 ? '' : 's'} awaiting attention or sync` : 'All queues synchronized'}</span>
      {summary.failed + summary.blocked > 0 && <span className="font-bold">{summary.failed} failed · {summary.blocked} blocked</span>}
      <div className="ml-auto flex items-center gap-1">
        <button type="button" onClick={() => setExpanded(value => !value)} className="inline-flex items-center gap-1 rounded border border-neutral-200 px-2 py-1 font-bold hover:bg-neutral-50" aria-expanded={expanded}>{expanded ? 'Hide details' : 'Sync details'} {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</button>
        <button type="button" onClick={() => void retryFailed()} disabled={busy || !(summary.failed + summary.blocked)} className="rounded border border-neutral-200 px-2 py-1 font-bold hover:bg-neutral-50 disabled:opacity-40">Retry failed</button>
        <button type="button" onClick={() => void sync()} disabled={busy || !online} className="inline-flex items-center gap-1 rounded border border-neutral-300 px-2 py-1 font-bold hover:bg-neutral-50 disabled:opacity-40"><RefreshCw className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} />Sync now</button>
      </div>
    </div>
    {storageError && <div className="flex items-start gap-2 border-t border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-800"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span><strong>Durable offline storage unavailable.</strong> Offline operational commands cannot be queued in this browser. {storageError}</span></div>}
    {expanded && <div className="border-t border-neutral-100 px-3 py-3">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {([['Pending', summary.pending], ['Syncing', summary.syncing], ['Failed', summary.failed], ['Blocked', summary.blocked], ['Synced', summary.synced]] as const).map(([label, value]) => <div key={label} className="rounded border border-neutral-200 px-2 py-2"><div className="text-neutral-500">{label}</div><div className="text-base font-bold tabular-nums">{value}</div></div>)}
      </div>
      {items.length === 0 ? <div className="py-4 text-center text-neutral-500"><CheckCircle2 className="mx-auto mb-1 h-5 w-5" />No operational mutations in the durable queue.</div> : <div className="max-h-72 overflow-auto rounded border border-neutral-200">
        {items.slice().sort((a,b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).map(item => <div key={item.id} className="flex flex-col gap-2 border-b border-neutral-100 px-3 py-2 last:border-b-0 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-bold">{item.operationType}</span><span className="rounded border border-neutral-200 px-1.5 py-0.5 uppercase">{item.status}</span>{item.errorCode && <span className="font-bold">{item.errorCode}</span>}</div><div className="mt-1 text-neutral-600">{item.entityType}{item.entityId ? ` · ${item.entityId}` : ''} · {when(item.lastAttemptAt || item.createdAt)}</div>{item.errorCode === 'CONCURRENCY_CONFLICT' && <div className="mt-1 font-bold text-neutral-800">Review the current server record in its module, remove this stale queued command, then reapply the intended change.</div>}{item.lastError && <div className="mt-1 flex items-start gap-1 text-neutral-700"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /><span className="break-words">{item.lastError}</span></div>}{item.nextAttemptAt && item.status === 'failed' && <div className="mt-1 flex items-center gap-1 text-neutral-500"><Clock3 className="h-3 w-3" />Next retry after {when(item.nextAttemptAt)}</div>}</div>
          <div className="flex shrink-0 items-center gap-1">{(item.status === 'failed' || (item.status === 'blocked' && item.errorCode !== 'CONCURRENCY_CONFLICT')) && <button type="button" onClick={() => void retry(item.id)} className="inline-flex items-center gap-1 rounded border border-neutral-200 px-2 py-1 font-bold hover:bg-neutral-50"><RotateCcw className="h-3 w-3" />Retry</button>}<button type="button" onClick={() => void remove(item)} disabled={item.status === 'syncing'} aria-label={`Remove ${item.operationType}`} title="Remove queued operation" className="rounded border border-neutral-200 p-1.5 hover:bg-neutral-50 disabled:opacity-40"><Trash2 className="h-3 w-3" /></button></div>
        </div>)}
      </div>}
      <p className="mt-2 text-neutral-500">Operational mutations are stored in IndexedDB before queue confirmation. Conflict-blocked operations require review; they are never automatically overwritten.</p>
    </div>}
  </section>;
};

import React, { useEffect, useState } from 'react';
import { RefreshCw, CloudOff, CheckCircle2 } from 'lucide-react';
import { offlineQueue } from '../../lib/offlineQueue';
import { offlineMutationQueue } from '../../lib/offlineMutationQueue';
import { offlineMutationProcessor } from '../../lib/offlineMutationProcessor';

export const SyncCenter: React.FC = () => {
  const [count, setCount] = useState(offlineQueue.getUnsyncedCount());
  const [busy, setBusy] = useState(false);
  const [mutationSummary, setMutationSummary] = useState(offlineMutationQueue.summary());
  useEffect(() => { const timer = window.setInterval(() => setMutationSummary(offlineMutationQueue.summary()), 1500); return () => window.clearInterval(timer); }, []);
  useEffect(() => offlineQueue.subscribe(setCount), []);
  const sync = async () => { setBusy(true); try { await offlineQueue.attemptAutoSync(); await offlineMutationProcessor.process(); setMutationSummary(offlineMutationQueue.summary()); } finally { setBusy(false); } };
  const retryFailed = () => { offlineMutationQueue.list().filter(item => item.status === 'failed' || item.status === 'blocked').forEach(item => offlineMutationQueue.retry(item.id)); setMutationSummary(offlineMutationQueue.summary()); };
  return <div className="flex items-center gap-2 px-4 py-1.5 border-b border-neutral-100 bg-white text-xs">
    {count || mutationSummary.pending || mutationSummary.failed || mutationSummary.blocked ? <><CloudOff className="w-3.5 h-3.5" /><span className="font-bold">{count + mutationSummary.pending + mutationSummary.failed + mutationSummary.blocked} offline operation{count + mutationSummary.pending + mutationSummary.failed + mutationSummary.blocked === 1 ? '' : 's'} pending, failed, or blocked</span><button onClick={retryFailed} disabled={busy} className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded border border-neutral-200 font-bold hover:bg-neutral-50 disabled:opacity-50">Retry failed</button><button onClick={() => void sync()} disabled={busy} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-neutral-200 font-bold hover:bg-neutral-50 disabled:opacity-50"><RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} />Sync now</button></> : <><CheckCircle2 className="w-3.5 h-3.5" /><span>Offline queue clear</span></>}
  </div>;
};

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Search, CheckCircle2 } from 'lucide-react';
import { getDataQualityIssues, type DataQualityIssue } from '../../services/dataQualityService';

export const DataQualityCenter: React.FC = () => {
  const [issues, setIssues] = useState<DataQualityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState<'all' | DataQualityIssue['severity']>('all');

  const refresh = async () => {
    setLoading(true);
    try { setIssues(await getDataQualityIssues()); } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const filtered = useMemo(() => issues.filter(issue => {
    const matchesSeverity = severity === 'all' || issue.severity === severity;
    const haystack = `${issue.entity} ${issue.recordId ?? ''} ${issue.message}`.toLowerCase();
    return matchesSeverity && haystack.includes(query.toLowerCase());
  }), [issues, query, severity]);

  const counts = {
    critical: issues.filter(i => i.severity === 'critical').length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
  };

  return <section className="p-4 md:p-6 space-y-5">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div><h1 className="text-lg font-bold text-neutral-950">Data Quality Center</h1><p className="text-sm text-neutral-600 mt-1">Operational data validation across network, field, stores and safety records.</p></div>
      <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-neutral-300 rounded-md text-sm font-bold bg-white hover:bg-neutral-50 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh checks</button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {(['critical','high','medium'] as const).map(level => <button key={level} onClick={() => setSeverity(severity === level ? 'all' : level)} className="text-left border border-neutral-200 rounded-md bg-white p-4 hover:bg-neutral-50">
        <div className="text-xs font-bold capitalize text-neutral-600">{level}</div><div className="text-2xl font-bold text-neutral-950 mt-1">{counts[level]}</div>
      </button>)}
    </div>
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search entity, record or issue" className="w-full h-9 pl-9 pr-3 border border-neutral-300 rounded-md text-sm bg-white" /></div>
      <select value={severity} onChange={e => setSeverity(e.target.value as any)} className="h-9 px-3 border border-neutral-300 rounded-md text-sm bg-white"><option value="all">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option></select>
    </div>
    <div className="border border-neutral-200 rounded-md bg-white overflow-hidden">
      {loading ? <div className="p-8 text-center text-sm text-neutral-600">Running data-quality checks…</div> : filtered.length === 0 ? <div className="p-10 text-center"><CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-neutral-700" /><div className="font-bold text-neutral-950">No issues found</div><div className="text-sm text-neutral-600 mt-1">The current validation set is clean.</div></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-neutral-200 bg-neutral-50 text-left"><th className="px-4 py-3 font-bold">Severity</th><th className="px-4 py-3 font-bold">Entity</th><th className="px-4 py-3 font-bold">Record</th><th className="px-4 py-3 font-bold">Issue</th></tr></thead><tbody>{filtered.map(issue => <tr key={issue.id} className="border-b border-neutral-100 last:border-b-0"><td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 font-bold capitalize"><AlertTriangle className="w-3.5 h-3.5" />{issue.severity}</span></td><td className="px-4 py-3 font-medium">{issue.entity}</td><td className="px-4 py-3 font-mono text-xs">{issue.recordId ?? '—'}</td><td className="px-4 py-3 text-neutral-700">{issue.message}</td></tr>)}</tbody></table></div>}
    </div>
  </section>;
};

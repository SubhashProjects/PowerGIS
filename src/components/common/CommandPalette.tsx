import React, { useEffect, useRef, useState } from 'react';
import { Command, Search, ArrowRight, MapPin, Loader2 } from 'lucide-react';
import { NAVIGATION_ITEMS, NavTabId } from '../../config/navigationConfig';
import { globalSearch, GlobalSearchResult } from '../../services/globalSearchService';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTabId) => void;
  onSelectAsset: (asset: any) => void;
}

const categoryToTab: Partial<Record<GlobalSearchResult['category'], NavTabId>> = {
  Asset: 'assets', Fault: 'faults', 'Work Order': 'work_orders', Permit: 'safety_ptw', Outage: 'outages',
  Survey: 'survey_approvals', Store: 'stores', Project: 'capital_projects', Maintenance: 'preventive', Disaster: 'disaster',
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onNavigate, onSelectAsset }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery(''); setResults([]);
    window.setTimeout(() => inputRef.current?.focus(), 0);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); setSearching(false); return; }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try { const next = await globalSearch(query); if (!cancelled) setResults(next); }
      finally { if (!cancelled) setSearching(false); }
    }, 180);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [open, query]);

  if (!open) return null;
  const q = query.trim().toLowerCase();
  const modules = NAVIGATION_ITEMS.filter(item => !q || `${item.label} ${item.description}`.toLowerCase().includes(q)).slice(0, 8);
  const grouped = results.reduce<Record<string, GlobalSearchResult[]>>((acc, result) => {
    (acc[result.category] ||= []).push(result); return acc;
  }, {});

  const selectResult = (result: GlobalSearchResult) => {
    const tab = categoryToTab[result.category];
    if (tab) onNavigate(tab);
    if (result.category === 'Asset' && result.record) onSelectAsset(result.record);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/20 px-3 pt-[10vh]" role="dialog" aria-modal="true" aria-label="PowerGIS command palette">
      <button className="absolute inset-0 cursor-default" aria-label="Close command palette" onClick={onClose} />
      <div className="relative w-full max-w-3xl overflow-hidden rounded-md border border-neutral-200 bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
          <Command className="h-4 w-4 text-neutral-600" aria-hidden="true" />
          <Search className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search modules, assets, faults, work orders, outages, PTWs and more" className="h-8 flex-1 border-0 bg-transparent text-sm outline-none" aria-label="Search PowerGIS" />
          {searching && <Loader2 className="h-4 w-4 animate-spin text-neutral-500" aria-label="Searching" />}
          <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-[10px] font-bold text-neutral-600">ESC</kbd>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-2 overscroll-contain">
          {modules.length > 0 && <div className="mb-2"><div className="px-2 py-1 text-[10px] font-bold text-neutral-500">Modules</div>{modules.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => { onNavigate(item.id); onClose(); }} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-neutral-100"><Icon className="h-4 w-4 flex-none" /><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-neutral-900">{item.label}</span><span className="block truncate text-[10px] text-neutral-600">{item.description}</span></span><ArrowRight className="h-3.5 w-3.5 text-neutral-400" /></button>; })}</div>}
          {Object.entries(grouped).map(([category, categoryResults]) => <div key={category} className="mb-2"><div className="px-2 py-1 text-[10px] font-bold text-neutral-500">{category}</div>{categoryResults.map(result => <button key={`${result.category}-${result.id}`} onClick={() => selectResult(result)} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-neutral-100"><MapPin className="h-4 w-4 flex-none" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-neutral-900">{result.title}</span><span className="block truncate text-[10px] text-neutral-600">{result.subtitle}</span></span><ArrowRight className="h-3.5 w-3.5 text-neutral-400" /></button>)}</div>)}
          {q.length >= 2 && !searching && modules.length === 0 && results.length === 0 && <div className="px-4 py-10 text-center text-xs text-neutral-600">No records or modules match your search.</div>}
          {q.length < 2 && <div className="px-4 py-8 text-center text-xs text-neutral-600">Search the PowerGIS workspace. Results are grouped by operational record type.</div>}
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-4 py-2 text-[10px] text-neutral-500"><span>Modules + operational records</span><span>Ctrl + K</span></div>
      </div>
    </div>
  );
};

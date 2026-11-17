import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ClipboardCheck, Clock3, Search, ShieldCheck } from 'lucide-react';
import { assetService } from '../../services/assetService';
import type { EquipmentLifecycleRecord } from '../../types/assets';

const priorities: EquipmentLifecycleRecord['replacementPriority'][] = ['Critical', 'High', 'Medium', 'Low'];
type AssetChoice = { id: string; code: string; name: string; type: string; installationDate: string; sectionId: string };

export const AssetLifecycleManagement: React.FC = () => {
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [score, setScore] = useState(85);
  const [priority, setPriority] = useState<EquipmentLifecycleRecord['replacementPriority']>('Low');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [registerAssetId, setRegisterAssetId] = useState('');
  const [installDate, setInstallDate] = useState('');
  const [lifeYears, setLifeYears] = useState(25);
  const [newScore, setNewScore] = useState(85);

  useEffect(() => {
    void assetService.loadFromSupabase().catch(e => setError(e?.message || 'Unable to load asset registry.'));
    return assetService.subscribe(() => setRevision(v => v + 1));
  }, []);

  const assets = useMemo<AssetChoice[]>(() => [
    ...assetService.getSubstations().map(a => ({ id: a.id, code: a.code, name: a.name, type: 'Substation', installationDate: a.commissionDate, sectionId: a.sectionId || '' })),
    ...assetService.getFeeders().map(a => ({ id: a.id, code: a.code, name: a.name, type: 'Feeder', installationDate: '', sectionId: a.sectionId || '' })),
    ...assetService.getTransformers().map(a => ({ id: a.id, code: a.code, name: a.name, type: 'Transformer', installationDate: a.installationDate, sectionId: a.sectionId || '' })),
    ...assetService.getPoles().map(a => ({ id: a.id, code: a.code, name: a.poleNumber || a.code, type: 'Pole', installationDate: a.installationDate, sectionId: a.sectionId || '' })),
  ], [revision]);
  const lifecycles = assetService.getLifecycles();
  const filtered = lifecycles.filter(item => `${item.assetCode} ${item.assetType}`.toLowerCase().includes(query.toLowerCase()));
  const selected = lifecycles.find(item => item.id === selectedId) || filtered[0];
  const unregistered = assets.filter(asset => !lifecycles.some(item => item.assetId === asset.id));

  useEffect(() => {
    if (selected) {
      setSelectedId(selected.id);
      setScore(selected.conditionScore);
      setPriority(selected.replacementPriority);
      setNotes('');
      void assetService.getLifecycleHistory(selected.id).then(setHistory).catch(() => setHistory([]));
    } else setHistory([]);
  }, [selected?.id, revision]);

  const submitAssessment = async () => {
    if (!selected) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await assetService.assessLifecycle(selected.id, score, priority, notes);
      setMessage('Condition assessment saved and added to lifecycle history.');
      setNotes('');
      setHistory(await assetService.getLifecycleHistory(selected.id));
    } catch (e: any) { setError(e?.message || 'Assessment could not be saved.'); }
    finally { setSaving(false); }
  };

  const registerLifecycle = async () => {
    const asset = assets.find(item => item.id === registerAssetId);
    if (!asset || !installDate || lifeYears < 1) { setError('Choose an asset, installation date, and a design life of at least one year.'); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      await assetService.registerLifecycle({ assetType: asset.type, assetId: asset.id, assetCode: asset.code, installationDate: installDate, expectedLifeYears: lifeYears, conditionScore: newScore, replacementPriority: 'Low', sectionId: asset.sectionId });
      setMessage(`Lifecycle record created for ${asset.code}.`); setRegisterAssetId(''); setInstallDate('');
    } catch (e: any) { setError(e?.message || 'Lifecycle registration failed.'); }
    finally { setSaving(false); }
  };

  const critical = lifecycles.filter(item => item.replacementPriority === 'Critical' || item.isExpired).length;
  const assessed = lifecycles.filter(item => item.conditionScore > 0).length;

  return <main className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 text-neutral-900">
    <header className="border rounded-md bg-white p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-md bg-neutral-900 text-white flex items-center justify-center"><Activity className="w-5 h-5" /></div><div><h1 className="font-bold">Asset Lifecycle Management</h1><p className="text-xs text-neutral-500">Canonical asset lifecycle, condition assessment and replacement planning</p></div></header>
    {error && <div role="alert" className="border rounded-md p-3 text-sm">{error}</div>}{message && <div role="status" className="border rounded-md p-3 text-sm">{message}</div>}
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Metric label="Lifecycle records" value={lifecycles.length} detail="Backend lifecycle register" />
      <Metric label="Critical / expired" value={critical} detail="Requires engineering review" />
      <Metric label="Condition assessed" value={assessed} detail="Records with a condition score" />
    </section>
    <section className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div className="xl:col-span-3 border rounded-md bg-white p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between"><h2 className="font-bold text-sm">Asset lifecycle register</h2><div className="relative"><Search className="absolute left-2 top-2.5 w-4 h-4 text-neutral-400"/><input aria-label="Search lifecycle records" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search asset code or type" className="border rounded-md pl-8 pr-3 py-2 text-xs w-full sm:w-60" /></div></div>
        <div className="overflow-x-auto border rounded-md"><table className="pg-data-table w-full text-xs"><thead className="bg-neutral-50"><tr>{['Asset','Installed','Age / Design life','Condition','Replacement',''].map(x => <th key={x} className="p-2 text-left whitespace-nowrap">{x}</th>)}</tr></thead><tbody className="divide-y">{filtered.map(item => <tr key={item.id} className={selected?.id === item.id ? 'bg-neutral-50' : ''}><td className="p-2"><button className="font-bold underline" onClick={() => setSelectedId(item.id)}>{item.assetCode}</button><div className="text-neutral-500">{item.assetType}</div></td><td className="p-2 whitespace-nowrap">{item.installationDate || '—'}</td><td className="p-2 whitespace-nowrap">{item.currentAgeYears.toFixed(1)} / {item.expectedLifeYears} yrs</td><td className="p-2">{item.conditionScore}/100</td><td className="p-2">{item.replacementPriority}{item.isExpired ? ' · Life exceeded' : ''}</td><td className="p-2"><button className="underline" onClick={() => setSelectedId(item.id)}>Assess</button></td></tr>)}{filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-neutral-500">No lifecycle records match this search.</td></tr>}</tbody></table></div>
        <p className="text-[11px] text-neutral-500">Asset identification uses the canonical asset code and ID. QR/barcode scanning and physical label printing are not enabled in this release.</p>
      </div>
      <div className="xl:col-span-2 border rounded-md bg-white p-4 space-y-3">
        <div className="flex items-center gap-2"><ClipboardCheck className="w-4 h-4"/><h2 className="font-bold text-sm">Condition assessment</h2></div>
        {selected ? <><div className="border rounded-md p-3"><div className="font-bold">{selected.assetCode}</div><div className="text-xs text-neutral-500">{selected.assetType} · {selected.assetId}</div></div>
          <label className="block text-xs font-semibold">Condition score (0–100)<div className="flex items-center gap-3 mt-2"><input type="range" min="0" max="100" value={score} onChange={e => setScore(Number(e.target.value))} className="w-full"/><b className="w-10 text-right">{score}</b></div></label>
          <label className="block text-xs font-semibold">Replacement priority<select value={priority} onChange={e => setPriority(e.target.value as EquipmentLifecycleRecord['replacementPriority'])} className="mt-1 w-full border rounded-md p-2 bg-white">{priorities.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="block text-xs font-semibold">Assessment notes<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={2000} placeholder="Inspection findings, defects, evidence reference…" className="mt-1 w-full border rounded-md p-2 font-normal"/></label>
          <button disabled={saving} onClick={submitAssessment} className="w-full rounded-md bg-neutral-900 text-white p-2 text-xs font-bold disabled:opacity-50">{saving ? 'Saving…' : 'Save assessment'}</button>
          <div className="border-t pt-3"><h3 className="font-bold text-xs mb-2">Recent assessment history</h3>{history.length ? <ul className="space-y-2 max-h-44 overflow-y-auto">{history.map(event => <li key={event.id} className="text-xs border-b pb-2"><div className="font-semibold">{event.event_type} · {event.condition_score}/100 · {event.replacement_priority}</div><div className="text-neutral-500">{new Date(event.created_at).toLocaleString()}</div>{event.notes && <p className="mt-1">{event.notes}</p>}</li>)}</ul> : <p className="text-xs text-neutral-500">No assessment history recorded.</p>}</div>
        </> : <p className="text-xs text-neutral-500">Select a lifecycle record to assess.</p>}
      </div>
    </section>
    <section className="border rounded-md bg-white p-4 space-y-3"><div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4"/><h2 className="font-bold text-sm">Register asset lifecycle</h2></div><p className="text-xs text-neutral-500">Creates a lifecycle record against an existing canonical asset. It does not create a duplicate asset or change the asset's operational status.</p><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"><label className="text-xs font-semibold lg:col-span-2">Existing asset<select value={registerAssetId} onChange={e => setRegisterAssetId(e.target.value)} className="mt-1 w-full border rounded-md p-2 bg-white"><option value="">Select asset…</option>{unregistered.map(a => <option key={a.id} value={a.id}>{a.code} · {a.type} · {a.name}</option>)}</select></label><label className="text-xs font-semibold">Installation date<input type="date" value={installDate} onChange={e => setInstallDate(e.target.value)} className="mt-1 w-full border rounded-md p-2"/></label><label className="text-xs font-semibold">Design life (years)<input type="number" min="1" max="100" value={lifeYears} onChange={e => setLifeYears(Number(e.target.value))} className="mt-1 w-full border rounded-md p-2"/></label><label className="text-xs font-semibold">Initial condition<input type="number" min="0" max="100" value={newScore} onChange={e => setNewScore(Number(e.target.value))} className="mt-1 w-full border rounded-md p-2"/></label></div><button disabled={saving || !registerAssetId} onClick={registerLifecycle} className="rounded-md bg-neutral-900 text-white px-4 py-2 text-xs font-bold disabled:opacity-50">{saving ? 'Saving…' : 'Register lifecycle'}</button></section>
    <p className="text-[11px] text-neutral-500 flex items-center gap-2"><Clock3 className="w-3.5 h-3.5"/>Replacement priority is a planning input, not an automatic engineering approval. Field inspection and authorised review remain mandatory.</p>
  </main>;
};

const Metric: React.FC<{ label: string; value: number; detail: string }> = ({ label, value, detail }) => <div className="border rounded-md bg-white p-3"><div className="text-xs text-neutral-500">{label}</div><div className="text-2xl font-bold tabular-nums">{value}</div><div className="text-[11px] text-neutral-500">{detail}</div></div>;

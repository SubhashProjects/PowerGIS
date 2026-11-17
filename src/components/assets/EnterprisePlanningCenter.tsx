import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Calculator, ClipboardList, Package, Printer, RefreshCw, ShieldCheck } from 'lucide-react';
import { assetService } from '../../services/assetService';
import { storesService } from '../../services/storesService';
import { workOrderService } from '../../services/workOrderService';
import { isSupabaseConfigured } from '../../lib/supabase';
import { buildAssetLabelPayload, buildPlanningRecommendations, calculateStraightLineDepreciation, type PlanningRecommendation } from '../../services/enterprisePlanningService';
import type { StoresItem, WorkOrder } from '../../types/operations';
import type { EquipmentLifecycleRecord } from '../../types/assets';

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export const EnterprisePlanningCenter: React.FC = () => {
  const [lifecycles, setLifecycles] = useState<EquipmentLifecycleRecord[]>([]);
  const [warranties, setWarranties] = useState<ReturnType<typeof assetService.getWarranties>>([]);
  const [inventory, setInventory] = useState<StoresItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [cost, setCost] = useState('100000');
  const [residual, setResidual] = useState('10000');
  const [life, setLife] = useState('15');
  const [age, setAge] = useState('5');

  const refresh = async () => {
    setLoading(true); setError('');
    try {
      await assetService.loadFromSupabase();
      setLifecycles(assetService.getLifecycles());
      setWarranties(assetService.getWarranties());
      if (isSupabaseConfigured) {
        const [stock, orders] = await Promise.all([storesService.listItems(), workOrderService.list()]);
        setInventory(stock); setWorkOrders(orders);
      } else { setInventory([]); setWorkOrders([]); }
    } catch (e: any) { setError(e?.message || 'Unable to load planning data.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const recommendations = useMemo(() => buildPlanningRecommendations({ lifecycles, warranties, inventory, workOrders }), [lifecycles, warranties, inventory, workOrders]);
  const selected = lifecycles.find(item => item.id === selectedId) ?? lifecycles[0];
  const depreciation = useMemo(() => {
    try { return calculateStraightLineDepreciation({ acquisitionCostINR: Number(cost), residualValueINR: Number(residual), usefulLifeYears: Number(life), ageYears: Number(age) }); }
    catch { return null; }
  }, [cost, residual, life, age]);
  const counts = useMemo(() => ({ critical: recommendations.filter(r => r.priority === 'Critical').length, high: recommendations.filter(r => r.priority === 'High').length, expired: lifecycles.filter(r => r.isExpired).length, lowStock: inventory.filter(r => r.currentStock <= r.reorderLevel).length }), [recommendations, lifecycles, inventory]);

  const printLabel = (item: EquipmentLifecycleRecord) => {
    const payload = buildAssetLabelPayload(item);
    const popup = window.open('', '_blank', 'width=520,height=420');
    if (!popup) { setError('Allow pop-ups to print the asset identification label.'); return; }
    popup.document.write(`<!doctype html><html><head><title>Asset label ${item.assetCode}</title><style>body{font:14px Arial;padding:24px;color:#111}.label{border:2px solid #111;padding:20px;max-width:360px}h1{font-size:18px;margin:0 0 12px}.code{font-size:22px;font-weight:bold;letter-spacing:1px;overflow-wrap:anywhere}.meta{margin:8px 0;font-size:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere;border-top:1px solid #aaa;padding-top:10px;font-size:10px}@media print{button{display:none}}</style></head><body><div class="label"><h1>POWERGIS ASSET</h1><div class="code">${item.assetCode.replace(/[&<>"']/g, '')}</div><div class="meta">${item.assetType.replace(/[&<>"']/g, '')}</div><div class="meta">Canonical asset ID: ${item.assetId.replace(/[&<>"']/g, '')}</div><pre>${payload.replace(/[&<>"']/g, '')}</pre><button onclick="window.print()">Print label</button></div></body></html>`);
    popup.document.close();
  };

  const recommendationAction = (item: PlanningRecommendation) => {
    const tab = item.actionTab;
    window.dispatchEvent(new CustomEvent('powergis:navigate', { detail: { tab } }));
  };

  return <div className="mx-auto max-w-7xl space-y-4 p-3 text-neutral-900 sm:p-6">
    <header className="flex flex-col justify-between gap-3 rounded-md border bg-white p-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-md border bg-neutral-50"><Activity className="h-5 w-5"/></div><div><h1 className="font-bold">Enterprise Planning & Intelligence</h1><p className="text-xs text-neutral-500">Integrated lifecycle, maintenance, inventory, reliability and financial planning</p></div></div><button onClick={() => void refresh()} className="flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold"><RefreshCw className="h-3.5 w-3.5"/>Refresh data</button></header>
    {error && <div role="alert" className="rounded-md border p-3 text-xs">{error}</div>}
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{[['Critical actions',counts.critical],['High priority',counts.high],['Expired assets',counts.expired],['Reorder alerts',counts.lowStock]].map(([label,value])=><div key={String(label)} className="rounded-md border bg-white p-3"><div className="text-xs text-neutral-500">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>)}</div>
    <section className="space-y-3 rounded-md border bg-white p-4"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4"/><h2 className="text-sm font-bold">Explainable operational recommendations</h2></div><p className="text-xs text-neutral-500">Rule-based prioritisation from loaded records. These are decision-support prompts, not autonomous switching, engineering approvals or AI predictions.</p>{loading ? <p className="p-6 text-center text-xs text-neutral-500">Loading operational records…</p> : recommendations.length === 0 ? <p className="p-6 text-center text-xs text-neutral-500">No actionable exceptions were found in the currently loaded records.</p> : <div className="divide-y">{recommendations.map(item=><div key={item.id} className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded border px-2 py-0.5 text-[10px] font-bold">{item.priority}</span><span className="text-[10px] text-neutral-500">{item.category}</span></div><div className="mt-1 text-xs font-bold">{item.title}</div><p className="mt-1 text-xs text-neutral-600">{item.detail}</p></div><button onClick={() => recommendationAction(item)} className="shrink-0 self-start rounded-md border px-3 py-2 text-xs underline">Open module</button></div>)}</div>}</section>
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-md border bg-white p-4"><div className="flex items-center gap-2"><Calculator className="h-4 w-4"/><h2 className="text-sm font-bold">Straight-line depreciation planner</h2></div><p className="text-xs text-neutral-500">Illustrative calculation only. Enter verified acquisition cost, residual value, useful life and age; this does not post accounting entries.</p><div className="grid grid-cols-2 gap-3">{[['Acquisition cost (₹)',cost,setCost],['Residual value (₹)',residual,setResidual],['Useful life (years)',life,setLife],['Asset age (years)',age,setAge]].map(([label,value,setter])=><label key={String(label)} className="text-xs font-semibold">{label as string}<input type="number" min="0" step="any" value={value as string} onChange={e => (setter as (v:string)=>void)(e.target.value)} className="mt-1 w-full rounded-md border p-2 text-xs font-normal"/></label>)}</div>{depreciation ? <div className="grid grid-cols-2 gap-2 border-t pt-3"><div><div className="text-[10px] text-neutral-500">Annual depreciation</div><div className="font-bold">{money(depreciation.annualDepreciationINR)}</div></div><div><div className="text-[10px] text-neutral-500">Estimated book value</div><div className="font-bold">{money(depreciation.estimatedBookValueINR)}</div></div><div className="text-xs text-neutral-600">Accumulated: {money(depreciation.accumulatedDepreciationINR)}</div><div className="text-xs text-neutral-600">Remaining life: {depreciation.remainingLifeYears.toFixed(1)} years</div></div> : <p className="text-xs">Enter valid financial inputs. Residual value must not exceed acquisition cost.</p>}</div>
      <div className="space-y-3 rounded-md border bg-white p-4"><div className="flex items-center gap-2"><ClipboardList className="h-4 w-4"/><h2 className="text-sm font-bold">Asset identification labels</h2></div><p className="text-xs text-neutral-500">Generate printable human-readable labels from canonical asset IDs. This is not a QR/barcode scanner or QR image generator.</p><label className="block text-xs font-semibold">Lifecycle asset<select value={selected?.id ?? ''} onChange={e=>setSelectedId(e.target.value)} className="mt-1 w-full rounded-md border bg-white p-2 text-xs"><option value="">Select asset</option>{lifecycles.map(item=><option key={item.id} value={item.id}>{item.assetCode} · {item.assetType}</option>)}</select></label>{selected ? <div className="rounded-md border p-3"><div className="text-lg font-bold">{selected.assetCode}</div><div className="text-xs text-neutral-500">{selected.assetType} · {selected.assetId}</div><button onClick={()=>printLabel(selected)} className="mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold"><Printer className="h-3.5 w-3.5"/>Print asset label</button></div> : <p className="p-4 text-xs text-neutral-500">No lifecycle asset selected.</p>}</div>
    </section>
    <section className="rounded-md border bg-white p-4"><div className="mb-3 flex items-center gap-2"><Package className="h-4 w-4"/><h2 className="text-sm font-bold">Release integration coverage</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['3.18 Asset lifecycle','Existing canonical lifecycle + assessment history'],['3.19 Workforce','Existing work orders, assignment and staged verification'],['3.20 Reliability','Existing fault/outage records and reliability calculations'],['3.21 Inventory','Existing stock ledger and idempotent issue transactions'],['3.22 Finance','Straight-line depreciation planning calculator; no ledger posting'],['3.23 GIS intelligence','Existing network tracing, phase coverage and data quality'],['3.24 Governance','Existing RBAC, RLS, audit and approval controls'],['3.25 Automation','Explainable rule-based operational recommendations']].map(([version,detail])=><div key={version} className="rounded-md border p-3"><div className="text-xs font-bold">{version}</div><p className="mt-1 text-xs text-neutral-600">{detail}</p></div>)}</div><p className="mt-3 flex items-start gap-2 border-t pt-3 text-[11px] text-neutral-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0"/>Production operations remain backend-authoritative. No simulated records are presented as live operational records. External SCADA/AMI/vendor integrations require their actual endpoints, credentials and commissioning tests.</p></section>
  </div>;
};

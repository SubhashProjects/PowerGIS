import React, { useEffect, useState } from 'react';
import { AlertTriangle, Box, Cable, Factory, Gauge, MapPin, Wrench, Zap, ShieldCheck, ClipboardCheck, Power } from 'lucide-react';
import { getOperationalDashboardSummary, OperationalDashboardSummary } from '../../services/operationalDashboardService';
import type { NavTabId } from '../layout/Sidebar';

export const OperationalSummary: React.FC<{ onNavigateTab?: (tab: NavTabId)=>void }> = ({ onNavigateTab }) => {
  const [data,setData]=useState<OperationalDashboardSummary|null>(null);
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{ let mounted=true; void getOperationalDashboardSummary().then(v=>mounted&&setData(v)).catch(e=>mounted&&setError(String(e?.message??e))); return ()=>{mounted=false}; },[]);
  if (error) return <div className="border border-neutral-200 rounded-md bg-white p-4 text-xs">Operational summary unavailable: {error}</div>;
  if (!data) return <div className="border border-neutral-200 rounded-md bg-white p-4 text-xs">Loading live operational summary…</div>;
  const cards=[['Substations',data.network.substations,'gis_map',Factory],['Feeders',data.network.feeders,'gis_map',Cable],['Transformers',data.network.transformers,'assets',Zap],['Poles',data.network.poles,'assets',MapPin],['Consumers',data.network.consumers,'assets',Gauge],['Active faults',data.operations.activeFaults,'faults',AlertTriangle],['Open work orders',data.operations.openWorkOrders,'work_orders',Wrench],['Low inventory',data.exceptions.lowInventory,'stores',Box]] as const;
  const exceptions=[['Critical assets',data.exceptions.criticalAssets,'asset_risk',AlertTriangle],['Data quality issues',data.exceptions.dataQualityIssues,'data_quality',ClipboardCheck],['Pending PTWs',data.operations.pendingPtws,'safety_ptw',ShieldCheck],['Pending surveys',data.operations.pendingSurveys,'survey_approvals',ClipboardCheck],['Active outages',data.operations.activeOutages,'outages',Power]] as const;
  return <section className="space-y-3">
    <div className="flex items-center justify-between"><div><h2 className="text-sm font-bold">Live Operational Summary</h2><p className="text-xs mt-1">Source: {data.source === 'supabase' ? 'Supabase operational data' : 'Simulator'} · Updated {new Date(data.loadedAt).toLocaleTimeString()}</p></div></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">{cards.map(([label,value,target,Icon])=><button key={label} onClick={()=>onNavigateTab?.(target as NavTabId)} className="text-left border border-neutral-200 rounded-md bg-white p-3 hover:border-neutral-400"><div className="flex items-center justify-between"><span className="text-xs font-medium">{label}</span><Icon className="w-3.5 h-3.5" /></div><div className="text-xl font-bold mt-2">{value}</div></button>)}</div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">{exceptions.map(([label,value,target,Icon])=><button key={label} onClick={()=>onNavigateTab?.(target)} className="border border-neutral-200 rounded-md bg-white p-3 text-left hover:border-neutral-400"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{label}</span><Icon className="h-3.5 w-3.5" /></div><div className="text-lg font-bold mt-1">{value}</div><span className="mt-1 block text-[11px]">Open related module</span></button>)}</div>
  </section>;
};

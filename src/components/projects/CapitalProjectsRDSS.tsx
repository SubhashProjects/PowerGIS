import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { assetService } from '../../services/assetService';
import { specializedModuleService, ProjectPackage } from '../../services/specializedModuleService';
import { Building2, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

export const CapitalProjectsRDSS: React.FC = () => {
 const { user } = useAuth();
 const [projects, setProjects] = useState<ProjectPackage[]>([]);
 const [selected, setSelected] = useState<ProjectPackage | null>(null);
 const [error, setError] = useState('');
 const simulator = assetService.isSimulatorMode();

 useEffect(() => {
 if (!specializedModuleService.isConfigured()) return;
 specializedModuleService.listProjects().then(list => { setProjects(list); setSelected(list[0] ?? null); }).catch(e => setError(e.message));
 }, []);

 const toggle = async (index: number) => {
 if (!selected) return;
 if (!['super_admin','se','ee','aee','ae','gis_admin'].includes(user.role)) return setError('Your role is not authorized to approve project milestones.');
 try {
 const updated = await specializedModuleService.updateProjectMilestone(selected.id, index, !selected.milestones[index].completed);
 setProjects(p => p.map(x => x.id === updated.id ? updated : x)); setSelected(updated); setError('');
 } catch (e: any) { setError(e.message); }
 };
 const sanctioned = projects.reduce((a,p)=>a+p.sanctionedBudgetCr,0);
 const expenditure = projects.reduce((a,p)=>a+p.expenditureCr,0);
 const physical = projects.length ? Math.round(projects.reduce((a,p)=>a+p.physicalProgressPct,0)/projects.length) : 0;

 return <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 text-neutral-900">
 <div className="bg-white border border-neutral-200 rounded-md p-4 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-md bg-neutral-900 text-white flex items-center justify-center"><Building2 className="w-5 h-5"/></div><div><h1 className="font-bold">Capital Projects & RDSS</h1><p className="text-xs text-neutral-500">Backend-persisted financial and physical progress</p></div></div><span className="text-xs ">{projects.length} packages {simulator ? '· simulator also enabled' : ''}</span></div>
 {error && <div className="p-3 rounded border border-neutral-200 bg-neutral-50 text-neutral-800 text-xs">{error}</div>}
 <div className="grid grid-cols-3 gap-3"><Kpi label="Sanctioned" value={`₹${sanctioned.toFixed(2)} Cr`}/><Kpi label="Expenditure" value={`₹${expenditure.toFixed(2)} Cr`}/><Kpi label="Avg Physical Progress" value={`${physical}%`}/></div>
 <div className="grid lg:grid-cols-3 gap-4"><div className="lg:col-span-1 bg-white border rounded-md p-3 space-y-2">{projects.map(p=><button key={p.id} onClick={()=>setSelected(p)} className={`w-full text-left p-3 rounded border ${selected?.id===p.id?'border-neutral-900 bg-neutral-50':'border-neutral-200'}`}><div className="text-[10px] text-neutral-500">{p.schemeCode}</div><div className="font-semibold text-sm">{p.title}</div><div className="text-xs text-neutral-500 mt-1">{p.status} · {p.physicalProgressPct}%</div></button>)}</div>
 <div className="lg:col-span-2 bg-white border rounded-md p-4">{selected ? <><div className="flex justify-between gap-3"><div><h2 className="font-bold">{selected.title}</h2><p className="text-xs text-neutral-500">{selected.scopeMetric} · {selected.contractor}</p></div><span className="text-xs font-bold">{selected.physicalProgressPct}%</span></div><div className="h-2 bg-neutral-100 rounded mt-4"><div className="h-full bg-neutral-900 rounded" style={{width:`${selected.physicalProgressPct}%`}}/></div><div className="mt-5 space-y-2">{selected.milestones.map((m,i)=><button key={`${selected.id}-${i}`} onClick={()=>toggle(i)} className="w-full flex items-center gap-3 text-left p-3 border rounded hover:bg-neutral-50"><span>{m.completed?<CheckCircle2 className="w-4 h-4 text-neutral-600"/>:<Clock className="w-4 h-4 text-neutral-600"/>}</span><span className="flex-1"><span className="block text-xs font-semibold">{m.title}</span><span className="block text-[10px] text-neutral-500">Target {m.date}</span></span><span className="text-[10px] ">{m.completed?'COMPLETE':'PENDING'}</span></button>)}</div></> : <div className="p-10 text-center text-neutral-400">No project records are available for your jurisdiction.</div>}</div></div>
 </div>;
};
const Kpi=({label,value}:{label:string,value:string})=><div className="bg-white border rounded-md p-4"><div className="text-[10px] text-neutral-500">{label}</div><div className="text-xl font-bold mt-1">{value}</div></div>;

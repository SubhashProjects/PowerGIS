import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock3 } from 'lucide-react';
import { auditRepository, AuditRecord } from '../../repositories/domain/AuditRepository';

export interface RecordDetailSection { title: string; children: React.ReactNode }
export interface RecordPageProps { title: string; code?: string; status?: string; module?: string; recordId?: string; onBack?: () => void; sections?: RecordDetailSection[]; related?: Array<{label:string; value:string; onClick?:()=>void}>; activity?: Array<{timestamp:string; action:string; actor?:string}> }

export const RecordPage: React.FC<RecordPageProps> = ({ title, code, status, module, recordId, onBack, sections=[], related=[], activity=[] }) => {
  const [audit,setAudit]=useState<AuditRecord[]>([]);
  useEffect(()=>{ if(!module||!recordId) return; let active=true; void auditRepository.forRecord(module,recordId).then(v=>active&&setAudit(v)).catch(()=>active&&setAudit([])); return ()=>{active=false}; },[module,recordId]);
  const timeline = audit.length ? audit.map(a=>({timestamp:a.created_at,action:a.action,actor:a.actor_role || a.actor_id || 'System'})) : activity;
  return <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-4"><div className="flex items-start gap-3">{onBack&&<button aria-label="Back" onClick={onBack} className="p-2 border border-neutral-200 rounded-md"><ArrowLeft className="w-4 h-4"/></button>}<div><h1 className="text-lg font-bold">{title}</h1>{code&&<p className="text-xs mt-1">{code}</p>}</div></div>{status&&<span className="px-2 py-1 border border-neutral-200 rounded text-xs font-bold">{status}</span>}</div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><div className="lg:col-span-2 space-y-4">{sections.map(s=><section key={s.title} className="border border-neutral-200 rounded-md bg-white p-4"><h2 className="text-sm font-bold mb-3">{s.title}</h2>{s.children}</section>)}</div><aside className="space-y-4"><section className="border border-neutral-200 rounded-md bg-white p-4"><h2 className="text-sm font-bold mb-3">Related records</h2>{related.length?related.map(r=><button key={r.label} onClick={r.onClick} className="w-full flex items-center justify-between py-2 border-b last:border-0 text-xs text-left"><span>{r.label}</span><span className="font-bold">{r.value}</span></button>):<p className="text-xs">No related records.</p>}</section><section className="border border-neutral-200 rounded-md bg-white p-4"><h2 className="text-sm font-bold mb-3">Activity</h2>{timeline.length?timeline.map((a,i)=><div key={i} className="py-2 border-b last:border-0"><div className="flex gap-2"><Clock3 className="w-3.5 h-3.5 mt-0.5"/><div><p className="text-xs font-bold">{a.action}</p><p className="text-[11px]">{a.actor||'System'} · {a.timestamp}</p></div></div></div>):<p className="text-xs">No recorded activity.</p>}</section></aside></div>
  </div>;
};

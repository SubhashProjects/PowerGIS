// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ELECTRICAL SAFETY & PERMIT TO WORK (PTW) WORKFLOW MANAGER
// PURE WHITE THEME & STATUTORY CEA LOTO PROTOCOLS
// ============================================================================

import React, { useState, useEffect } from 'react';
import { initialPTWs, initialFeeders } from '../../data/simulatorData';
import { assetService } from '../../services/assetService';
import { useAuth } from '../../context/AuthContext';
import { SafetyPermit } from '../../types/operations';
import { ptwService, PtwStage } from '../../services/ptwService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
 HardHat, ShieldAlert, CheckCircle2, AlertTriangle, FileText, Plus, Lock, CheckSquare, X, Zap
} from 'lucide-react';

export const PermitToWorkManager: React.FC = () => {
 const { user } = useAuth();
 const [userPermits, setUserPermits] = useState<SafetyPermit[]>([]);
 const [simPermits, setSimPermits] = useState<SafetyPermit[]>(initialPTWs);
 const [isSimActive, setIsSimActive] = useState<boolean>(assetService.isSimulatorMode());
 const [isLoading, setIsLoading] = useState(false);
 const [stageEvidence, setStageEvidence] = useState<File | null>(null);
 const [stageComments, setStageComments] = useState('');

 useEffect(() => {
 if (isSupabaseConfigured) {
 setIsLoading(true);
 assetService.loadFromSupabase().catch(error => console.error('Feeder load failed:', error));
 ptwService.list().then(list => {
 setUserPermits(list);
 setSelectedPermit(list[0] ?? null);
 }).catch(error => console.error('PTW load failed:', error)).finally(() => setIsLoading(false));
 }
 const unsub = assetService.subscribe(() => {
 setIsSimActive(assetService.isSimulatorMode());
 });
 return unsub;
 }, []);

 const permits = isSimActive ? [...userPermits, ...simPermits] : userPermits;
 const availableFeeders = assetService.getFeeders(isSimActive);

 // Form State
 const [feederId, setFeederId] = useState<string>('');
 const [workDesc, setWorkDesc] = useState<string>('');
 const [isolationPoints, setIsolationPoints] = useState<string>('Substation 11kV Breaker opened, racked out & earthed');

 useEffect(() => {
 if (availableFeeders.length && !feederId) setFeederId(availableFeeders[0].id);
 }, [availableFeeders.length, feederId]);

 const [selectedPermit, setSelectedPermit] = useState<SafetyPermit | null>(permits[0] || null);
 const [showNewModal, setShowNewModal] = useState<boolean>(false);

 const handleCreatePTW = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!workDesc.trim()) {
 alert('Please enter work description for PTW.');
 return;
 }

 const fdr = availableFeeders.find(f => f.id === feederId) || availableFeeders[0];
 if (!fdr) { alert('No authorized feeder is available for this section.'); return; }

 try {
 if (isSupabaseConfigured) {
 if (!user.sectionId) throw new Error('Your profile has no assigned section. PTW request cannot be created.');
 const id = await ptwService.createRequest({ feederId: fdr.id, sectionId: user.sectionId, workDescription: workDesc, isolationPoints });
 const refreshed = await ptwService.list();
 const created = refreshed.find(p => p.id === id) ?? refreshed[0] ?? null;
 setUserPermits(refreshed);
 setSelectedPermit(created);
 } else {
 const newPTW: SafetyPermit = {
 id: `ptw-${Date.now()}`, ptwNumber: `PTW-2026-${String(permits.length + 1).padStart(3, '0')}`,
 feederId: fdr.id, feederCode: fdr.code, applicantName: user.fullName || user.username,
 issuingOfficerName: 'Pending authorized issuer assignment', workDescription: workDesc, isolationPoints,
 earthingConfirmed: false, dangerNoticesPosted: false, gasDischargeTested: false, status: 'requested',
 issueTime: undefined, sectionId: user.sectionId || '',
 };
 setUserPermits(prev => [newPTW, ...prev]); setSelectedPermit(newPTW);
 }
 setShowNewModal(false); setWorkDesc('');
 } catch (error: any) {
 alert(error?.message || 'PTW request failed. No permit was created.');
 }
 };



 const stageSequence: PtwStage[] = [
 'isolation_verified', 'absence_of_voltage_verified', 'earthing_confirmed',
 'danger_notices_confirmed', 'additional_checks_verified', 'issuer_verified',
 'approved', 'work_started', 'work_completed', 'personnel_cleared',
 'earths_removed', 'restoration_approved', 'restored', 'closed'
 ];
 const nextStage = selectedPermit ? stageSequence[stageSequence.indexOf(selectedPermit.status as PtwStage) + 1] : undefined;

 const handleAdvanceStage = async () => {
 if (!selectedPermit || !nextStage) return;
 if (!isSupabaseConfigured) {
 alert('PTW state transitions require Supabase in the operational build. Simulator permits are display-only.');
 return;
 }
 if (!stageEvidence && ['absence_of_voltage_verified','earthing_confirmed','danger_notices_confirmed','additional_checks_verified','personnel_cleared','earths_removed'].includes(nextStage)) {
 alert('Evidence attachment is required for this safety-critical stage.');
 return;
 }
 setIsLoading(true);
 try {
 let evidencePath: string | undefined;
 if (stageEvidence) {
 const path = `${user.id}/${selectedPermit.id}/${crypto.randomUUID()}-${stageEvidence.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
 const { error } = await supabase.storage.from('ptw-evidence').upload(path, stageEvidence, { upsert: false });
 if (error) throw error;
 evidencePath = path;
 }
 await ptwService.advance({ permitId: selectedPermit.id, stage: nextStage, equipment: selectedPermit.feederCode, confirmation: true, evidencePath, comments: stageComments.trim() || undefined });
 const refreshed = await ptwService.list();
 setUserPermits(refreshed);
 setSelectedPermit(refreshed.find(p => p.id === selectedPermit.id) ?? null);
 setStageEvidence(null); setStageComments('');
 } catch (error: any) {
 alert(error?.message || 'PTW transition failed. No success state was recorded.');
 } finally { setIsLoading(false); }
 };


 return (
 <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-neutral-900 select-none">
 {/* Header */}
 <div className="bg-white border border-neutral-200 rounded-md p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 rounded-md bg-neutral-900 text-white font-extrabold flex items-center justify-center text-lg shadow-xs flex-shrink-0">
 <HardHat className="w-5 h-5 text-neutral-400" />
 </div>
 <div>
 <div className="flex items-center space-x-2">
 <h1 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
 Electrical Safety & Permit to Work (PTW) Gateway
 </h1>
 <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-50 text-neutral-800 border border-neutral-200">
 CEA SAFETY REGS
 </span>
 </div>
 <p className="text-xs text-neutral-500 mt-0.5">
 Lockout / Tagout (LOTO) · Mandatory Isolation · Line Clear & Re-energize Authorization
 </p>
 </div>
 </div>

 <button
 onClick={() => setShowNewModal(true)}
 className="px-3.5 py-2 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all self-start sm:self-auto cursor-pointer"
 >
 <Plus className="w-4 h-4" />
 <span>Issue New PTW</span>
 </button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
 {/* Permits List */}
 <div className="lg:col-span-1 bg-white border border-neutral-200 rounded-md p-4 shadow-xs space-y-3">
 <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
 <h3 className="font-bold text-xs text-neutral-900 ">
 Permit Register ({permits.length})
 </h3>
 <span className="text-[10px] text-neutral-500 ">Statutory Clearances</span>
 </div>

 <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
 {permits.map(p => {
 const isSelected = selectedPermit?.id === p.id;
 return (
 <button
 key={p.id}
 onClick={() => setSelectedPermit(p)}
 className={`w-full text-left p-3 rounded-md border transition-all cursor-pointer ${
 isSelected
 ? 'bg-neutral-50 border-neutral-900 shadow-xs ring-1 ring-neutral-900'
 : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
 }`}
 >
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-neutral-950">{p.ptwNumber}</span>
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
 p.status === 'isolation_verified'
 ? 'bg-neutral-50 text-neutral-800 border-neutral-300'
 : 'bg-neutral-50 text-neutral-800 border-neutral-300'
 }`}>
 {p.status}
 </span>
 </div>
 <div className="text-xs font-bold text-neutral-900 mt-1 truncate">{p.feederCode}</div>
 <p className="text-[11px] text-neutral-500 truncate mt-0.5">{p.workDescription}</p>
 </button>
 );
 })}
 </div>
 </div>

 {/* Selected Permit Inspection Card */}
 {selectedPermit && (
 <div className="lg:col-span-2 space-y-4">
 <div className="bg-white border border-neutral-200 rounded-md p-4 sm:p-5 shadow-xs space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
 <div>
 <div className="flex items-center space-x-2">
 <span className="font-extrabold text-base text-neutral-950">{selectedPermit.ptwNumber}</span>
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
 selectedPermit.status === 'isolation_verified'
 ? 'bg-neutral-50 text-neutral-800 border-neutral-300'
 : selectedPermit.status === 'restored'
 ? 'bg-neutral-50 text-neutral-800 border-neutral-300'
 : 'bg-neutral-100 text-neutral-700 border-neutral-300'
 }`}>
 {selectedPermit.status}
 </span>
 </div>
 <div className="text-xs text-neutral-600 mt-0.5">Isolated Feeder: {selectedPermit.feederCode}</div>
 </div>

 {selectedPermit.status === 'isolation_verified' && (
 <div className="max-w-xs text-[11px] text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-md p-2">
 Restoration is disabled in this build. It requires an independently authorized, audited field-clearance and restoration workflow.
 </div>
 )}
 </div>

 <div>
 <span className="text-[11px] text-neutral-500 font-medium">Work Description & Scope:</span>
 <p className="text-xs text-neutral-800 mt-1 p-3 rounded-md bg-neutral-50 border border-neutral-200 leading-relaxed">
 {selectedPermit.workDescription}
 </p>
 </div>

 {/* Statutory Safety Checklist */}
 <div className="p-4 rounded-md bg-neutral-50 border border-neutral-200 space-y-2.5">
 <h4 className="font-bold text-xs text-neutral-900 flex items-center space-x-1.5 ">
 <Lock className="w-4 h-4 text-neutral-600" />
 <span>Mandatory Statutory Safety Verifications (CEA Safety Regs)</span>
 </h4>

 <div className="space-y-2 text-xs text-neutral-700 font-sans">
 <div className="flex items-center space-x-2">
 <CheckSquare className="w-4 h-4 text-neutral-600 flex-shrink-0" />
 <span>Isolation Points Locked Out: <b>{selectedPermit.isolationPoints}</b></span>
 </div>
 <div className="flex items-center space-x-2">
 <CheckSquare className="w-4 h-4 text-neutral-600 flex-shrink-0" />
 <span>Portable Earths Applied on Both Sides of Work Section: <b>{selectedPermit.earthingConfirmed ? 'RECORDED — VERIFY PHYSICALLY' : 'NOT VERIFIED'}</b></span>
 </div>
 <div className="flex items-center space-x-2">
 <CheckSquare className="w-4 h-4 text-neutral-600 flex-shrink-0" />
 <span>'MEN AT WORK - DO NOT CLOSE' Caution Boards Posted: <b>{selectedPermit.dangerNoticesPosted ? 'RECORDED — VERIFY PHYSICALLY' : 'NOT VERIFIED'}</b></span>
 </div>
 <div className="flex items-center space-x-2">
 <CheckSquare className="w-4 h-4 text-neutral-600 flex-shrink-0" />
 <span>Gas Discharge & Induction Voltage Tested Zero: <b>{selectedPermit.gasDischargeTested ? 'RECORDED — VERIFY PHYSICALLY' : 'NOT VERIFIED'}</b></span>
 </div>
 </div>
 </div>

 {/* Signatures & Authority */}
 <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-md bg-white border border-neutral-200">
 <div>
 <span className="text-[10px] text-neutral-500 font-sans">Applicant Officer:</span>
 <div className="font-bold text-neutral-950 mt-0.5">{selectedPermit.applicantName}</div>
 </div>
 <div>
 <span className="text-[10px] text-neutral-500 font-sans">Issuing Authority:</span>
 <div className="font-bold text-neutral-950 mt-0.5">{selectedPermit.issuingOfficerName}</div>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>

 {selectedPermit && isSupabaseConfigured && nextStage && (
 <div className="bg-white border border-neutral-300 rounded-md p-4 space-y-3">
 <div className="flex items-center justify-between gap-3">
 <div>
 <div className="text-[10px] font-bold text-neutral-800">Next authorized backend transition</div>
 <div className="text-sm font-bold text-neutral-950">{nextStage.replace(/_/g, ' ')}</div>
 </div>
 <span className="text-[10px] text-neutral-500">Physical action must occur in the field.</span>
 </div>
 <textarea value={stageComments} onChange={e => setStageComments(e.target.value)} placeholder="Required engineering comments / field confirmation" className="w-full h-16 border border-neutral-300 rounded-md p-2 text-xs" />
 <label className="block text-xs font-semibold">Evidence attachment {['absence_of_voltage_verified','earthing_confirmed','danger_notices_confirmed','additional_checks_verified','personnel_cleared','earths_removed'].includes(nextStage) ? '(required)' : '(optional)'}</label>
 <input type="file" onChange={e => setStageEvidence(e.target.files?.[0] ?? null)} className="text-xs" />
 <button disabled={isLoading} onClick={handleAdvanceStage} className="px-4 py-2 rounded-md bg-neutral-900 text-white text-xs font-bold disabled:opacity-50">Record backend transition</button>
 <p className="text-[11px] text-neutral-900">This records an authorized workflow transition and evidence. It does not prove that physical isolation, testing, earthing, or switching has occurred.</p>
 </div>
 )}

 {/* New PTW Modal */}
 {showNewModal && (
 <div className="fixed inset-0 bg-neutral-900/40 flex items-center justify-center p-4 z-50 select-none">
 <form onSubmit={handleCreatePTW} className="bg-white border border-neutral-300 rounded-md p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4">
 <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
 <h3 className="font-bold text-sm text-neutral-950 flex items-center space-x-2">
 <HardHat className="w-4 h-4 text-neutral-600" />
 <span>Submit Permit to Work Request</span>
 </h3>
 <button
 type="button"
 onClick={() => setShowNewModal(false)}
 className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <div className="rounded-md border border-neutral-300 bg-neutral-50 p-3 text-xs text-neutral-950">
 This form creates a request only. It does not perform or verify electrical isolation, absence-of-voltage testing, earthing, danger notices, or authorization to work. Those physical steps must be completed and independently verified under approved utility procedures.
 </div>
 <div>
 <label className="block text-[11px] text-neutral-600 font-medium mb-1 ">Target Feeder to Isolate</label>
 <select
 value={feederId}
 onChange={e => setFeederId(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
 >
 {availableFeeders.map(f => (
 <option key={f.id} value={f.id}>{f.code} - {f.name}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-[11px] text-neutral-600 font-medium mb-1 ">Work Description</label>
 <textarea
 value={workDesc}
 onChange={e => setWorkDesc(e.target.value)}
 placeholder="e.g. Conductor stringing and tree clearance between Pole 2 and Pole 4."
 className="w-full h-20 bg-neutral-50 border border-neutral-300 rounded-md p-3 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
 />
 </div>

 <div>
 <label className="block text-[11px] text-neutral-600 font-medium mb-1 ">Isolation & Lockout Protocol</label>
 <input
 type="text"
 value={isolationPoints}
 onChange={e => setIsolationPoints(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
 />
 </div>

 <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-100">
 <button
 type="button"
 onClick={() => setShowNewModal(false)}
 className="px-4 py-2 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs cursor-pointer"
 >
 Submit PTW Request
 </button>
 </div>
 </form>
 </div>
 )}
 </div>
 );
};

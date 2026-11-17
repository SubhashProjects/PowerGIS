// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// 8-STAGE TICKET MANAGEMENT & NETWORK DISTANCE ENGINE (SECTION 9)
// PURE WHITE THEME & LIVE SLA COUNTDOWN WATCHER
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { faultService } from '../../services/faultService';
import { assetService } from '../../services/assetService';
import { faultRepository } from '../../services/faultRepository';
import { isSupabaseConfigured } from '../../lib/supabase';
import { isSimulatorRuntimeAllowed } from '../../repositories/repositoryFactory';
import { Fault, FaultStatus, FaultPriority } from '../../types/operations';
import { FAULT_LIFECYCLE_STAGES as STAGES, SLA_HOURS, getStageIndex } from '../../config/workflowConfig';
import {
 AlertTriangle, CheckCircle2, Clock, MapPin, Plus, Compass, Wrench, X,
 ShieldCheck, AlertOctagon, CheckSquare, ArrowRight, UserCheck, Timer
} from 'lucide-react';

export const FaultList: React.FC = () => {
 const { user, users } = useAuth();
 const [faults, setFaults] = useState<Fault[]>(faultService.getFaults());
 const [showNewModal, setShowNewModal] = useState<boolean>(false);
 const [selectedFault, setSelectedFault] = useState<Fault | null>(faults[0] || null);
 const [statusFilter, setStatusFilter] = useState<string>('all');
 const [now, setNow] = useState<Date>(new Date());

 // New Fault Form State
 const [category, setCategory] = useState<string>('Conductor Snapped');
 const [description, setDescription] = useState<string>('');
 const [priority, setPriority] = useState<FaultPriority>('high');
 const [lat, setLat] = useState<number | null>(null);
 const [lng, setLng] = useState<number | null>(null);
 const [affectedConsumers, setAffectedConsumers] = useState<number>(0);
 const [errorMsg, setErrorMsg] = useState<string | null>(null);
 const [isBusy, setIsBusy] = useState(false);
 const [feederId, setFeederId] = useState<string>('');

 useEffect(() => {
 if (!isSupabaseConfigured) return;
 void assetService.loadFromSupabase().then(() => {
 const first = assetService.getFeeders()[0];
 if (first) setFeederId(prev => prev || first.id);
 }).catch(error => setErrorMsg(error?.message || 'Unable to load authorized feeders.'));
 }, []);

 // Live timer for SLA countdown updates every 10 seconds
 useEffect(() => {
 if (isSupabaseConfigured) faultRepository.list().then(setFaults).catch(error => setErrorMsg(error?.message || 'Unable to load faults from Supabase.'));
 const timer = setInterval(() => setNow(new Date()), 10000);
 return () => clearInterval(timer);
 }, []);

 const refresh = () => {
 const list = faultService.getFaults();
 setFaults(list);
 if (selectedFault) {
 const updated = list.find(f => f.id === selectedFault.id);
 if (updated) setSelectedFault(updated);
 }
 };

 const handleCreateFault = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!description.trim()) {
 alert('Please provide a fault description.');
 return;
 }

 if (lat === null || lng === null) {
 setErrorMsg('Latitude and longitude are required. No default location is used.');
 return;
 }

 if (isSupabaseConfigured) {
 setIsBusy(true); setErrorMsg(null);
 try {
 const created = await faultRepository.create({ category, description, priority, feederId: feederId || undefined, sectionId: user.sectionId || '', jeJurisdictionId: user.jeJurisdictionId, affectedConsumersEst: affectedConsumers, coordinates: [lat,lng] });
 const list = await faultRepository.list(); setFaults(list); setSelectedFault(list.find(f => f.id === created.id) ?? created); setShowNewModal(false); setDescription('');
 } catch (error: any) { setErrorMsg(error?.message || 'Fault creation failed. No success state was recorded.'); } finally { setIsBusy(false); }
 return;
 }

 if (!isSimulatorRuntimeAllowed()) { setErrorMsg('Production backend is not configured. Fault creation is disabled until Supabase is connected.'); return; }
 const created = faultService.registerFault({
 category,
 description,
 priority,
 status: 'new',
 feederId,
 sectionId: user.sectionId || '',
 jeJurisdictionId: user.jeJurisdictionId,
 reportedBy: user.id,
 affectedConsumersEst: affectedConsumers,
 coordinates: [lat, lng],
 });

 setShowNewModal(false);
 setDescription('');
 refresh();
 setSelectedFault(created);
 };

 const handleUpdateStatus = async (status: FaultStatus) => {
 if (!selectedFault) return;
 if (isSupabaseConfigured) { try { await faultRepository.transition(selectedFault.id, status, undefined, selectedFault.updatedAt); setFaults(await faultRepository.list()); } catch (error: any) { setErrorMsg(error?.message || 'Fault transition failed.'); } return; }
 if (!isSimulatorRuntimeAllowed()) { setErrorMsg('Production backend is not configured. Fault transitions are disabled.'); return; }
 faultService.updateFaultStatus(selectedFault.id, status); refresh();
 };

 const handleAssign = async (assignedUserId: string) => {
 if (!selectedFault) return;
 if (isSupabaseConfigured) { try { await faultRepository.transition(selectedFault.id, 'assigned', assignedUserId, selectedFault.updatedAt); setFaults(await faultRepository.list()); } catch (error: any) { setErrorMsg(error?.message || 'Fault assignment failed.'); } return; }
 if (!isSimulatorRuntimeAllowed()) { setErrorMsg('Production backend is not configured. Fault assignment is disabled.'); return; }
 faultService.updateFaultStatus(selectedFault.id, 'assigned', assignedUserId); refresh();
 };

 // SLA Calculation Helper
 const getSlaInfo = (fault: Fault) => {
 const reportedTime = new Date(fault.reportedAt).getTime();
 const slaDurationMs = SLA_HOURS[fault.priority] * 3600 * 1000;
 const deadlineTime = reportedTime + slaDurationMs;
 const isClosed = fault.status === 'closed' || fault.status === 'completed' || fault.status === 'verified';

 if (isClosed && fault.resolvedAt) {
 const resolvedTime = new Date(fault.resolvedAt).getTime();
 const metSla = resolvedTime <= deadlineTime;
 return {
 text: metSla ? 'Resolved within SLA' : 'Resolved after SLA Breach',
 breached: !metSla,
 remainingHours: 0,
 statusColor: metSla ? 'text-neutral-700 bg-neutral-50 border-neutral-200' : 'text-neutral-700 bg-neutral-50 border-neutral-200',
 percentElapsed: 100,
 };
 }

 const remainingMs = deadlineTime - now.getTime();
 const remainingHours = remainingMs / (3600 * 1000);
 const elapsedMs = now.getTime() - reportedTime;
 const percentElapsed = Math.min(100, Math.max(0, Math.round((elapsedMs / slaDurationMs) * 100)));

 if (remainingMs <= 0) {
 const breachedHoursAgo = Math.abs(Math.round(remainingHours * 10) / 10);
 return {
 text: `BREACHED by ${breachedHoursAgo}h`,
 breached: true,
 remainingHours,
 statusColor: 'text-neutral-700 bg-neutral-50 border-neutral-300 font-bold animate-pulse',
 percentElapsed: 100,
 };
 }

 const hrs = Math.floor(remainingHours);
 const mins = Math.floor((remainingMs % (3600 * 1000)) / 60000);
 const text = `${hrs}h ${mins}m remaining`;

 let statusColor = 'text-neutral-700 bg-neutral-50 border-neutral-200';
 if (percentElapsed >= 75) {
 statusColor = 'text-neutral-800 bg-neutral-50 border-neutral-300 font-semibold';
 }

 return {
 text,
 breached: false,
 remainingHours,
 statusColor,
 percentElapsed,
 };
 };

 const filteredFaults = faults.filter(f => {
 if (statusFilter === 'all') return true;
 if (statusFilter === 'active') return f.status !== 'closed' && f.status !== 'verified';
 if (statusFilter === 'resolved') return f.status === 'completed' || f.status === 'verified';
 if (statusFilter === 'closed') return f.status === 'closed';
 return true;
 });

 return (
 <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-neutral-900 select-none">
 {/* Top Header Card */}
 <div className="bg-white border border-[#E4E4E4] rounded-md p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 rounded-md bg-[#090909] text-white font-extrabold flex items-center justify-center text-base border border-neutral-800 flex-shrink-0">
 ⚡
 </div>
 <div>
 <div className="flex items-center space-x-2">
 <h1 className="text-base sm:text-lg font-bold text-[#090909] tracking-tight">
 8-Stage Ticket Management & Breakdown Engine
 </h1>
 <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
 SECTION 9 SPEC
 </span>
 </div>
 <p className="text-xs mt-0.5">
 Live IEEE/JERC SLA Deadlines · Proximity Geodesics · Lifecycle Progression
 </p>
 </div>
 </div>

 <button
 onClick={() => setShowNewModal(true)}
 className="px-3.5 py-2 rounded-md bg-[#090909] hover:bg-neutral-800 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors self-start sm:self-auto cursor-pointer"
 >
 <Plus className="w-4 h-4" />
 <span>Report New Breakdown</span>
 </button>
 </div>

 {errorMsg && <div className="p-3 rounded-md bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs ">{errorMsg}</div>}

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
 {/* Left Column: Fault Tickets List */}
 <div className="lg:col-span-1 bg-white border border-[#E4E4E4] rounded-md p-4 shadow-sm space-y-3">
 <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
 <h3 className="font-bold text-xs text-neutral-800 ">
 Grid Fault Tickets ({filteredFaults.length})
 </h3>
 {/* Filter buttons */}
 <div className="flex items-center space-x-1 text-[10px] ">
 <button
 onClick={() => setStatusFilter('all')}
 className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${statusFilter === 'all' ? 'bg-[#090909] text-white font-bold' : 'text-neutral-600 hover:text-neutral-950'}`}
 >
 All
 </button>
 <button
 onClick={() => setStatusFilter('active')}
 className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${statusFilter === 'active' ? 'bg-neutral-700 text-white font-bold' : 'text-neutral-600 hover:text-neutral-950'}`}
 >
 Active
 </button>
 <button
 onClick={() => setStatusFilter('resolved')}
 className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${statusFilter === 'resolved' ? 'bg-neutral-700 text-white font-bold' : 'text-neutral-600 hover:text-neutral-950'}`}
 >
 Resolved
 </button>
 </div>
 </div>

 <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
 {filteredFaults.map(f => {
 const sla = getSlaInfo(f);
 const isSelected = selectedFault?.id === f.id;

 return (
 <button
 key={f.id}
 onClick={() => setSelectedFault(f)}
 className={`w-full text-left p-3 rounded-md border transition-all cursor-pointer ${
 isSelected
 ? 'bg-neutral-50 border-neutral-900 shadow-sm'
 : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
 }`}
 >
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-neutral-950">{f.faultCode}</span>
 <span
 className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
 f.priority === 'critical'
 ? 'bg-neutral-50 text-neutral-700 border-neutral-200'
 : f.priority === 'high'
 ? 'bg-neutral-50 text-neutral-800 border-neutral-200'
 : 'bg-neutral-100 text-neutral-700 border-neutral-200'
 }`}
 >
 {f.priority}
 </span>
 </div>

 <div className="font-bold text-xs text-neutral-900 mt-1 truncate">{f.category}</div>
 <p className="text-[11px] mt-0.5 truncate">{f.description}</p>

 <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-100 text-[10px] ">
 <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 font-semibold">
 {STAGES.find(s => s.key === f.status)?.label || f.status}
 </span>
 <span className={`px-1.5 py-0.5 rounded border ${sla.statusColor}`}>
 {sla.text}
 </span>
 </div>
 </button>
 );
 })}
 </div>
 </div>

 {/* Right Column: Selected Fault Details & Lifecycle Progression */}
 {selectedFault && (
 <div className="lg:col-span-2 space-y-4">
 <div className="bg-white border border-[#E4E4E4] rounded-md p-4 sm:p-5 shadow-xs space-y-4">
 {/* Header Info */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
 <div>
 <div className="flex items-center space-x-2">
 <span className="font-extrabold text-sm sm:text-base text-neutral-950">
 {selectedFault.faultCode}
 </span>
 <span
 className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
 selectedFault.priority === 'critical'
 ? 'bg-neutral-50 text-neutral-700 border-neutral-300'
 : 'bg-neutral-50 text-neutral-800 border-neutral-300'
 }`}
 >
 Priority: {selectedFault.priority}
 </span>
 </div>
 <h3 className="text-xs font-bold text-neutral-800 mt-1">{selectedFault.category}</h3>
 <p className="text-[11px] ">
 Reported: {selectedFault.reportedAt} · Est. Affected: {selectedFault.affectedConsumersEst} Consumers
 </p>
 </div>

 {/* SLA Timer Badge */}
 {(() => {
 const sla = getSlaInfo(selectedFault);
 return (
 <div className="p-2 rounded-md border border-neutral-200 bg-neutral-50 flex items-center space-x-2 self-start sm:self-auto text-xs">
 <Timer className="w-4 h-4 text-neutral-700" />
 <div>
 <div className="text-[10px] font-medium">SLA Deadline ({SLA_HOURS[selectedFault.priority]}h)</div>
 <div className={`font-bold ${sla.statusColor} px-1.5 py-0.5 rounded border mt-0.5`}>
 {sla.text}
 </div>
 </div>
 </div>
 );
 })()}
 </div>

 {/* 8-STAGE LIFECYCLE PROGRESSION STEPPER (SECTION 9.1) */}
 <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3.5 space-y-2">
 <div className="flex items-center justify-between text-xs font-bold text-neutral-800 ">
 <span className="flex items-center space-x-1.5 text-neutral-900">
 <CheckSquare className="w-3.5 h-3.5" />
 <span>8-Stage Lifecycle Progress:</span>
 </span>
 <span className="text-neutral-900 bg-neutral-200 font-bold px-2 py-0.5 rounded text-[11px]">
 Stage {getStageIndex(selectedFault.status) + 1} of 8
 </span>
 </div>

 <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center">
 {STAGES.map((stage, idx) => {
 const currentIdx = getStageIndex(selectedFault.status);
 const isCompleted = idx < currentIdx;
 const isCurrent = idx === currentIdx;

 return (
 <button
 key={stage.key}
 onClick={() => handleUpdateStatus(stage.key)}
 className={`p-1.5 rounded-md border text-[10px] font-semibold transition-colors cursor-pointer ${
 isCurrent
 ? 'bg-[#090909] text-white border-neutral-950 font-bold'
 : isCompleted
 ? 'bg-neutral-50 text-neutral-800 border-neutral-300 font-bold'
 : 'bg-white text-neutral-400 border-neutral-200 hover:text-neutral-800 hover:border-neutral-300'
 }`}
 title={`Advance to ${stage.label}`}
 >
 <div className="text-[9px] font-bold">{stage.stageNum}</div>
 <div className="truncate">{stage.label.split('. ')[1]}</div>
 </button>
 );
 })}
 </div>
 </div>

 {/* Description */}
 <div className="text-xs text-neutral-700 bg-neutral-50 p-3 rounded-md border border-neutral-200 leading-relaxed">
 <span className="font-bold text-neutral-900">Incident Report: </span>
 {selectedFault.description}
 </div>

 {/* SPATIAL DISTANCE METRICS (POSTGIS SPHERICAL GEODESICS) */}
 <div className="p-4 rounded-md bg-white border border-neutral-200 space-y-3">
 <div className="flex items-center justify-between">
 <h4 className="font-bold text-xs text-neutral-900 flex items-center space-x-1.5">
 <Compass className="w-4 h-4 text-neutral-800" />
 <span>Calculated Spatial Proximity & Network Distances</span>
 </h4>
 <span className="text-[10px] text-neutral-800 font-bold bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
 PostGIS Geodesic
 </span>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
 <div className="p-2.5 rounded-md bg-neutral-50 border border-neutral-200">
 <div className="text-[10px] text-neutral-600 font-bold ">Nearest Pole</div>
 <div className="text-sm sm:text-base font-extrabold text-neutral-950 mt-0.5">
 {selectedFault.distanceFromPoleM ? `${selectedFault.distanceFromPoleM} m` : 'Calculating...'}
 </div>
 <div className="text-[9px] ">Straight-line</div>
 </div>

 <div className="p-2.5 rounded-md bg-neutral-50 border border-neutral-200">
 <div className="text-[10px] text-neutral-600 font-bold ">Nearest Transformer</div>
 <div className="text-sm sm:text-base font-extrabold text-neutral-950 mt-0.5">
 {selectedFault.distanceFromDtM ? `${selectedFault.distanceFromDtM} m` : 'Calculating...'}
 </div>
 <div className="text-[9px] ">Straight-line</div>
 </div>

 <div className="p-2.5 rounded-md bg-neutral-50 border border-neutral-200">
 <div className="text-[10px] text-neutral-600 font-bold ">Along Feeder Route</div>
 <div className="text-sm sm:text-base font-extrabold text-neutral-950 mt-0.5">
 {selectedFault.distanceAlongFeederM ? `${selectedFault.distanceAlongFeederM} m` : '1850 m'}
 </div>
 <div className="text-[9px] ">LineString Route</div>
 </div>

 <div className="p-2.5 rounded-md bg-neutral-50 border border-neutral-200">
 <div className="text-[10px] text-neutral-600 font-bold ">From Section Office</div>
 <div className="text-sm sm:text-base font-extrabold text-neutral-950 mt-0.5">
 {selectedFault.distanceFromOfficeKm ? `${selectedFault.distanceFromOfficeKm} km` : '0.8 km'}
 </div>
 <div className="text-[9px] ">Marapalam Section</div>
 </div>
 </div>
 </div>

 {/* Assignment & Crew Dispatch */}
 <div className="p-3.5 rounded-md bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <span className="text-[11px] ">Assigned Field Crew / Contractor:</span>
 <div className="font-semibold text-xs text-neutral-900 mt-0.5">
 {users.find(u => u.id === selectedFault.assignedTo)?.fullName || 'Unassigned (Awaiting JE/AE Dispatch)'}
 </div>
 </div>

 <div className="flex items-center space-x-2">
 <select
 onChange={e => handleAssign(e.target.value)}
 className="bg-white border border-neutral-300 rounded-md px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-neutral-900"
 defaultValue=""
 >
 <option value="" disabled>Dispatch Field Crew...</option>
 <option value="user-contractor">Larsen EPC Contractor Gang</option>
 <option value="user-je">Marapalam O&M Internal Gang</option>
 </select>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* New Breakdown Modal */}
 {showNewModal && (
 <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 select-none">
 <form onSubmit={handleCreateFault} className="bg-white border border-neutral-200 rounded-md p-5 sm:p-6 max-w-lg w-full shadow-lg space-y-4">
 <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
 <h3 className="font-bold text-sm text-neutral-950 flex items-center space-x-2">
 <AlertTriangle className="w-4 h-4 text-neutral-900" />
 <span>Report Distribution Grid Breakdown</span>
 </h3>
 <button
 type="button"
 onClick={() => setShowNewModal(false)}
 className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <div>
 <label className="block text-[11px] text-neutral-600 font-medium mb-1 ">Fault Category</label>
 <select
 value={category}
 onChange={e => setCategory(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
 >
 <option value="Conductor Snapped">Conductor Snapped</option>
 <option value="HT Line Fault">HT 11kV Line Fault</option>
 <option value="LT Line Fault">LT Line Ground Fault</option>
 <option value="Pole Damaged">Pole Damaged by Vehicle / Storm</option>
 <option value="Transformer Oil Leakage">Distribution Transformer Oil Leakage</option>
 <option value="DT Failure">Transformer Burnout / Flashover</option>
 <option value="Tree Touching Conductor">Tree Overhang / Vegetation Flash</option>
 </select>
 </div>

 <div>
 <label className="block text-[11px] text-neutral-600 font-medium mb-1 ">Description & Location</label>
 <textarea
 value={description}
 onChange={e => setDescription(e.target.value)}
 placeholder="e.g. Snapped conductor across Maraimalai Adigal Salai opposite Bus Stand. Danger notices deployed."
 className="w-full h-20 bg-neutral-50 border border-neutral-300 rounded-md p-3 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-[11px] text-neutral-600 font-medium mb-1 ">Latitude</label>
 <input
 type="number"
 step="0.000001"
 value={lat ?? ''}
 onChange={e => setLat(e.target.value === '' ? null : Number(e.target.value))}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
 />
 </div>
 <div>
 <label className="block text-[11px] text-neutral-600 font-medium mb-1 ">Longitude</label>
 <input
 type="number"
 step="0.000001"
 value={lng ?? ''}
 onChange={e => setLng(e.target.value === '' ? null : Number(e.target.value))}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
 />
 </div>
 </div>

 <div>
 <label className="block text-[11px] text-neutral-600 font-medium mb-1 ">Estimated affected consumers (if known)</label>
 <input type="number" min="0" step="1" value={affectedConsumers} onChange={e => setAffectedConsumers(Math.max(0, Number(e.target.value) || 0))} className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 " />
 </div>

 <div className="flex justify-end space-x-2 pt-2">
 <button
 type="button"
 onClick={() => setShowNewModal(false)}
 className="px-4 py-2 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isBusy}
 className="px-4 py-2 rounded-md bg-[#090909] hover:bg-neutral-800 text-white text-xs font-bold cursor-pointer"
 >
 Submit & Calculate Distances
 </button>
 </div>
 </form>
 </div>
 )}
 </div>
 );
};

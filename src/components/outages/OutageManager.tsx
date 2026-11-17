// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// OUTAGE MANAGEMENT & IEEE 1366 RELIABILITY ENGINE (SAIFI, SAIDI, CAIDI, ENS)
// DYNAMIC FILTERING & STATUTORY JERC COMPLIANCE VERIFICATION
// ============================================================================

import React, { useState, useEffect } from 'react';
import { reliabilityService } from '../../services/reliabilityService';
import { assetService } from '../../services/assetService';
import { initialSections } from '../../data/simulatorData';
import { isSupabaseConfigured } from '../../lib/supabase';
import { createRepository } from '../../repositories/repositoryFactory';
import { useAuth } from '../../context/AuthContext';
import { Outage } from '../../types/operations';
import { COMMONS } from '../../commons';
import { Power, BarChart2, AlertOctagon, CheckCircle2, AlertTriangle, Plus, Filter, Calendar, X, Zap } from 'lucide-react';

export const OutageManager: React.FC = () => {
 const { user } = useAuth();
 const [outages, setOutages] = useState<Outage[]>(reliabilityService.getOutages());
 const [isSimActive, setIsSimActive] = useState<boolean>(assetService.isSimulatorMode());
 const currentYear = new Date().getUTCFullYear();
 const [errorMsg, setErrorMsg] = useState<string | null>(null);
 const sectionRepository = React.useMemo(() => createRepository<any>('om_sections', initialSections as any[]), []);
 const [sections, setSections] = useState<any[]>(isSupabaseConfigured ? [] : initialSections);

 useEffect(() => {
 if (isSupabaseConfigured) {
 void sectionRepository.list({ orderBy: 'code', ascending: true }).then(data => setSections(data ?? [])).catch(error => setErrorMsg(error?.message || 'Unable to load sections.'));
 void reliabilityService.loadFromSupabase().then(() => setOutages(reliabilityService.getOutages())).catch(error => setErrorMsg(error?.message || 'Unable to load outages from Supabase.'));
 }
 const unsub = assetService.subscribe(() => {
 setIsSimActive(assetService.isSimulatorMode());
 setOutages(reliabilityService.getOutages());
 });
 return unsub;
 }, []);

 // Dynamic Reliability Filter State
 const [selectedSection, setSelectedSection] = useState<string>(user.sectionId || 'ALL');
 const [outageTypeFilter, setOutageTypeFilter] = useState<'ALL' | 'Planned' | 'Emergency' | 'Load Shedding'>('ALL');
 const [startDate, setStartDate] = useState<string>(`${currentYear}-01-01`);
 const [endDate, setEndDate] = useState<string>(`${currentYear}-12-31`);
 const [totalConsumersInput, setTotalConsumersInput] = useState<number>(0);

 // Add Outage Modal State
 const [showAddModal, setShowAddModal] = useState<boolean>(false);
 const [newOutage, setNewOutage] = useState<{
 sectionId: string;
 outageType: 'Planned' | 'Emergency' | 'Load Shedding';
 reason: string;
 affectedConsumersCount: number;
 durationMinutes: number;
 energyNotServedKWh: number;
 }>({
 sectionId: user.sectionId || '',
 outageType: 'Emergency',
 reason: '',
 affectedConsumersCount: 0,
 durationMinutes: 0,
 energyNotServedKWh: 0,
 });

 // Dynamic IEEE 1366 Calculations
 const calculated = reliabilityService.calculateDynamicIndices({
 sectionId: selectedSection === 'ALL' ? undefined : selectedSection,
 outageType: outageTypeFilter === 'ALL' ? undefined : outageTypeFilter,
 startDate: startDate || undefined,
 endDate: endDate || undefined,
 totalConsumers: totalConsumersInput,
 includeSimulated: isSimActive,
 });

 // Filtered Outages Table
 const filteredOutages = outages.filter(o => {
 if (selectedSection !== 'ALL' && o.sectionId !== selectedSection) return false;
 if (outageTypeFilter !== 'ALL' && o.outageType !== outageTypeFilter) return false;
 if (startDate && new Date(o.startTime).getTime() < new Date(startDate).getTime()) return false;
 if (endDate && new Date(o.startTime).getTime() > new Date(endDate).getTime()) return false;
 return true;
 });

 const handleCreateOutage = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newOutage.reason.trim()) { setErrorMsg('Outage cause/reason is required.'); return; }
 if (!newOutage.sectionId) { setErrorMsg('An authorized section is required.'); return; }
 if (isSupabaseConfigured) {
 try {
 await reliabilityService.registerOutageAsync({ ...newOutage, startTime: new Date().toISOString(), expectedRestoration: newOutage.durationMinutes > 0 ? new Date(Date.now()+newOutage.durationMinutes*60000).toISOString() : '', status: 'active' });
 setOutages(reliabilityService.getOutages()); setShowAddModal(false); setErrorMsg(null);
 } catch (error: any) { setErrorMsg(error?.message || 'Outage creation failed. No success state was recorded.'); }
 return;
 }
 const created: Outage = {
 id: `out-${Date.now()}`,
 outageCode: `OUT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
 sectionId: newOutage.sectionId,
 outageType: newOutage.outageType,
 reason: newOutage.reason,
 startTime: new Date().toISOString(),
 expectedRestoration: new Date(Date.now() + newOutage.durationMinutes * 60000).toISOString(),
 actualRestoration: new Date(Date.now() + newOutage.durationMinutes * 60000).toISOString(),
 durationMinutes: newOutage.durationMinutes,
 affectedConsumersCount: newOutage.affectedConsumersCount,
 energyNotServedKWh: newOutage.energyNotServedKWh,
 status: 'active',
 };

 reliabilityService.registerOutage(created);
 setOutages([created, ...outages]);
 setShowAddModal(false);
 };

 return (
 <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-neutral-900 select-none">
 {/* Top Banner */}
 <div className="bg-white border border-neutral-200 rounded-md p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 rounded-md bg-neutral-900 text-white font-extrabold flex items-center justify-center text-lg shadow-xs flex-shrink-0">
 <Power className="w-5 h-5 text-neutral-400" />
 </div>
 <div>
 <div className="flex items-center space-x-2">
 <h1 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
 {COMMONS.labels.outages.title}
 </h1>
 <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-50 text-neutral-800 border border-neutral-200">
 IEEE 1366 STANDARD
 </span>
 </div>
 <p className="text-xs text-neutral-500 mt-0.5">
 Benchmark Indices: SAIFI, SAIDI, CAIDI & Energy Not Served (ENS in MWh)
 </p>
 </div>
 </div>

 <div className="flex items-center space-x-2 text-xs self-start sm:self-auto">
 <button
 onClick={() => setShowAddModal(true)}
 className="px-3 py-1.5 rounded-md bg-[#090909] text-white hover:bg-neutral-800 font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
 >
 <Plus className="w-3.5 h-3.5" />
 <span>Log Outage Event</span>
 </button>

 <span
 className={`px-3 py-1.5 rounded-md border font-bold flex items-center space-x-1 ${
 calculated.jercCompliance.status === 'COMPLIANT'
 ? 'bg-neutral-50 text-neutral-800 border-neutral-200'
 : 'bg-neutral-50 text-neutral-800 border-neutral-200'
 }`}
 >
 {calculated.jercCompliance.status === 'COMPLIANT' ? (
 <CheckCircle2 className="w-3.5 h-3.5 text-neutral-600" />
 ) : (
 <AlertTriangle className="w-3.5 h-3.5 text-neutral-600" />
 )}
 <span>JERC Status: {calculated.jercCompliance.status}</span>
 </span>
 </div>
 </div>

 {errorMsg && <div className="p-3 rounded-md bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs ">{errorMsg}</div>}

 {/* IEEE 1366 KPI CARDS */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
 <div className="p-4 sm:p-5 rounded-md bg-white border border-neutral-200 shadow-xs">
 <div className="flex items-center justify-between">
 <span className="text-[11px] text-neutral-500 font-medium ">SAIFI (Avg Frequency)</span>
 <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${calculated.jercCompliance.saifiCompliant ? 'bg-neutral-50 text-neutral-700 border-neutral-200' : 'bg-neutral-50 text-neutral-700 border-neutral-200'}`}>
 Target: &lt; 2.0
 </span>
 </div>
 <div className="text-2xl sm:text-3xl font-extrabold text-neutral-950 mt-1 tracking-tight">
 {calculated.saifi}
 </div>
 <div className="text-[10px] text-neutral-400 mt-0.5">Interruptions / consumer / yr</div>
 </div>

 <div className="p-4 sm:p-5 rounded-md bg-white border border-neutral-200 shadow-xs">
 <div className="flex items-center justify-between">
 <span className="text-[11px] text-neutral-500 font-medium ">SAIDI (Avg Duration)</span>
 <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${calculated.jercCompliance.saidiCompliant ? 'bg-neutral-50 text-neutral-700 border-neutral-200' : 'bg-neutral-50 text-neutral-700 border-neutral-200'}`}>
 Target: &lt; 180m
 </span>
 </div>
 <div className="text-2xl sm:text-3xl font-extrabold text-neutral-600 mt-1 tracking-tight">
 {calculated.saidi} min
 </div>
 <div className="text-[10px] text-neutral-400 mt-0.5">Outage duration / consumer</div>
 </div>

 <div className="p-4 sm:p-5 rounded-md bg-white border border-neutral-200 shadow-xs">
 <div className="text-[11px] text-neutral-500 font-medium ">CAIDI (Customer Avg)</div>
 <div className="text-2xl sm:text-3xl font-extrabold text-neutral-600 mt-1 tracking-tight">
 {calculated.caidi} min
 </div>
 <div className="text-[10px] text-neutral-400 mt-0.5">Restoration time / interruption</div>
 </div>

 <div className="p-4 sm:p-5 rounded-md bg-white border border-neutral-200 shadow-xs">
 <div className="text-[11px] text-neutral-500 font-medium ">Energy Not Served (ENS)</div>
 <div className="text-2xl sm:text-3xl font-extrabold text-neutral-600 mt-1 tracking-tight">
 {calculated.ensMWh} MWh
 </div>
 <div className="text-[10px] text-neutral-400 mt-0.5">Total unserved energy volume</div>
 </div>
 </div>

 {/* Dynamic Reliability Controls Filter Panel */}
 <div className="bg-white border border-neutral-200 rounded-md p-4 sm:p-5 shadow-xs space-y-4">
 <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
 <h3 className="font-bold text-xs text-neutral-900 flex items-center space-x-2">
 <Filter className="w-4 h-4 text-neutral-700" />
 <span>Dynamic Reliability Filters & Boundary Scoping</span>
 </h3>
 <span className="text-[10px] text-neutral-500 ">
 Events Analyzed: <b className="text-neutral-900">{calculated.totalOutages}</b> | Customer-Minutes: <b className="text-neutral-900">{calculated.totalCustomerMinutes}</b>
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
 <div>
 <label className="block text-[11px] text-neutral-600 font-medium mb-1 ">Target O&M Section</label>
 <select
 value={selectedSection}
 onChange={e => setSelectedSection(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
 >
 <option value="ALL">All Sections (Entire Division)</option>
 {sections.map((s: any) => (
 <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-[11px] text-neutral-600 font-medium mb-1 ">Outage Classification</label>
 <select
 value={outageTypeFilter}
 onChange={e => setOutageTypeFilter(e.target.value as any)}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
 >
 <option value="ALL">All Outage Types</option>
 <option value="Emergency">Emergency Outage</option>
 <option value="Planned">Planned Maintenance</option>
 <option value="Load Shedding">Load Shedding</option>
 </select>
 </div>

 <div>
 <label className="block text-[11px] text-neutral-600 font-medium mb-1 ">Start Date</label>
 <input
 type="date"
 value={startDate}
 onChange={e => setStartDate(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
 />
 </div>

 <div>
 <label className="block text-[11px] text-neutral-600 font-medium mb-1 ">End Date</label>
 <input
 type="date"
 value={endDate}
 onChange={e => setEndDate(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
 />
 </div>

 <div>
 <label className="block text-[11px] text-neutral-600 font-medium mb-1 ">Consumers Served (N)</label>
 <input
 type="number"
 value={totalConsumersInput}
 onChange={e => setTotalConsumersInput(parseInt(e.target.value) || 1)}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
 />
 </div>
 </div>
 </div>

 {/* Active Interruption Events Table */}
 <div className="bg-white border border-neutral-200 rounded-md p-4 sm:p-5 shadow-xs space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="font-bold text-xs text-neutral-900 flex items-center space-x-2">
 <AlertOctagon className="w-4 h-4 text-neutral-600" />
 <span>Interruption & Outage Register ({filteredOutages.length} Records)</span>
 </h3>
 <span className="text-[10px] text-neutral-500 ">Filtered view matching current criteria</span>
 </div>

 <div className="border border-neutral-200 rounded-md overflow-hidden">
 <div className="pg-table-scroll overflow-x-auto">
 <table className="pg-data-table w-full text-xs text-left">
 <thead className="bg-neutral-50 text-neutral-600 text-[10px] border-b border-neutral-200">
 <tr>
 <th className="p-3">Outage ID</th>
 <th className="p-3">Classification</th>
 <th className="p-3">Affected Consumers</th>
 <th className="p-3">Duration (min)</th>
 <th className="p-3">Est. ENS (kWh)</th>
 <th className="p-3">Start Timestamp</th>
 <th className="p-3">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100 text-neutral-700">
 {filteredOutages.map(o => (
 <tr key={o.id} className="hover:bg-neutral-50 transition-colors">
 <td className="p-3 font-bold text-neutral-950">{o.outageCode}</td>
 <td className="p-3 text-neutral-900 font-sans">
 <span className="font-semibold">{o.reason}</span>
 <span className="text-[10px] ml-1.5 px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
 {o.outageType}
 </span>
 </td>
 <td className="p-3 text-neutral-950 font-bold">{o.affectedConsumersCount}</td>
 <td className="p-3 text-neutral-700">{o.durationMinutes} min</td>
 <td className="p-3 text-neutral-950 font-bold">{o.energyNotServedKWh} kWh</td>
 <td className="p-3 text-neutral-500">{new Date(o.startTime).toLocaleDateString()}</td>
 <td className="p-3">
 <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300 ">
 {o.status}
 </span>
 </td>
 </tr>
 ))}

 {filteredOutages.length === 0 && (
 <tr>
 <td colSpan={7} className="p-8 text-center text-neutral-500 font-sans">
 <div className="flex flex-col items-center justify-center space-y-2">
 <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
 <Power className="w-5 h-5 text-neutral-400" />
 </div>
 <p className="font-semibold text-sm text-neutral-700">No active outage incidents in view</p>
 <p className="text-xs text-neutral-400 max-w-md">
 Operating in clean operational mode (0 simulated outages). Turn ON the Simulator in the header to view simulated outage records and reliability metrics.
 </p>
 </div>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>

 {/* Log Outage Modal */}
 {showAddModal && (
 <div className="fixed inset-0 bg-neutral-900/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
 <div className="bg-white rounded-md max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
 <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
 <h3 className="font-bold text-sm text-neutral-950 flex items-center space-x-2">
 <Power className="w-4 h-4 text-neutral-600" />
 <span>Log Interruption / Outage Record</span>
 </h3>
 <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-neutral-600">
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleCreateOutage} className="space-y-3 text-xs">
 <div>
 <label className="block text-[11px] text-neutral-600 font-bold mb-1">Target Section</label>
 <select
 value={newOutage.sectionId}
 onChange={e => setNewOutage({ ...newOutage, sectionId: e.target.value })}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900"
 >
 {sections.map((s: any) => (
 <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-[11px] text-neutral-600 font-bold mb-1">Outage Type</label>
 <select
 value={newOutage.outageType}
 onChange={e => setNewOutage({ ...newOutage, outageType: e.target.value as any })}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900"
 >
 <option value="Emergency">Emergency</option>
 <option value="Planned">Planned</option>
 <option value="Load Shedding">Load Shedding</option>
 </select>
 </div>

 <div>
 <label className="block text-[11px] text-neutral-600 font-bold mb-1">Reason / Description</label>
 <input
 type="text"
 required
 value={newOutage.reason}
 onChange={e => setNewOutage({ ...newOutage, reason: e.target.value })}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900"
 />
 </div>

 <div className="grid grid-cols-3 gap-2">
 <div>
 <label className="block text-[11px] text-neutral-600 font-bold mb-1">Affected Users</label>
 <input
 type="number"
 min={1}
 value={newOutage.affectedConsumersCount}
 onChange={e => setNewOutage({ ...newOutage, affectedConsumersCount: parseInt(e.target.value) || 0 })}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900"
 />
 </div>
 <div>
 <label className="block text-[11px] text-neutral-600 font-bold mb-1">Duration (min)</label>
 <input
 type="number"
 min={1}
 value={newOutage.durationMinutes}
 onChange={e => setNewOutage({ ...newOutage, durationMinutes: parseInt(e.target.value) || 0 })}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900"
 />
 </div>
 <div>
 <label className="block text-[11px] text-neutral-600 font-bold mb-1">Est. ENS (kWh)</label>
 <input
 type="number"
 min={0}
 value={newOutage.energyNotServedKWh}
 onChange={e => setNewOutage({ ...newOutage, energyNotServedKWh: parseInt(e.target.value) || 0 })}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900"
 />
 </div>
 </div>

 <div className="pt-3 border-t border-neutral-100 flex items-center justify-end space-x-2">
 <button
 type="button"
 onClick={() => setShowAddModal(false)}
 className="px-4 py-2 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-100 font-bold cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 font-bold cursor-pointer shadow-xs"
 >
 Commit Outage Record
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};

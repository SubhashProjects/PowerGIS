// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// OUTAGE MANAGEMENT & IEEE 1366 RELIABILITY ENGINE (SAIFI, SAIDI, CAIDI, ENS)
// DYNAMIC FILTERING & STATUTORY JERC COMPLIANCE VERIFICATION
// ============================================================================

import React, { useState, useEffect } from 'react';
import { reliabilityService } from '../../services/reliabilityService';
import { assetService } from '../../services/assetService';
import { initialSections } from '../../services/mockData';
import { Outage } from '../../types/operations';
import { Power, BarChart2, AlertOctagon, CheckCircle2, AlertTriangle, Plus, Filter, Calendar, X, Zap } from 'lucide-react';

export const OutageManager: React.FC = () => {
  const [outages, setOutages] = useState<Outage[]>(reliabilityService.getOutages());
  const [isSimActive, setIsSimActive] = useState<boolean>(assetService.isSimulatorMode());

  useEffect(() => {
    const unsub = assetService.subscribe(() => {
      setIsSimActive(assetService.isSimulatorMode());
      setOutages(reliabilityService.getOutages());
    });
    return unsub;
  }, []);

  // Dynamic Reliability Filter State
  const [selectedSection, setSelectedSection] = useState<string>('sec-mara');
  const [outageTypeFilter, setOutageTypeFilter] = useState<'ALL' | 'Planned' | 'Emergency' | 'Load Shedding'>('ALL');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-12-31');
  const [totalConsumersInput, setTotalConsumersInput] = useState<number>(4850);

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
    sectionId: 'sec-mara',
    outageType: 'Emergency',
    reason: 'Tree Branch Falling on 11kV Conductor',
    affectedConsumersCount: 320,
    durationMinutes: 45,
    energyNotServedKWh: 850,
  });

  // Dynamic IEEE 1366 Calculations
  const calculated = reliabilityService.calculateDynamicIndices({
    sectionId: selectedSection === 'ALL' ? undefined : selectedSection,
    outageType: outageTypeFilter === 'ALL' ? undefined : outageTypeFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    totalConsumers: totalConsumersInput,
  });

  // Filtered Outages Table
  const filteredOutages = outages.filter(o => {
    if (selectedSection !== 'ALL' && o.sectionId !== selectedSection) return false;
    if (outageTypeFilter !== 'ALL' && o.outageType !== outageTypeFilter) return false;
    if (startDate && new Date(o.startTime).getTime() < new Date(startDate).getTime()) return false;
    if (endDate && new Date(o.startTime).getTime() > new Date(endDate).getTime()) return false;
    return true;
  });

  const handleCreateOutage = (e: React.FormEvent) => {
    e.preventDefault();
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
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white font-extrabold flex items-center justify-center text-lg shadow-xs flex-shrink-0">
            <Power className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
                Outage Management & IEEE 1366 Reliability Indices
              </h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                IEEE 1366 STANDARD
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">
              Benchmark Indices: SAIFI, SAIDI, CAIDI & Energy Not Served (ENS in MWh)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono self-start sm:self-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Outage Event</span>
          </button>

          <span
            className={`px-3 py-1.5 rounded-xl border font-bold flex items-center space-x-1 ${
              calculated.jercCompliance.status === 'COMPLIANT'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {calculated.jercCompliance.status === 'COMPLIANT' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span>JERC Status: {calculated.jercCompliance.status}</span>
          </span>
        </div>
      </div>

      {/* IEEE 1366 KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-500 font-medium font-mono uppercase">SAIFI (Avg Frequency)</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border font-mono ${calculated.jercCompliance.saifiCompliant ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
              Target: &lt; 2.0
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-950 font-mono mt-1 tracking-tight">
            {calculated.saifi}
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Interruptions / consumer / yr</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-500 font-medium font-mono uppercase">SAIDI (Avg Duration)</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border font-mono ${calculated.jercCompliance.saidiCompliant ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
              Target: &lt; 180m
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-600 font-mono mt-1 tracking-tight">
            {calculated.saidi} min
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Outage duration / consumer</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="text-[11px] text-neutral-500 font-medium font-mono uppercase">CAIDI (Customer Avg)</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono mt-1 tracking-tight">
            {calculated.caidi} min
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Restoration time / interruption</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="text-[11px] text-neutral-500 font-medium font-mono uppercase">Energy Not Served (ENS)</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-mono mt-1 tracking-tight">
            {calculated.ensMWh} MWh
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Total unserved energy volume</div>
        </div>
      </div>

      {/* Dynamic Reliability Controls Filter Panel */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider flex items-center space-x-2">
            <Filter className="w-4 h-4 text-neutral-700" />
            <span>Dynamic Reliability Filters & Boundary Scoping</span>
          </h3>
          <span className="text-[10px] text-neutral-500 font-mono">
            Events Analyzed: <b className="text-neutral-900">{calculated.totalOutages}</b> | Customer-Minutes: <b className="text-neutral-900">{calculated.totalCustomerMinutes}</b>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] text-neutral-600 font-medium mb-1 font-mono">Target O&M Section</label>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono focus:bg-white focus:outline-none focus:border-neutral-900"
            >
              <option value="ALL">All Sections (Entire Division)</option>
              {initialSections.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-neutral-600 font-medium mb-1 font-mono">Outage Classification</label>
            <select
              value={outageTypeFilter}
              onChange={e => setOutageTypeFilter(e.target.value as any)}
              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono focus:bg-white focus:outline-none focus:border-neutral-900"
            >
              <option value="ALL">All Outage Types</option>
              <option value="Emergency">Emergency Outage</option>
              <option value="Planned">Planned Maintenance</option>
              <option value="Load Shedding">Load Shedding</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-neutral-600 font-medium mb-1 font-mono">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono focus:bg-white focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div>
            <label className="block text-[11px] text-neutral-600 font-medium mb-1 font-mono">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono focus:bg-white focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div>
            <label className="block text-[11px] text-neutral-600 font-medium mb-1 font-mono">Consumers Served (N)</label>
            <input
              type="number"
              value={totalConsumersInput}
              onChange={e => setTotalConsumersInput(parseInt(e.target.value) || 1)}
              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono focus:bg-white focus:outline-none focus:border-neutral-900"
            />
          </div>
        </div>
      </div>

      {/* Active Interruption Events Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider flex items-center space-x-2">
            <AlertOctagon className="w-4 h-4 text-rose-600" />
            <span>Interruption & Outage Register ({filteredOutages.length} Records)</span>
          </h3>
          <span className="text-[10px] text-neutral-500 font-mono">Filtered view matching current criteria</span>
        </div>

        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-600 font-mono text-[10px] uppercase tracking-wider border-b border-neutral-200">
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
              <tbody className="divide-y divide-neutral-100 font-mono text-neutral-700">
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
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300 uppercase">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredOutages.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <Power className="w-5 h-5 text-slate-400" />
                        </div>
                        <p className="font-semibold text-sm text-slate-700">No active outage incidents in view</p>
                        <p className="text-xs text-slate-400 max-w-md">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-sm text-neutral-950 font-mono uppercase flex items-center space-x-2">
                <Power className="w-4 h-4 text-rose-600" />
                <span>Log Interruption / Outage Record</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOutage} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[11px] text-neutral-600 font-bold mb-1">Target Section</label>
                <select
                  value={newOutage.sectionId}
                  onChange={e => setNewOutage({ ...newOutage, sectionId: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900"
                >
                  {initialSections.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-600 font-bold mb-1">Outage Type</label>
                <select
                  value={newOutage.outageType}
                  onChange={e => setNewOutage({ ...newOutage, outageType: e.target.value as any })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900"
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
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900"
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
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-600 font-bold mb-1">Duration (min)</label>
                  <input
                    type="number"
                    min={1}
                    value={newOutage.durationMinutes}
                    onChange={e => setNewOutage({ ...newOutage, durationMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-600 font-bold mb-1">Est. ENS (kWh)</label>
                  <input
                    type="number"
                    min={0}
                    value={newOutage.energyNotServedKWh}
                    onChange={e => setNewOutage({ ...newOutage, energyNotServedKWh: parseInt(e.target.value) || 0 })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold cursor-pointer shadow-xs"
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

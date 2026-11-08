// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// OUTAGE MANAGEMENT & IEEE 1366 RELIABILITY ENGINE (SAIFI, SAIDI, CAIDI, ENS)
// PURE WHITE THEME & JERC THRESHOLD COMPLIANCE
// ============================================================================

import React, { useState } from 'react';
import { reliabilityService } from '../../services/reliabilityService';
import { initialOutages, initialSections } from '../../services/mockData';
import { Outage, OutageReliabilityMetrics } from '../../types/operations';
import { Power, BarChart2, AlertOctagon, CheckCircle2 } from 'lucide-react';

export const OutageManager: React.FC = () => {
  const [outages, setOutages] = useState<Outage[]>(initialOutages);
  const [metrics, setMetrics] = useState<OutageReliabilityMetrics[]>(reliabilityService.getMetrics());

  // Interactive Section Reliability Calculator
  const [selectedSection, setSelectedSection] = useState<string>('sec-mara');
  const [totalConsumersInput, setTotalConsumersInput] = useState<number>(4850);

  const calculated = reliabilityService.calculateSectionIndices(selectedSection, totalConsumersInput);

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
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>JERC Benchmark Compliant</span>
          </span>
        </div>
      </div>

      {/* IEEE 1366 KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="text-[11px] text-neutral-500 font-medium font-mono uppercase">SAIFI (Avg Frequency)</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-950 font-mono mt-1 tracking-tight">
            {calculated.saifi}
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Interruptions / consumer / yr</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="text-[11px] text-neutral-500 font-medium font-mono uppercase">SAIDI (Avg Duration)</div>
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

      {/* Section Calculator Controls */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-neutral-700" />
            <span>Configurable Section Reliability Calculation</span>
          </h3>
          <span className="text-[10px] text-neutral-500 font-mono">Dynamic Simulation Engine</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-neutral-600 font-medium mb-1 font-mono">Target O&M Section</label>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono focus:bg-white focus:outline-none focus:border-neutral-900"
            >
              {initialSections.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-neutral-600 font-medium mb-1 font-mono">Total Active Consumers Served (N)</label>
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
        <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider flex items-center space-x-2">
          <AlertOctagon className="w-4 h-4 text-rose-600" />
          <span>Active Interruption & Outage Register</span>
        </h3>

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
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono text-neutral-700">
                {outages.map(o => (
                  <tr key={o.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="p-3 font-bold text-neutral-950">{o.outageCode}</td>
                    <td className="p-3 text-neutral-900 font-sans">{o.reason} ({o.outageType})</td>
                    <td className="p-3 text-neutral-950 font-bold">{o.affectedConsumersCount}</td>
                    <td className="p-3 text-neutral-700">{o.durationMinutes} min</td>
                    <td className="p-3 text-neutral-950 font-bold">{o.energyNotServedKWh} kWh</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300 uppercase">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// OUTAGE MANAGEMENT & IEEE 1366 RELIABILITY ENGINE (SAIFI, SAIDI, CAIDI, ENS)
// ============================================================================

import React, { useState } from 'react';
import { reliabilityService } from '../../services/reliabilityService';
import { initialOutages, initialSections } from '../../services/mockData';
import { Outage, OutageReliabilityMetrics } from '../../types/operations';
import {
  Power, Activity, BarChart2, Clock, Users, Zap, CheckCircle2, AlertOctagon
} from 'lucide-react';

export const OutageManager: React.FC = () => {
  const [outages, setOutages] = useState<Outage[]>(initialOutages);
  const [metrics, setMetrics] = useState<OutageReliabilityMetrics[]>(reliabilityService.getMetrics());

  // Interactive Section Reliability Calculator
  const [selectedSection, setSelectedSection] = useState<string>('sec-mara');
  const [totalConsumersInput, setTotalConsumersInput] = useState<number>(4850);

  const calculated = reliabilityService.calculateSectionIndices(selectedSection, totalConsumersInput);

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Power className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">Outage Management & Grid Reliability Analytics</h2>
            <p className="text-xs text-slate-400">IEEE 1366 Benchmark Indices: SAIFI, SAIDI, CAIDI, MAIFI & ENS</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            IEEE 1366 Compliant
          </span>
        </div>
      </div>

      {/* IEEE 1366 KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#0e1626] border border-slate-800 shadow-lg">
          <div className="text-[11px] text-slate-400 font-medium">SAIFI (System Avg Frequency)</div>
          <div className="text-2xl font-bold text-sky-400 font-mono mt-1">{calculated.saifi}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Interruptions / consumer / yr</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1626] border border-slate-800 shadow-lg">
          <div className="text-[11px] text-slate-400 font-medium">SAIDI (System Avg Duration)</div>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1">{calculated.saidi} min</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Customer outage minutes / yr</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1626] border border-slate-800 shadow-lg">
          <div className="text-[11px] text-slate-400 font-medium">CAIDI (Customer Avg Duration)</div>
          <div className="text-2xl font-bold text-purple-400 font-mono mt-1">{calculated.caidi} min</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Restoration time per interruption</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1626] border border-slate-800 shadow-lg">
          <div className="text-[11px] text-slate-400 font-medium">Energy Not Served (ENS)</div>
          <div className="text-2xl font-bold text-rose-400 font-mono mt-1">{calculated.ensMWh} MWh</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Total unserved energy volume</div>
        </div>
      </div>

      {/* Section Calculator Controls */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center space-x-1.5">
            <BarChart2 className="w-4 h-4 text-sky-400" />
            <span>Configurable Section Reliability Calculation</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">Dynamic Simulation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">Target O&M Section</label>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              className="w-full bg-[#0a101b] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
            >
              {initialSections.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">Total Active Consumers Served (N)</label>
            <input
              type="number"
              value={totalConsumersInput}
              onChange={e => setTotalConsumersInput(parseInt(e.target.value) || 1)}
              className="w-full bg-[#0a101b] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Active Interruption Events Table */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
        <h3 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center space-x-1.5">
          <AlertOctagon className="w-4 h-4 text-rose-400" />
          <span>Active Interruption & Outage Register</span>
        </h3>

        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#090f1a] text-slate-400 font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-2.5">Outage ID</th>
                <th className="p-2.5">Classification</th>
                <th className="p-2.5">Affected Consumers</th>
                <th className="p-2.5">Duration (min)</th>
                <th className="p-2.5">Est. ENS (kWh)</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {outages.map(o => (
                <tr key={o.id} className="hover:bg-slate-800/40">
                  <td className="p-2.5 font-bold text-sky-400">{o.outageCode}</td>
                  <td className="p-2.5 text-slate-200 font-sans">{o.reason} ({o.outageType})</td>
                  <td className="p-2.5 text-amber-300 font-bold">{o.affectedConsumersCount}</td>
                  <td className="p-2.5 text-slate-300">{o.durationMinutes} min</td>
                  <td className="p-2.5 text-rose-300">{o.energyNotServedKWh} kWh</td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 uppercase">
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
  );
};

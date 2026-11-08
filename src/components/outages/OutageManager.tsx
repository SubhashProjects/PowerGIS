// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// OUTAGE MANAGEMENT & IEEE 1366 RELIABILITY ENGINE (SAIFI, SAIDI, CAIDI, ENS)
// MONOCHROME B&W THEME
// ============================================================================

import React, { useState } from 'react';
import { reliabilityService } from '../../services/reliabilityService';
import { initialOutages, initialSections } from '../../services/mockData';
import { Outage, OutageReliabilityMetrics } from '../../types/operations';
import { Power, BarChart2, AlertOctagon } from 'lucide-react';

export const OutageManager: React.FC = () => {
  const [outages, setOutages] = useState<Outage[]>(initialOutages);
  const [metrics, setMetrics] = useState<OutageReliabilityMetrics[]>(reliabilityService.getMetrics());

  // Interactive Section Reliability Calculator
  const [selectedSection, setSelectedSection] = useState<string>('sec-mara');
  const [totalConsumersInput, setTotalConsumersInput] = useState<number>(4850);

  const calculated = reliabilityService.calculateSectionIndices(selectedSection, totalConsumersInput);

  return (
    <div className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 text-neutral-100 select-none">
      {/* Top Banner */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white text-black font-extrabold flex items-center justify-center text-xl shadow-lg shadow-white/10 flex-shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Outage Management & Grid Reliability</h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md bg-neutral-900 text-white border border-neutral-700">
                IEEE 1366 STANDARD
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5 font-mono">
              Benchmark Indices: SAIFI, SAIDI, CAIDI, MAIFI & Energy Not Served (ENS)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono self-start sm:self-auto">
          <span className="px-3 py-1.5 rounded-xl bg-neutral-900 text-neutral-200 border border-neutral-800 font-bold">
            JERC Threshold Compliant
          </span>
        </div>
      </div>

      {/* IEEE 1366 KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-[#0a0a0a] border border-neutral-800 shadow-xl">
          <div className="text-[11px] text-neutral-400 font-medium font-mono uppercase">SAIFI (Avg Frequency)</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1 tracking-tight">{calculated.saifi}</div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Interruptions / consumer / yr</div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#0a0a0a] border border-neutral-800 shadow-xl">
          <div className="text-[11px] text-neutral-400 font-medium font-mono uppercase">SAIDI (Avg Duration)</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1 tracking-tight">{calculated.saidi} min</div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Outage duration / consumer</div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#0a0a0a] border border-neutral-800 shadow-xl">
          <div className="text-[11px] text-neutral-400 font-medium font-mono uppercase">CAIDI (Customer Avg)</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1 tracking-tight">{calculated.caidi} min</div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Restoration time / interruption</div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#0a0a0a] border border-neutral-800 shadow-xl">
          <div className="text-[11px] text-neutral-400 font-medium font-mono uppercase">Energy Not Served (ENS)</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1 tracking-tight">{calculated.ensMWh} MWh</div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Total unserved energy volume</div>
        </div>
      </div>

      {/* Section Calculator Controls */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-white" />
            <span>Configurable Section Reliability Calculation</span>
          </h3>
          <span className="text-[10px] text-neutral-400 font-mono">Dynamic Simulation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-neutral-400 font-medium mb-1 font-mono">Target O&M Section</label>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              {initialSections.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-neutral-400 font-medium mb-1 font-mono">Total Active Consumers Served (N)</label>
            <input
              type="number"
              value={totalConsumersInput}
              onChange={e => setTotalConsumersInput(parseInt(e.target.value) || 1)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Active Interruption Events Table */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center space-x-2">
          <AlertOctagon className="w-4 h-4 text-white" />
          <span>Active Interruption & Outage Register</span>
        </h3>

        <div className="border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#111111] text-neutral-400 font-mono text-[10px] uppercase tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="p-3">Outage ID</th>
                  <th className="p-3">Classification</th>
                  <th className="p-3">Affected Consumers</th>
                  <th className="p-3">Duration (min)</th>
                  <th className="p-3">Est. ENS (kWh)</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 font-mono text-neutral-300">
                {outages.map(o => (
                  <tr key={o.id} className="hover:bg-neutral-900/60 transition-colors">
                    <td className="p-3 font-bold text-white">{o.outageCode}</td>
                    <td className="p-3 text-neutral-200 font-sans">{o.reason} ({o.outageType})</td>
                    <td className="p-3 text-white font-bold">{o.affectedConsumersCount}</td>
                    <td className="p-3 text-neutral-300">{o.durationMinutes} min</td>
                    <td className="p-3 text-white">{o.energyNotServedKWh} kWh</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 text-white border border-neutral-700 uppercase">
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

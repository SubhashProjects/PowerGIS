// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SMART METER MANAGEMENT & ADVANCED METERING INFRASTRUCTURE (AMI)
// MONOCHROME B&W THEME
// ============================================================================

import React from 'react';
import { assetService } from '../../services/assetService';
import { dataExchangeService } from '../../services/dataExchangeService';
import { Gauge, CheckCircle2, Radio, Download } from 'lucide-react';

export const SmartMeterDashboard: React.FC = () => {
  const consumers = assetService.getConsumers();
  const smartMeters = assetService.getSmartMeters();
  const conventional = assetService.getConventionalMeters();

  const smartMeterPercentage = consumers.length > 0 ? Math.round((smartMeters.length / consumers.length) * 100) : 0;

  return (
    <div className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 text-neutral-100 select-none">
      {/* Header */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white text-black font-extrabold flex items-center justify-center text-xl shadow-lg shadow-white/10 flex-shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Smart Meter (AMI) Rollout & Mapping</h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md bg-neutral-900 text-white border border-neutral-700">
                RDSS AMI GRID
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5 font-mono">
              Section-wise Installation Progress • Pole-to-Meter Spatial Verification
            </p>
          </div>
        </div>

        <button
          onClick={() => dataExchangeService.exportCSV('consumers')}
          className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-white/10 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Consumers CSV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-[#0a0a0a] border border-neutral-800 shadow-xl">
          <div className="text-[11px] text-neutral-400 font-medium uppercase font-mono">Total Premises Mapped</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1 tracking-tight">{consumers.length}</div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Spatially mapped premises</div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#0a0a0a] border border-neutral-800 shadow-xl">
          <div className="text-[11px] text-neutral-400 font-medium uppercase font-mono">Smart Meters Installed</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1 tracking-tight">{smartMeters.length}</div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Communicating via RF Mesh / 4G</div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#0a0a0a] border border-neutral-800 shadow-xl">
          <div className="text-[11px] text-neutral-400 font-medium uppercase font-mono">Conventional Meters</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-300 font-mono mt-1 tracking-tight">{conventional.length}</div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Pending smart replacement</div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#0a0a0a] border border-neutral-800 shadow-xl">
          <div className="text-[11px] text-neutral-400 font-medium uppercase font-mono">Rollout Coverage</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1 tracking-tight">{smartMeterPercentage}%</div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Town & Boulevard Sections</div>
        </div>
      </div>

      {/* Meter List Table */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <h3 className="font-bold text-xs text-white uppercase tracking-wider">
          Consumer Smart Meter Register
        </h3>

        <div className="border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#111111] text-neutral-400 font-mono text-[10px] uppercase tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="p-3">Consumer #</th>
                  <th className="p-3">Premise Name</th>
                  <th className="p-3">Meter Number</th>
                  <th className="p-3">Make</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Sanctioned kW</th>
                  <th className="p-3">AMI Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 font-mono text-neutral-300">
                {consumers.map(c => (
                  <tr key={c.id} className="hover:bg-neutral-900/60 transition-colors">
                    <td className="p-3 font-bold text-white">{c.consumerNumber}</td>
                    <td className="p-3 text-neutral-100 font-sans font-semibold">{c.name}</td>
                    <td className="p-3 text-neutral-300">{c.meterNumber}</td>
                    <td className="p-3 font-sans text-neutral-400">{c.meterMake || 'L&T'}</td>
                    <td className="p-3 text-neutral-300">{c.category}</td>
                    <td className="p-3 text-neutral-200">{c.sanctionedLoadKW} kW</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.isSmartMeter
                          ? 'bg-white text-black font-extrabold'
                          : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                      }`}>
                        {c.isSmartMeter ? 'SMART (ONLINE)' : 'CONVENTIONAL'}
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

// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SMART METER MANAGEMENT & ADVANCED METERING INFRASTRUCTURE (AMI)
// ============================================================================

import React from 'react';
import { assetService } from '../../services/assetService';
import { Gauge, CheckCircle2, AlertTriangle, Radio, Activity, Download } from 'lucide-react';

export const SmartMeterDashboard: React.FC = () => {
  const consumers = assetService.getConsumers();
  const smartMeters = assetService.getSmartMeters();
  const conventional = assetService.getConventionalMeters();

  const smartMeterPercentage = consumers.length > 0 ? Math.round((smartMeters.length / consumers.length) * 100) : 0;

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">Smart Meter (AMI) Rollout & Consumer Mapping</h2>
            <p className="text-xs text-slate-400">Section-wise Installation Progress • Pole-to-Meter Verification</p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs border border-emerald-500/20">
          RDSS Smart Grid
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#0e1626] border border-slate-800 shadow-lg">
          <div className="text-[11px] text-slate-400 font-medium">Total Consumers Mapped</div>
          <div className="text-2xl font-bold text-white font-mono mt-1">{consumers.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Spatially mapped premises</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1626] border border-slate-800 shadow-lg">
          <div className="text-[11px] text-slate-400 font-medium">Smart Meters Installed</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">{smartMeters.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Communicating via RF Mesh / 4G</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1626] border border-slate-800 shadow-lg">
          <div className="text-[11px] text-slate-400 font-medium">Conventional Meters</div>
          <div className="text-2xl font-bold text-slate-300 font-mono mt-1">{conventional.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Pending smart replacement</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1626] border border-slate-800 shadow-lg">
          <div className="text-[11px] text-slate-400 font-medium">Rollout Coverage</div>
          <div className="text-2xl font-bold text-sky-400 font-mono mt-1">{smartMeterPercentage}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Town & Boulevard Sections</div>
        </div>
      </div>

      {/* Meter List Table */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
        <h3 className="font-semibold text-xs text-white uppercase tracking-wider">
          Consumer Smart Meter Register
        </h3>

        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#090f1a] text-slate-400 font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-2.5">Consumer #</th>
                <th className="p-2.5">Premise Name</th>
                <th className="p-2.5">Meter Number</th>
                <th className="p-2.5">Make</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Sanctioned kW</th>
                <th className="p-2.5">AMI Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {consumers.map(c => (
                <tr key={c.id} className="hover:bg-slate-800/40">
                  <td className="p-2.5 font-bold text-sky-400">{c.consumerNumber}</td>
                  <td className="p-2.5 text-slate-200 font-sans font-semibold">{c.name}</td>
                  <td className="p-2.5 text-slate-300">{c.meterNumber}</td>
                  <td className="p-2.5 font-sans text-slate-400">{c.meterMake || 'L&T'}</td>
                  <td className="p-2.5 text-slate-300">{c.category}</td>
                  <td className="p-2.5 text-slate-200">{c.sanctionedLoadKW} kW</td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.isSmartMeter ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
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
  );
};

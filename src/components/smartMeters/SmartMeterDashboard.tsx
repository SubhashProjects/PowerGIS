// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SMART METER MANAGEMENT & ADVANCED METERING INFRASTRUCTURE (AMI)
// PURE WHITE THEME & SECTION-WISE ROLLOUT COVERAGE
// ============================================================================

import React, { useState, useEffect } from 'react';
import { assetService } from '../../services/assetService';
import { dataExchangeService } from '../../services/dataExchangeService';
import { Gauge, CheckCircle2, Radio, Download, Zap } from 'lucide-react';

export const SmartMeterDashboard: React.FC = () => {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const unsub = assetService.subscribe(() => {
      setVersion(v => v + 1);
    });
    return unsub;
  }, []);

  const isSim = assetService.isSimulatorMode();
  const consumers = assetService.getConsumers();
  const smartMeters = assetService.getSmartMeters();
  const conventional = assetService.getConventionalMeters();

  const smartMeterPercentage = consumers.length > 0 ? Math.round((smartMeters.length / consumers.length) * 100) : 0;

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-neutral-900 select-none">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white font-extrabold flex items-center justify-center text-lg shadow-xs flex-shrink-0">
            <Gauge className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
                Smart Meter (AMI) Rollout & Geographic Mapping
              </h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                RDSS AMI GRID
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">
              Section-wise Installation Progress · Pole-to-Meter Spatial Verification · RF Mesh / 4G
            </p>
          </div>
        </div>

        <button
          onClick={() => dataExchangeService.exportCSV('consumers')}
          className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Consumers CSV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="text-[11px] text-neutral-500 font-medium uppercase font-mono">Total Premises Mapped</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-950 font-mono mt-1 tracking-tight">
            {consumers.length}
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Spatially mapped premises</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="text-[11px] text-neutral-500 font-medium uppercase font-mono">Smart Meters Installed</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-600 font-mono mt-1 tracking-tight">
            {smartMeters.length}
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Communicating via RF Mesh / 4G</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="text-[11px] text-neutral-500 font-medium uppercase font-mono">Conventional Meters</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono mt-1 tracking-tight">
            {conventional.length}
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Pending smart replacement</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="text-[11px] text-neutral-500 font-medium uppercase font-mono">Rollout Coverage</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono mt-1 tracking-tight">
            {smartMeterPercentage}%
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Town & Boulevard Sections</div>
        </div>
      </div>

      {/* Meter List Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
          <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">
            Consumer Smart Meter Register
          </h3>
          <span className="text-[10px] text-neutral-500 font-mono">
            {consumers.length > 0 ? 'Active Verification' : 'Clean Standby'}
          </span>
        </div>

        {consumers.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
              <Gauge className="w-6 h-6 text-slate-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">0 Meter Records in Clean Operational Mode</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All pre-seeded simulated consumers and smart AMI meters have been moved to the Simulator. Upload your real KML/GeoJSON/CSV consumer files in Backup & Data Exchange, or turn ON the Simulator to test smart meter telemetry.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => assetService.setSimulatorMode(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>⚡ Turn ON Smart Meter Simulator</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-600 font-mono text-[10px] uppercase tracking-wider border-b border-neutral-200">
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
                <tbody className="divide-y divide-neutral-100 font-mono text-neutral-700">
                  {consumers.map(c => (
                    <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="p-3 font-bold text-neutral-950">{c.consumerNumber}</td>
                      <td className="p-3 text-neutral-900 font-sans font-semibold">{c.name}</td>
                      <td className="p-3 text-neutral-600">{c.meterNumber}</td>
                      <td className="p-3 font-sans text-neutral-500">{c.meterMake || 'L&T'}</td>
                      <td className="p-3 text-neutral-600">{c.category}</td>
                      <td className="p-3 text-neutral-950 font-bold">{c.sanctionedLoadKW} kW</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          c.isSmartMeter
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-neutral-100 text-neutral-600 border-neutral-200'
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
        )}
      </div>
    </div>
  );
};

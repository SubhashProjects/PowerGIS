// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SMART METER MANAGEMENT & ADVANCED METERING INFRASTRUCTURE (AMI)
// HIGH-CRAFT MINIMALIST SWISS UTILITY INTERFACE - BLOBLESS, ZERO-GRADIENT
// ============================================================================

import React, { useState, useEffect } from 'react';
import { assetService } from '../../services/assetService';
import { dataExchangeService } from '../../services/dataExchangeService';
import { COMMONS } from '../../commons';
import { Gauge, Download, Zap } from 'lucide-react';

export const SmartMeterDashboard: React.FC = () => {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const unsub = assetService.subscribe(() => {
      setVersion(v => v + 1);
    });
    return unsub;
  }, []);

  const consumers = assetService.getConsumers();
  const smartMeters = assetService.getSmartMeters();
  const conventional = assetService.getConventionalMeters();

  const smartMeterPercentage = consumers.length > 0 ? Math.round((smartMeters.length / consumers.length) * 100) : 0;

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-[#09090B]">
      {/* Header */}
      <div className="bg-white border border-zinc-200 rounded-md p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#09090B] text-white flex items-center justify-center font-bold text-base border border-zinc-800 flex-shrink-0">
            <Gauge className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-[#09090B] tracking-tight">
                {COMMONS.labels.smartMeters.title}
              </h1>
              <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                RDSS AMI GRID
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              {COMMONS.labels.smartMeters.subtitle}
            </p>
          </div>
        </div>

        <button
          onClick={() => dataExchangeService.exportCSV('consumers')}
          className="px-3.5 py-1.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white text-xs font-medium flex items-center space-x-1.5 border border-zinc-900 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Consumers CSV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-md bg-white border border-zinc-200">
          <div className="text-[10px] text-zinc-500 font-medium uppercase font-mono">Total Premises Mapped</div>
          <div className="text-2xl font-bold text-[#09090B] font-mono mt-1 tracking-tight">
            {consumers.length}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">Spatially mapped premises</div>
        </div>

        <div className="p-4 rounded-md bg-white border border-zinc-200">
          <div className="text-[10px] text-zinc-500 font-medium uppercase font-mono">Smart Meters Installed</div>
          <div className="text-2xl font-bold text-[#09090B] font-mono mt-1 tracking-tight">
            {smartMeters.length}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">Communicating via RF Mesh / 4G</div>
        </div>

        <div className="p-4 rounded-md bg-white border border-zinc-200">
          <div className="text-[10px] text-zinc-500 font-medium uppercase font-mono">Conventional Meters</div>
          <div className="text-2xl font-bold text-zinc-700 font-mono mt-1 tracking-tight">
            {conventional.length}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">Pending smart replacement</div>
        </div>

        <div className="p-4 rounded-md bg-white border border-zinc-200">
          <div className="text-[10px] text-zinc-500 font-medium uppercase font-mono">Rollout Coverage</div>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-1 tracking-tight">
            {smartMeterPercentage}%
          </div>
          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">Town & Boulevard Sections</div>
        </div>
      </div>

      {/* Meter List Table */}
      <div className="bg-white border border-zinc-200 rounded-md p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
          <h3 className="font-semibold text-xs text-[#09090B] uppercase tracking-wider font-mono">
            Consumer Smart Meter Register
          </h3>
          <span className="text-[10px] text-zinc-500 font-mono">
            {consumers.length > 0 ? 'Active Verification' : 'Clean Standby'}
          </span>
        </div>

        {consumers.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-md bg-zinc-50 border border-zinc-200 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-zinc-400">
              <Gauge className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-[#09090B]">0 Meter Records in Clean Operational Mode</h4>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                All pre-seeded simulated consumers and smart AMI meters have been moved to the Simulator. Upload your real KML/GeoJSON/CSV consumer files in Backup & Data Exchange, or turn ON the Simulator to test smart meter telemetry.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => assetService.setSimulatorMode(true)}
                className="px-3.5 py-1.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white font-medium text-xs border border-zinc-900 transition-colors flex items-center space-x-2 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Turn ON Smart Meter Simulator</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-zinc-200 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 text-zinc-600 font-mono text-[10px] uppercase tracking-wider border-b border-zinc-200">
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
                <tbody className="divide-y divide-zinc-100 font-mono text-zinc-700">
                  {consumers.map(c => (
                    <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-3 font-semibold text-[#09090B]">{c.consumerNumber}</td>
                      <td className="p-3 text-zinc-900 font-sans font-medium">{c.name}</td>
                      <td className="p-3 text-zinc-600">{c.meterNumber}</td>
                      <td className="p-3 font-sans text-zinc-500">{c.meterMake || 'L&T'}</td>
                      <td className="p-3 text-zinc-600">{c.category}</td>
                      <td className="p-3 text-[#09090B] font-semibold">{c.sanctionedLoadKW} kW</td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          c.isSmartMeter
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-zinc-100 text-zinc-700 border-zinc-200'
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

// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// WARRANTY & EQUIPMENT LIFECYCLE REGISTER - MONOCHROME B&W THEME
// 30/60/90-Day Expiry Alerts • Batch Warranties • Useful Life Depreciation
// ============================================================================

import React, { useState } from 'react';
import { assetService } from '../../services/assetService';
import { ShieldCheck, AlertCircle, Clock, CheckCircle2, Calendar, FileText } from 'lucide-react';

export const WarrantyRegister: React.FC = () => {
  const warranties = assetService.getWarranties();
  const lifecycles = assetService.getLifecycles();

  const [filterMode, setFilterMode] = useState<'all' | 'expiring' | 'lifecycle'>('expiring');

  const expiringSoon = warranties.filter(w => w.daysToExpiry <= 60);

  return (
    <div className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 text-neutral-100 select-none">
      {/* Top Banner */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white text-black font-extrabold flex items-center justify-center text-xl shadow-lg shadow-white/10 flex-shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Warranty & Equipment Lifecycle Register</h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md bg-neutral-900 text-white border border-neutral-700">
                OEM GUARANTEES
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5 font-mono">
              Advance Expiry Alerts (30/60/90 Days) • Manufacturer Guarantees & Depreciation
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto text-xs font-semibold">
          <button
            onClick={() => setFilterMode('expiring')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              filterMode === 'expiring' ? 'bg-white text-black font-bold shadow-md' : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            Expiring Soon ({expiringSoon.length})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              filterMode === 'all' ? 'bg-white text-black font-bold shadow-md' : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            All Warranties ({warranties.length})
          </button>
          <button
            onClick={() => setFilterMode('lifecycle')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              filterMode === 'lifecycle' ? 'bg-white text-black font-bold shadow-md' : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            Asset Lifecycle ({lifecycles.length})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        {filterMode !== 'lifecycle' ? (
          <div>
            <h3 className="font-bold text-xs text-white uppercase tracking-wider mb-3">
              Equipment Warranty Records
            </h3>

            <div className="border border-neutral-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#111111] text-neutral-400 font-mono text-[10px] uppercase tracking-wider border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Asset Code</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Manufacturer</th>
                      <th className="p-3">Commencement</th>
                      <th className="p-3">Expiry Date</th>
                      <th className="p-3">Days Left</th>
                      <th className="p-3">Warranty Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850 font-mono text-neutral-300">
                    {(filterMode === 'expiring' ? expiringSoon : warranties).map(w => {
                      const isUrgent = w.daysToExpiry <= 30;
                      return (
                        <tr key={w.id} className="hover:bg-neutral-900/60 transition-colors">
                          <td className="p-3 font-bold text-white">{w.equipmentCode}</td>
                          <td className="p-3 text-neutral-200 font-sans">{w.equipmentType}</td>
                          <td className="p-3 font-sans text-neutral-400">{w.manufacturer}</td>
                          <td className="p-3 text-neutral-400">{w.commencementDate}</td>
                          <td className="p-3 text-neutral-200">{w.expiryDate}</td>
                          <td className="p-3 font-bold">
                            <span className={isUrgent ? 'text-white underline' : 'text-neutral-300'}>
                              {w.daysToExpiry} days
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-900 text-white border border-neutral-700">
                              {w.claimStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="font-bold text-xs text-white uppercase tracking-wider mb-3">
              Equipment Lifecycle & Aging Register
            </h3>

            <div className="border border-neutral-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#111111] text-neutral-400 font-mono text-[10px] uppercase tracking-wider border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Asset Code</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Install Date</th>
                      <th className="p-3">Design Life</th>
                      <th className="p-3">Current Age</th>
                      <th className="p-3">Condition Index</th>
                      <th className="p-3">Replacement Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850 font-mono text-neutral-300">
                    {lifecycles.map(l => (
                      <tr key={l.id} className="hover:bg-neutral-900/60 transition-colors">
                        <td className="p-3 font-bold text-white">{l.assetCode}</td>
                        <td className="p-3 text-neutral-200 font-sans">{l.assetType}</td>
                        <td className="p-3 text-neutral-400">{l.installationDate}</td>
                        <td className="p-3 text-neutral-400">{l.expectedLifeYears} Years</td>
                        <td className="p-3 text-neutral-100 font-bold">{l.currentAgeYears} Yrs</td>
                        <td className="p-3 text-white font-mono">{l.conditionScore} / 100</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            l.replacementPriority === 'High' || l.replacementPriority === 'Critical'
                              ? 'bg-white text-black font-extrabold'
                              : 'bg-neutral-900 text-neutral-300 border border-neutral-800'
                          }`}>
                            {l.replacementPriority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

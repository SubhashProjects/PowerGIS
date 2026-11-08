// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// WARRANTY & EQUIPMENT LIFECYCLE REGISTER
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
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">Warranty & Equipment Lifecycle Register</h2>
            <p className="text-xs text-slate-400">Advance Expiry Alerts (30/60/90 Days) • OEM Manufacturer Guarantees</p>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setFilterMode('expiring')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'expiring' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Expiring Soon ({expiringSoon.length})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'all' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            All Warranties ({warranties.length})
          </button>
          <button
            onClick={() => setFilterMode('lifecycle')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'lifecycle' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Asset Lifecycle ({lifecycles.length})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
        {filterMode !== 'lifecycle' ? (
          <div>
            <h3 className="font-semibold text-xs text-white uppercase tracking-wider mb-2">
              Equipment Warranty Records
            </h3>

            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#090f1a] text-slate-400 font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Asset Code</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Manufacturer</th>
                    <th className="p-2.5">Commencement</th>
                    <th className="p-2.5">Expiry Date</th>
                    <th className="p-2.5">Days Left</th>
                    <th className="p-2.5">Warranty Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {(filterMode === 'expiring' ? expiringSoon : warranties).map(w => {
                    const isUrgent = w.daysToExpiry <= 30;
                    return (
                      <tr key={w.id} className="hover:bg-slate-800/40">
                        <td className="p-2.5 font-bold text-sky-400">{w.equipmentCode}</td>
                        <td className="p-2.5 text-slate-300 font-sans">{w.equipmentType}</td>
                        <td className="p-2.5 font-sans text-slate-400">{w.manufacturer}</td>
                        <td className="p-2.5 text-slate-400">{w.commencementDate}</td>
                        <td className="p-2.5 text-slate-200">{w.expiryDate}</td>
                        <td className="p-2.5 font-bold">
                          <span className={isUrgent ? 'text-rose-400' : 'text-amber-400'}>
                            {w.daysToExpiry} days
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            w.daysToExpiry <= 30
                              ? 'bg-rose-500/15 text-rose-400'
                              : w.daysToExpiry <= 60
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-emerald-500/15 text-emerald-400'
                          }`}>
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
        ) : (
          <div>
            <h3 className="font-semibold text-xs text-white uppercase tracking-wider mb-2">
              Equipment Lifecycle & Aging Register
            </h3>

            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#090f1a] text-slate-400 font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Asset Code</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Install Date</th>
                    <th className="p-2.5">Design Life</th>
                    <th className="p-2.5">Current Age</th>
                    <th className="p-2.5">Condition Index</th>
                    <th className="p-2.5">Replacement Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {lifecycles.map(l => (
                    <tr key={l.id} className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold text-sky-400">{l.assetCode}</td>
                      <td className="p-2.5 text-slate-300 font-sans">{l.assetType}</td>
                      <td className="p-2.5 text-slate-400">{l.installationDate}</td>
                      <td className="p-2.5 text-slate-400">{l.expectedLifeYears} Years</td>
                      <td className="p-2.5 text-slate-200 font-bold">{l.currentAgeYears} Yrs</td>
                      <td className="p-2.5 text-amber-400">{l.conditionScore} / 100</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          l.replacementPriority === 'High' || l.replacementPriority === 'Critical'
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-emerald-500/15 text-emerald-400'
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
        )}
      </div>
    </div>
  );
};

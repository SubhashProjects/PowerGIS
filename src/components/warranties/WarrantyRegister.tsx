// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// WARRANTY & EQUIPMENT LIFECYCLE REGISTER
// PURE WHITE THEME & OEM GUARANTEE EXPIRY ALERTS
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
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-neutral-900 select-none">
      {/* Top Banner */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white font-extrabold flex items-center justify-center text-lg shadow-xs flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
                Warranty & Equipment Lifecycle Register
              </h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                OEM GUARANTEES
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">
              Advance Expiry Alerts (30/60/90 Days) · Manufacturer Guarantees & Asset Depreciation
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto text-xs font-semibold">
          <button
            onClick={() => setFilterMode('expiring')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filterMode === 'expiring'
                ? 'bg-neutral-900 text-white font-bold shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200'
            }`}
          >
            Expiring Soon ({expiringSoon.length})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-neutral-900 text-white font-bold shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200'
            }`}
          >
            All Warranties ({warranties.length})
          </button>
          <button
            onClick={() => setFilterMode('lifecycle')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filterMode === 'lifecycle'
                ? 'bg-neutral-900 text-white font-bold shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200'
            }`}
          >
            Asset Lifecycle ({lifecycles.length})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {filterMode !== 'lifecycle' ? (
          <div>
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5 mb-3">
              <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">
                Equipment Warranty Records
              </h3>
              <span className="text-[10px] text-neutral-500 font-mono">Contractual Cover</span>
            </div>

            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 text-neutral-600 font-mono text-[10px] uppercase tracking-wider border-b border-neutral-200">
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
                  <tbody className="divide-y divide-neutral-100 font-mono text-neutral-700">
                    {(filterMode === 'expiring' ? expiringSoon : warranties).map(w => {
                      const isUrgent = w.daysToExpiry <= 30;
                      return (
                        <tr key={w.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="p-3 font-bold text-neutral-950">{w.equipmentCode}</td>
                          <td className="p-3 text-neutral-900 font-sans">{w.equipmentType}</td>
                          <td className="p-3 font-sans text-neutral-500">{w.manufacturer}</td>
                          <td className="p-3 text-neutral-500">{w.commencementDate}</td>
                          <td className="p-3 text-neutral-900 font-semibold">{w.expiryDate}</td>
                          <td className="p-3 font-bold">
                            <span className={isUrgent ? 'text-rose-700 font-extrabold' : 'text-neutral-900'}>
                              {w.daysToExpiry} days
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-300">
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
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5 mb-3">
              <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">
                Equipment Lifecycle & Aging Register
              </h3>
              <span className="text-[10px] text-neutral-500 font-mono">Depreciation Schedules</span>
            </div>

            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 text-neutral-600 font-mono text-[10px] uppercase tracking-wider border-b border-neutral-200">
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
                  <tbody className="divide-y divide-neutral-100 font-mono text-neutral-700">
                    {lifecycles.map(l => (
                      <tr key={l.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="p-3 font-bold text-neutral-950">{l.assetCode}</td>
                        <td className="p-3 text-neutral-900 font-sans">{l.assetType}</td>
                        <td className="p-3 text-neutral-500">{l.installationDate}</td>
                        <td className="p-3 text-neutral-500">{l.expectedLifeYears} Years</td>
                        <td className="p-3 text-neutral-950 font-bold">{l.currentAgeYears} Yrs</td>
                        <td className="p-3 text-neutral-900 font-bold">{l.conditionScore} / 100</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            l.replacementPriority === 'High' || l.replacementPriority === 'Critical'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-neutral-100 text-neutral-700 border-neutral-200'
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

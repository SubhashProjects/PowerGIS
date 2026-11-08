// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// PREVENTIVE MAINTENANCE SCHEDULER (CONDITIONAL & CYCLICAL)
// Automatically schedules maintenance based on condition, age & seasonal weather
// ============================================================================

import React, { useState } from 'react';
import { assetService } from '../../services/assetService';
import { Calendar, CheckCircle2, Clock, Wrench, Shield, AlertTriangle } from 'lucide-react';

export const MaintenanceScheduler: React.FC = () => {
  const transformers = assetService.getTransformers();

  const [schedules, setSchedules] = useState([
    {
      id: 'sch-1',
      assetCode: 'DTR-HERI-02',
      assetName: 'French Quarter Heritage DTR 500kVA',
      maintenanceType: 'Oil Filtration & Dielectric BDV Test',
      scheduledDate: '2026-11-15',
      cycle: 'Half-Yearly',
      priority: 'High',
      triggerReason: 'Oil temperature warning & 82% continuous peak load',
      status: 'Scheduled',
    },
    {
      id: 'sch-2',
      assetCode: 'POL-MARA-001',
      assetName: 'Pole P-01/MARA (PSCC 9m)',
      maintenanceType: 'Insulator Washing & Jumper Tightening',
      scheduledDate: '2026-11-20',
      cycle: 'Pre-Monsoon Inspection',
      priority: 'Medium',
      triggerReason: 'Saline coastal humidity wash protocol',
      status: 'Scheduled',
    },
    {
      id: 'sch-3',
      assetCode: 'DTR-BLVD-01',
      assetName: 'Boulevard North DTR 250kVA',
      maintenanceType: 'Earth Pit Resistance Testing',
      scheduledDate: '2026-11-28',
      cycle: 'Annual Safety Protocol',
      priority: 'Low',
      triggerReason: 'Annual CEA statutory requirement (< 2 Ohms)',
      status: 'Scheduled',
    },
  ]);

  const handleMarkComplete = (id: string) => {
    setSchedules(prev =>
      prev.map(s => (s.id === id ? { ...s, status: 'Completed' } : s))
    );
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">Automated Preventive Maintenance Scheduler</h2>
            <p className="text-xs text-slate-400">Condition-Based Maintenance (CBM) • Pre-Monsoon Grid Hardening Schedules</p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700">
          ISO 55000 CBM
        </span>
      </div>

      {/* Schedules Table */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
        <h3 className="font-semibold text-xs text-white uppercase tracking-wider">
          Scheduled Work Schedules ({schedules.length})
        </h3>

        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#090f1a] text-slate-400 font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-2.5">Asset Code</th>
                <th className="p-2.5">Target Equipment</th>
                <th className="p-2.5">Maintenance Scope</th>
                <th className="p-2.5">Scheduled Date</th>
                <th className="p-2.5">Trigger Condition</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {schedules.map(sch => (
                <tr key={sch.id} className="hover:bg-slate-800/40">
                  <td className="p-2.5 font-bold text-sky-400">{sch.assetCode}</td>
                  <td className="p-2.5 font-sans font-semibold text-slate-200">{sch.assetName}</td>
                  <td className="p-2.5 font-sans text-amber-300 font-medium">{sch.maintenanceType}</td>
                  <td className="p-2.5 text-slate-300">{sch.scheduledDate}</td>
                  <td className="p-2.5 font-sans text-slate-400">{sch.triggerReason}</td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      sch.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {sch.status}
                    </span>
                  </td>
                  <td className="p-2.5">
                    {sch.status !== 'Completed' && (
                      <button
                        onClick={() => handleMarkComplete(sch.id)}
                        className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-colors"
                      >
                        Sign Off
                      </button>
                    )}
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

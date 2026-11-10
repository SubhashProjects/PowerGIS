// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// PREVENTIVE MAINTENANCE SCHEDULER (CONDITIONAL & CYCLICAL)
// PURE WHITE THEME & CONDITION-BASED MAINTENANCE (CBM)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { assetService } from '../../services/assetService';
import { Calendar, CheckCircle2, Clock, Wrench, Shield, AlertTriangle, Zap } from 'lucide-react';

export const MaintenanceScheduler: React.FC = () => {
  const [isSimActive, setIsSimActive] = useState<boolean>(assetService.isSimulatorMode());
  const [userSchedules, setUserSchedules] = useState<any[]>([]);
  const [simSchedules, setSimSchedules] = useState([
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

  useEffect(() => {
    const unsub = assetService.subscribe(() => {
      setIsSimActive(assetService.isSimulatorMode());
    });
    return unsub;
  }, []);

  const schedules = isSimActive ? [...userSchedules, ...simSchedules] : userSchedules;

  const handleMarkComplete = (id: string) => {
    if (userSchedules.some(s => s.id === id)) {
      setUserSchedules(prev =>
        prev.map(s => (s.id === id ? { ...s, status: 'Completed' } : s))
      );
    } else {
      setSimSchedules(prev =>
        prev.map(s => (s.id === id ? { ...s, status: 'Completed' } : s))
      );
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-neutral-900 select-none">
      {/* Top Banner */}
      <div className="bg-white border border-neutral-200 rounded-md p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-md bg-neutral-900 text-white font-extrabold flex items-center justify-center text-lg shadow-xs flex-shrink-0">
            <Calendar className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
                Automated Preventive Maintenance Scheduler
              </h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                ISO 55000 CBM
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">
              Condition-Based Maintenance · Pre-Monsoon Grid Hardening · CEA Statutory Tests
            </p>
          </div>
        </div>

        <span className={`px-3 py-1.5 rounded-md font-mono text-xs border self-start sm:self-auto font-semibold ${
          isSimActive
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-neutral-100 text-neutral-600 border-neutral-200'
        }`}>
          {isSimActive ? '⚡ Simulated Routine Cycles Active' : 'Clean Standby Mode Active'}
        </span>
      </div>

      {/* Schedules Table */}
      <div className="bg-white border border-neutral-200 rounded-md p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
          <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">
            Scheduled Work Orders & Inspection Tasks ({schedules.length})
          </h3>
          <span className="text-[10px] font-mono text-neutral-500">
            {isSimActive ? 'Auto-Generated Schedules' : '0 Scheduled Tasks'}
          </span>
        </div>

        <div className="border border-neutral-200 rounded-md overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 text-neutral-600 font-mono text-[10px] uppercase tracking-wider border-b border-neutral-200">
              <tr>
                <th className="p-3">Asset Code</th>
                <th className="p-3">Target Equipment</th>
                <th className="p-3">Maintenance Scope</th>
                <th className="p-3">Scheduled Date</th>
                <th className="p-3">Trigger Condition</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-mono text-neutral-700">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-400 font-sans">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                        <Calendar className="w-5 h-5 text-neutral-400" />
                      </div>
                      <p className="font-semibold text-sm text-neutral-700">No preventive maintenance schedules in clean mode</p>
                      <p className="text-xs text-neutral-400 max-w-md">
                        Operating in clean operational mode (0 simulated schedules). Turn ON the Simulator in the header to load simulated condition-based maintenance cycles and CEA statutory tests.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                schedules.map(sch => (
                  <tr key={sch.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="p-3 font-bold text-neutral-950">{sch.assetCode}</td>
                    <td className="p-3 font-sans font-semibold text-neutral-900">{sch.assetName}</td>
                    <td className="p-3 font-sans text-sky-800 font-medium">{sch.maintenanceType}</td>
                    <td className="p-3 text-neutral-600">{sch.scheduledDate}</td>
                    <td className="p-3 font-sans text-neutral-500">{sch.triggerReason}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        sch.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}>
                        {sch.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {sch.status !== 'Completed' && (
                        <button
                          onClick={() => handleMarkComplete(sch.id)}
                          className="px-2.5 py-1 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                        >
                          Sign Off
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

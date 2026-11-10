// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// DISASTER MANAGEMENT & EMERGENCY GRID RESTORATION CELL
// PURE WHITE THEME & RAPID RESTORATION TRACKING
// ============================================================================

import React, { useState, useEffect } from 'react';
import { initialDisasters } from '../../services/mockData';
import { assetService } from '../../services/assetService';
import { DisasterEvent } from '../../types/operations';
import {
  CloudRain, AlertTriangle, ShieldCheck, Wrench, CheckCircle2, TrendingUp, Users, Zap
} from 'lucide-react';

export const DisasterResponseCell: React.FC = () => {
  const [isSimActive, setIsSimActive] = useState<boolean>(assetService.isSimulatorMode());

  useEffect(() => {
    const unsub = assetService.subscribe(() => {
      setIsSimActive(assetService.isSimulatorMode());
    });
    return unsub;
  }, []);

  const simulatedEvent = initialDisasters[0];
  const standbyEvent: DisasterEvent = {
    id: 'dis-standby',
    code: 'DIS-STANDBY',
    name: 'Normal Grid Operations',
    eventType: 'Standby',
    affectedRegions: ['reg-pdy'],
    startDate: new Date().toISOString(),
    status: 'closed',
    damagedPolesCount: 0,
    damagedDTsCount: 0,
    snappedConductorsKm: 0,
    restorationPct: 100,
  };

  const selectedEvent = isSimActive ? simulatedEvent : standbyEvent;

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-[#09090B] select-none">
      {/* Top Banner */}
      <div className="bg-white border border-[#E4E4E7] rounded-md p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-md bg-[#09090B] text-white font-extrabold flex items-center justify-center text-lg shadow-xs flex-shrink-0">
            <CloudRain className="w-5 h-5 text-zinc-100" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight">
                Disaster Management & Emergency Restoration Cell
              </h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                CYCLONE & FLOOD PROTOCOL
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Coastal Grid Hardening · Damage Mapping & Emergency Gang Mobilization
            </p>
          </div>
        </div>

        <span className="px-3 py-1.5 rounded-md bg-rose-50 text-rose-800 font-mono text-xs border border-rose-200 self-start sm:self-auto font-bold">
          Emergency Standby Active
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-md bg-white border border-[#E4E4E7] shadow-xs">
          <div className="text-[11px] text-zinc-500 font-medium font-mono">Damaged Utility Poles</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-mono mt-1">
            {selectedEvent.damagedPolesCount}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">High winds & uprooted trees</div>
        </div>

        <div className="p-4 sm:p-5 rounded-md bg-white border border-[#E4E4E7] shadow-xs">
          <div className="text-[11px] text-zinc-500 font-medium font-mono">Damaged Transformers (DTs)</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono mt-1">
            {selectedEvent.damagedDTsCount}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Lightning flashover & flooding</div>
        </div>

        <div className="p-4 sm:p-5 rounded-md bg-white border border-[#E4E4E7] shadow-xs">
          <div className="text-[11px] text-zinc-500 font-medium font-mono">Snapped Conductors</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 font-mono mt-1">
            {selectedEvent.snappedConductorsKm} km
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Overhead lines restored</div>
        </div>

        <div className="p-4 sm:p-5 rounded-md bg-white border border-[#E4E4E7] shadow-xs">
          <div className="text-[11px] text-zinc-500 font-medium font-mono">Grid Restoration Progress</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono mt-1">
            {selectedEvent.restorationPct}%
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Puducherry & Karaikal enclaves</div>
        </div>
      </div>

      {/* Event Details Card */}
      <div className="bg-white border border-[#E4E4E7] rounded-md p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-zinc-950">{selectedEvent.name}</h3>
            <div className="text-xs text-zinc-500 font-mono mt-0.5">
              Code: {selectedEvent.code} • Classification: {selectedEvent.eventType}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-mono uppercase self-start sm:self-auto">
            {selectedEvent.status}
          </span>
        </div>

        {/* Restoration Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-700 font-medium font-mono">Civil & Electrical Restoration Progress</span>
            <span className="font-mono font-bold text-emerald-700">{selectedEvent.restorationPct}% Restored</span>
          </div>
          <div className="w-full h-3 rounded bg-zinc-100 border border-zinc-200 overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-500 rounded"
              style={{ width: `${selectedEvent.restorationPct}%` }}
            />
          </div>
        </div>

        {/* Emergency Gang Deployment */}
        <div className="p-4 rounded-md bg-zinc-50 border border-zinc-200 space-y-2">
          <h4 className="font-bold text-xs text-zinc-900 uppercase tracking-wider flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-zinc-800" />
            <span>Emergency Quick Response Gangs Mobilized</span>
          </h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            12 breakdown gangs deployed across Boulevard, Orleanpet, and Muthialpet. 4 mobile crane trucks and 2 pole erection augers active on site. Coordinated with Central Control Room for line clearance and re-charging.
          </p>
        </div>
      </div>
    </div>
  );
};

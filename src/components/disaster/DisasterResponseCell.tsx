// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// DISASTER MANAGEMENT & EMERGENCY GRID RESTORATION CELL
// PURE WHITE THEME & RAPID RESTORATION TRACKING
// ============================================================================

import React, { useState } from 'react';
import { initialDisasters } from '../../services/mockData';
import { DisasterEvent } from '../../types/operations';
import {
  CloudRain, AlertTriangle, ShieldCheck, Wrench, CheckCircle2, TrendingUp, Users
} from 'lucide-react';

export const DisasterResponseCell: React.FC = () => {
  const [events, setEvents] = useState<DisasterEvent[]>(initialDisasters);
  const [selectedEvent, setSelectedEvent] = useState<DisasterEvent>(events[0]);

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-neutral-900 select-none">
      {/* Top Banner */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white font-extrabold flex items-center justify-center text-lg shadow-xs flex-shrink-0">
            <CloudRain className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
                Disaster Management & Emergency Restoration Cell
              </h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                CYCLONE & FLOOD PROTOCOL
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">
              Coastal Grid Hardening · Damage Mapping & Emergency Gang Mobilization
            </p>
          </div>
        </div>

        <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 font-mono text-xs border border-rose-200 self-start sm:self-auto font-bold">
          Emergency Standby Active
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="text-[11px] text-neutral-500 font-medium font-mono">Damaged Utility Poles</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-mono mt-1">
            {selectedEvent.damagedPolesCount}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">High winds & uprooted trees</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="text-[11px] text-neutral-500 font-medium font-mono">Damaged Transformers (DTs)</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono mt-1">
            {selectedEvent.damagedDTsCount}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Lightning flashover & flooding</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="text-[11px] text-neutral-500 font-medium font-mono">Snapped Conductors</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-600 font-mono mt-1">
            {selectedEvent.snappedConductorsKm} km
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Overhead lines restored</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="text-[11px] text-neutral-500 font-medium font-mono">Grid Restoration Progress</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono mt-1">
            {selectedEvent.restorationPct}%
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Puducherry & Karaikal enclaves</div>
        </div>
      </div>

      {/* Event Details Card */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-neutral-950">{selectedEvent.name}</h3>
            <div className="text-xs text-neutral-500 font-mono mt-0.5">
              Code: {selectedEvent.code} • Classification: {selectedEvent.eventType}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-mono uppercase self-start sm:self-auto">
            {selectedEvent.status}
          </span>
        </div>

        {/* Restoration Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-700 font-medium font-mono">Civil & Electrical Restoration Progress</span>
            <span className="font-mono font-bold text-emerald-700">{selectedEvent.restorationPct}% Restored</span>
          </div>
          <div className="w-full h-3 rounded-full bg-neutral-100 border border-neutral-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${selectedEvent.restorationPct}%` }}
            />
          </div>
        </div>

        {/* Emergency Gang Deployment */}
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
          <h4 className="font-bold text-xs text-neutral-900 uppercase tracking-wider flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-sky-600" />
            <span>Emergency Quick Response Gangs Mobilized</span>
          </h4>
          <p className="text-xs text-neutral-600 leading-relaxed">
            12 breakdown gangs deployed across Boulevard, Orleanpet, and Muthialpet. 4 mobile crane trucks and 2 pole erection augers active on site. Coordinated with Central Control Room for line clearance and re-charging.
          </p>
        </div>
      </div>
    </div>
  );
};

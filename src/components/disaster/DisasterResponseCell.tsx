// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// DISASTER MANAGEMENT & EMERGENCY GRID RESTORATION CELL
// Storm, Cyclone & Flood Response • Infrastructure Damage Mapping
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
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <CloudRain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">Disaster Management & Emergency Grid Breakdown Cell</h2>
            <p className="text-xs text-slate-400">Cyclone Thane Preparedness • Rapid Feeder Restoration Monitoring</p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 font-mono text-xs border border-rose-500/25">
          Emergency Response Active
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#0e1626] border border-slate-800 shadow-lg">
          <div className="text-[11px] text-slate-400 font-medium">Damaged Utility Poles</div>
          <div className="text-2xl font-bold text-rose-400 font-mono mt-1">{selectedEvent.damagedPolesCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">High winds & uprooted trees</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1626] border border-slate-800 shadow-lg">
          <div className="text-[11px] text-slate-400 font-medium">Damaged Transformers (DTs)</div>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1">{selectedEvent.damagedDTsCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Lightning flashover & flooding</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1626] border border-slate-800 shadow-lg">
          <div className="text-[11px] text-slate-400 font-medium">Snapped Conductors</div>
          <div className="text-2xl font-bold text-sky-400 font-mono mt-1">{selectedEvent.snappedConductorsKm} km</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Overhead lines restored</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1626] border border-slate-800 shadow-lg">
          <div className="text-[11px] text-slate-400 font-medium">Grid Restoration Progress</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">{selectedEvent.restorationPct}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Puducherry & Karaikal enclaves</div>
        </div>
      </div>

      {/* Event Details Card */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-sm text-white">{selectedEvent.name}</h3>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              Code: {selectedEvent.code} • Classification: {selectedEvent.eventType}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-amber-500/15 text-amber-400 text-xs font-bold font-mono uppercase">
            {selectedEvent.status}
          </span>
        </div>

        {/* Restoration Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-medium">Civil & Electrical Restoration Progress</span>
            <span className="font-mono font-bold text-emerald-400">{selectedEvent.restorationPct}% Restored</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${selectedEvent.restorationPct}%` }}
            />
          </div>
        </div>

        {/* Emergency Gang Deployment */}
        <div className="p-4 rounded-xl bg-[#090f1a] border border-slate-800 space-y-2">
          <h4 className="font-semibold text-xs text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Users className="w-4 h-4" />
            <span>Emergency Quick Response Gangs Mobilized</span>
          </h4>
          <p className="text-xs text-slate-300">
            12 breakdown gangs deployed across Boulevard, Orleanpet, and Muthialpet. 4 mobile crane trucks and 2 pole erection augers active on site.
          </p>
        </div>
      </div>
    </div>
  );
};

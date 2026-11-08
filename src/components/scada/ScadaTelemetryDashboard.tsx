// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// SCADA TELEMETRY & SUBSTATION SINGLE LINE DIAGRAM (SLD) DASHBOARD
// Protocols: IEC 60870-5-104, Modbus-TCP, MQTT (Read-Only Control Gateway)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { scadaService } from '../../services/scadaService';
import { ScadaTelemetryPoint, ScadaAlarm } from '../../types/operations';
import {
  Cpu, Activity, Zap, AlertTriangle, ShieldCheck, RefreshCw, Power, Radio
} from 'lucide-react';

export const ScadaTelemetryDashboard: React.FC = () => {
  const [points, setPoints] = useState<ScadaTelemetryPoint[]>(scadaService.getPoints());
  const [alarms, setAlarms] = useState<ScadaAlarm[]>(scadaService.getAlarms());

  useEffect(() => {
    const unsub = scadaService.subscribe(() => {
      setPoints([...scadaService.getPoints()]);
      setAlarms([...scadaService.getAlarms()]);
    });
    return unsub;
  }, []);

  const handleToggleBreaker = (tag: string) => {
    scadaService.toggleBreaker(tag);
  };

  const handleAcknowledge = (code: string) => {
    scadaService.acknowledgeAlarm(code);
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">Substation SCADA & Single Line Diagram (SLD)</h2>
            <p className="text-xs text-slate-400">IEC 60870-5-104 Gateway • Marapalam 110/22kV Substation</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>IEC-104 ONLINE</span>
          </div>
        </div>
      </div>

      {/* INTERACTIVE SINGLE LINE DIAGRAM (SLD) SVG */}
      <div className="bg-[#0a0f1a] border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">
              Marapalam 110/22kV Substation SLD Schematic
            </h3>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Click breakers to simulate trip/close</span>
        </div>

        {/* SLD Schematic Canvas */}
        <div className="w-full flex justify-center py-4">
          <svg className="w-full max-w-2xl h-64" viewBox="0 0 600 240">
            {/* 110kV Incomer Busbar */}
            <line x1="80" y1="30" x2="520" y2="30" stroke="#EF4444" strokeWidth="4" />
            <text x="530" y="34" fill="#EF4444" fontSize="11" fontFamily="monospace" fontWeight="bold">110kV BUS</text>

            {/* Incomer Drop line to Transformer */}
            <line x1="300" y1="30" x2="300" y2="70" stroke="#EF4444" strokeWidth="2.5" />

            {/* Power Transformer 80MVA (Two Interlocking Circles) */}
            <circle cx="300" cy="85" r="15" fill="none" stroke="#F59E0B" strokeWidth="2.5" />
            <circle cx="300" cy="105" r="15" fill="none" stroke="#F59E0B" strokeWidth="2.5" />
            <text x="325" y="98" fill="#F59E0B" fontSize="10" fontFamily="monospace">PTR-1 80MVA</text>

            {/* 22kV / 11kV Secondary Busbar */}
            <line x1="300" y1="120" x2="300" y2="150" stroke="#38BDF8" strokeWidth="2.5" />
            <line x1="100" y1="150" x2="500" y2="150" stroke="#38BDF8" strokeWidth="4" />
            <text x="510" y="154" fill="#38BDF8" fontSize="11" fontFamily="monospace" fontWeight="bold">11kV BUS</text>

            {/* Feeder 1 Breaker CB-MARA-01 */}
            <line x1="160" y1="150" x2="160" y2="175" stroke="#38BDF8" strokeWidth="2" />
            <rect
              x="148" y="175" width="24" height="24"
              rx="4"
              fill={points.find(p => p.tag === 'FDR_MARA_01_AMP')?.breakerStatus === 'CLOSED' ? '#10B981' : '#EF4444'}
              stroke="#FFFFFF"
              strokeWidth="1.5"
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => handleToggleBreaker('FDR_MARA_01_AMP')}
            />
            <line x1="160" y1="199" x2="160" y2="225" stroke="#38BDF8" strokeWidth="2" />
            <text x="110" y="235" fill="#94A3B8" fontSize="9" fontFamily="monospace">FDR-MARA-01 (Blvd)</text>

            {/* Feeder 2 Breaker CB-HERI-02 */}
            <line x1="300" y1="150" x2="300" y2="175" stroke="#38BDF8" strokeWidth="2" />
            <rect
              x="288" y="175" width="24" height="24"
              rx="4"
              fill={points.find(p => p.tag === 'FDR_HERI_02_AMP')?.breakerStatus === 'CLOSED' ? '#10B981' : '#EF4444'}
              stroke="#FFFFFF"
              strokeWidth="1.5"
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => handleToggleBreaker('FDR_HERI_02_AMP')}
            />
            <line x1="300" y1="199" x2="300" y2="225" stroke="#38BDF8" strokeWidth="2" />
            <text x="250" y="235" fill="#94A3B8" fontSize="9" fontFamily="monospace">FDR-HERI-02 (Heritage)</text>

            {/* Feeder 3 Spare Breaker */}
            <line x1="440" y1="150" x2="440" y2="175" stroke="#38BDF8" strokeWidth="2" />
            <rect x="428" y="175" width="24" height="24" rx="4" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
            <line x1="440" y1="199" x2="440" y2="225" stroke="#38BDF8" strokeWidth="2" />
            <text x="415" y="235" fill="#94A3B8" fontSize="9" fontFamily="monospace">FDR-03 (Spare)</text>
          </svg>
        </div>
      </div>

      {/* Telemetry Points Table */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
        <h3 className="font-semibold text-xs text-white uppercase tracking-wider">
          Synchronous SCADA Telemetry Channels
        </h3>

        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#090f1a] text-slate-400 font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-2.5">Tag</th>
                <th className="p-2.5">Description</th>
                <th className="p-2.5">Voltage</th>
                <th className="p-2.5">Current</th>
                <th className="p-2.5">Active Power</th>
                <th className="p-2.5">Breaker State</th>
                <th className="p-2.5">Quality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {points.map(pt => (
                <tr key={pt.id} className="hover:bg-slate-800/40">
                  <td className="p-2.5 font-bold text-sky-400">{pt.tag}</td>
                  <td className="p-2.5 text-slate-300 font-sans">{pt.description}</td>
                  <td className="p-2.5 text-slate-200">{pt.voltageKV} kV</td>
                  <td className="p-2.5 text-amber-300 font-bold">{pt.currentAmps} A</td>
                  <td className="p-2.5 text-slate-300">{pt.activePowerMW} MW</td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      pt.breakerStatus === 'CLOSED' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                    }`}>
                      {pt.breakerStatus}
                    </span>
                  </td>
                  <td className="p-2.5 text-emerald-400">{pt.quality}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Alarms Panel */}
      {alarms.length > 0 && (
        <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
          <h3 className="font-semibold text-xs text-rose-400 uppercase tracking-wider flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>Active SCADA Grid Alarms</span>
          </h3>

          <div className="space-y-2">
            {alarms.map(alm => (
              <div
                key={alm.id}
                className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-rose-400">{alm.alarmCode}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/50 text-rose-200 uppercase font-semibold">
                      {alm.severity}
                    </span>
                  </div>
                  <p className="text-slate-300 mt-1">{alm.message}</p>
                </div>

                <div>
                  {alm.status === 'active' ? (
                    <button
                      onClick={() => handleAcknowledge(alm.alarmCode)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors"
                    >
                      Acknowledge
                    </button>
                  ) : (
                    <span className="text-slate-400 font-mono text-[11px]">Acknowledged</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

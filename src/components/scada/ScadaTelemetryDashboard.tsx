// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SCADA TELEMETRY & SUBSTATION SINGLE LINE DIAGRAM (SLD) DASHBOARD (SECTION 12)
// Protocols: IEC 60870-5-104, Modbus TCP, MQTT, WebSocket, REST
// Mode A & Mode B Support • Physical 3-Phase Equations • SBO Safety Interlocks
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { scadaService } from '../../services/scadaService';
import { scadaGatewayService } from '../../services/scadaGatewayService';
import { ScadaTelemetryPoint, ScadaAlarm, ScadaGatewayProtocol } from '../../types/operations';
import { ScadaSimulatorControl } from './ScadaSimulatorControl';
import {
  Cpu, Activity, Zap, AlertTriangle, ShieldCheck, RefreshCw, Power, Radio,
  Lock, CheckCircle2, AlertOctagon, X, Clock, HelpCircle, Sliders, Layers,
  Wifi, Server, Filter
} from 'lucide-react';

export const ScadaTelemetryDashboard: React.FC = () => {
  const { user } = useAuth();
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'OPERATIONAL' | 'SIMULATOR'>('ALL');
  const [points, setPoints] = useState<ScadaTelemetryPoint[]>(scadaService.getPoints('ALL'));
  const [alarms, setAlarms] = useState<ScadaAlarm[]>(scadaService.getAlarms('ALL'));
  const [selectedTagForSBO, setSelectedTagForSBO] = useState<string | null>(null);
  const [sboReason, setSboReason] = useState<string>('Emergency Line Breakdown / Conductor Snap');
  const [sboConfirmed, setSboConfirmed] = useState<boolean>(false);
  const [alarmFilter, setAlarmFilter] = useState<'ALL' | 'critical' | 'high' | 'medium'>('ALL');
  const [operationNotice, setOperationNotice] = useState<string | null>(null);
  const [sboProtocol, setSboProtocol] = useState<ScadaGatewayProtocol>('IEC-60870-5-104');
  const [activeTab, setActiveTab] = useState<'sld' | 'simulator' | 'protocols' | 'alarms'>('sld');

  useEffect(() => {
    const unsub = scadaService.subscribe(() => {
      setPoints(scadaService.getPoints(sourceFilter));
      setAlarms(scadaService.getAlarms(sourceFilter));
    });
    return unsub;
  }, [sourceFilter]);

  const handleSourceFilterChange = (filter: 'ALL' | 'OPERATIONAL' | 'SIMULATOR') => {
    setSourceFilter(filter);
    scadaService.setSourceFilter(filter);
    setPoints(scadaService.getPoints(filter));
    setAlarms(scadaService.getAlarms(filter));
  };

  // Authorized roles for SBO remote operations
  const canOperateSCADA = ['super_admin', 'se', 'ee', 'ae'].includes(user.role);

  const targetPoint = points.find(p => p.tag === selectedTagForSBO);
  const targetNewState = targetPoint?.breakerStatus === 'CLOSED' ? 'OPEN' : 'CLOSED';

  const handleOpenSBOModal = (tag: string) => {
    setSelectedTagForSBO(tag);
    setSboConfirmed(false);
  };

  const handleExecuteSBO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTagForSBO || !targetPoint) return;
    if (!sboConfirmed) {
      alert('Please check the safety interlock confirmation checkbox.');
      return;
    }

    const operatorName = `${user.fullName || user.username || 'Operator'} (${user.role.toUpperCase()})`;
    const success = scadaService.operateBreakerWithSBO(
      selectedTagForSBO,
      targetNewState as 'OPEN' | 'CLOSED',
      sboReason,
      operatorName,
      sboProtocol
    );

    if (success) {
      setOperationNotice(
        `SBO Command Dispatched via ${sboProtocol}: ${targetPoint.description} switched to ${targetNewState}. Reason: ${sboReason}`
      );
      setTimeout(() => setOperationNotice(null), 7000);
    } else {
      alert('SBO Command was rejected by the Gateway Interlock Engine. Verify permissions and PTW.');
    }

    setSelectedTagForSBO(null);
  };

  const handleAcknowledge = (code: string) => {
    scadaService.acknowledgeAlarm(code);
  };

  const filteredAlarms = alarms.filter(a => {
    if (alarmFilter === 'ALL') return true;
    return a.severity === alarmFilter;
  });

  const protocolStatuses = scadaGatewayService.getProtocolStatus();

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-slate-900 select-none">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-lg shadow-md shadow-blue-500/20 flex-shrink-0">
            <Cpu className="w-5 h-5 text-cyan-200" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight">
                SCADA Telemetry, SLD & Dynamic Telemetry Simulator
              </h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                IEC 60870-5-104 • MODBUS • MQTT
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Marapalam 110/22/11kV Primary Substation · Select-Before-Operate (SBO) Interlock Gateway
            </p>
          </div>
        </div>

        {/* Source Isolation Filter & Protocol Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Source Filter Toggle (Data Isolation Mandate) */}
          <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs font-mono">
            <span className="px-2 text-[10px] font-bold text-slate-500 flex items-center space-x-1">
              <Filter className="w-3 h-3" />
              <span>SOURCE:</span>
            </span>
            {(['ALL', 'OPERATIONAL', 'SIMULATOR'] as const).map(f => (
              <button
                key={f}
                onClick={() => handleSourceFilterChange(f)}
                className={`px-2.5 py-1 rounded-lg transition-all font-bold cursor-pointer text-[11px] ${
                  sourceFilter === f
                    ? f === 'SIMULATOR'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : f === 'OPERATIONAL'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-2 shadow-2xs font-mono text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-extrabold">GATEWAY ONLINE</span>
          </div>
        </div>
      </div>

      {/* SBO Execution Notice Banner */}
      {operationNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-mono shadow-xs animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-bold">{operationNotice}</span>
          </div>
          <button onClick={() => setOperationNotice(null)} className="text-emerald-700 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex space-x-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-medium">
        <button
          onClick={() => setActiveTab('sld')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'sld'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Single Line Diagram (SLD)</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'simulator'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>SCADA Dynamic Simulator (10 Modes)</span>
        </button>

        <button
          onClick={() => setActiveTab('protocols')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'protocols'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Industrial Gateway Protocols</span>
        </button>

        <button
          onClick={() => setActiveTab('alarms')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'alarms'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Substation Alarms ({alarms.length})</span>
        </button>
      </div>

      {/* Real-time Grid Telemetry Key Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {points.slice(0, 6).map(pt => (
          <div key={pt.tag} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span className="truncate">{pt.description}</span>
              <span
                className={`text-[9px] px-1 rounded border font-bold ${
                  pt.sourceType === 'SIMULATOR'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {pt.sourceType === 'SIMULATOR' ? 'SIM' : 'OP'}
              </span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1.5">
              <span className="font-mono text-base sm:text-lg font-extrabold text-slate-950">
                {pt.voltageKV ? `${pt.voltageKV} kV` : pt.currentAmps ? `${pt.currentAmps} A` : '50.02 Hz'}
              </span>
              {pt.activePowerMW !== undefined && pt.activePowerMW > 0 && (
                <span className="text-[10px] text-slate-500 font-mono">({pt.activePowerMW} MW)</span>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px] font-mono">
              <span className="text-slate-400">{pt.lastUpdated}</span>
              <span
                className={`font-bold px-1.5 py-0.2 rounded border ${
                  pt.breakerStatus === 'CLOSED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {pt.breakerStatus || 'NORMAL'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* TAB 1: INTERACTIVE SINGLE LINE DIAGRAM (SLD) CANVAS */}
      {activeTab === 'sld' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                Substation Single Line Diagram (SLD Schematic)
              </h3>
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-500">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Closed (Energized)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>Open (Tripped)</span>
              </span>
              <span className="text-slate-400 hidden sm:inline">| Click breaker for SBO Remote Control</span>
            </div>
          </div>

          {/* SVG SLD Vector Schematic */}
          <div className="w-full flex justify-center py-4 bg-slate-50/70 border border-slate-200 rounded-xl overflow-x-auto">
            <svg className="w-full max-w-3xl h-72 select-none" viewBox="0 0 700 280">
              {/* 110kV Incomer Busbar */}
              <line x1="80" y1="35" x2="620" y2="35" stroke="#DC2626" strokeWidth="4" strokeLinecap="round" />
              <rect x="625" y="24" width="65" height="20" rx="4" fill="#FEE2E2" stroke="#DC2626" strokeWidth="1" />
              <text x="632" y="38" fill="#DC2626" fontSize="10" fontFamily="monospace" fontWeight="bold">110kV BUS</text>

              {/* Incomer Drop line to Transformer */}
              <line x1="350" y1="35" x2="350" y2="75" stroke="#DC2626" strokeWidth="2.5" />

              {/* Power Transformer PTR-1 80MVA (Two Interlocking Circles) */}
              <circle cx="350" cy="92" r="18" fill="#FEF3C7" stroke="#D97706" strokeWidth="2.5" />
              <circle cx="350" cy="116" r="18" fill="#FEF3C7" stroke="#D97706" strokeWidth="2.5" />
              <rect x="380" y="94" width="85" height="20" rx="4" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
              <text x="386" y="108" fill="#B45309" fontSize="10" fontFamily="monospace" fontWeight="bold">PTR-1 80MVA</text>

              {/* 11kV Secondary Busbar */}
              <line x1="350" y1="134" x2="350" y2="165" stroke="#0284C7" strokeWidth="2.5" />
              <line x1="80" y1="165" x2="620" y2="165" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" />
              <rect x="625" y="154" width="60" height="20" rx="4" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1" />
              <text x="632" y="168" fill="#0284C7" fontSize="10" fontFamily="monospace" fontWeight="bold">11kV BUS</text>

              {/* 4 Feeder Bays (CB-01 to CB-04) */}
              {points.slice(0, 4).map((pt, index) => {
                const xPos = 140 + index * 140;
                const isClosed = pt.breakerStatus === 'CLOSED';

                return (
                  <g key={pt.tag} className="cursor-pointer group" onClick={() => handleOpenSBOModal(pt.tag)}>
                    {/* Drop line from 11kV Bus */}
                    <line x1={xPos} y1="165" x2={xPos} y2="195" stroke="#0284C7" strokeWidth="2" />

                    {/* Circuit Breaker Box */}
                    <rect
                      x={xPos - 16}
                      y="195"
                      width="32"
                      height="32"
                      rx="6"
                      fill={isClosed ? '#10B981' : '#EF4444'}
                      stroke="#0F172A"
                      strokeWidth="2"
                      className="transition-transform group-hover:scale-110 shadow-sm"
                    />
                    <text
                      x={xPos}
                      y="215"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {isClosed ? 'ON' : 'TRIP'}
                    </text>

                    {/* Outgoing Feeder Cable line */}
                    <line
                      x1={xPos}
                      y1="227"
                      x2={xPos}
                      y2="255"
                      stroke={isClosed ? '#0284C7' : '#94A3B8'}
                      strokeWidth="2"
                      strokeDasharray={isClosed ? undefined : '3,3'}
                    />

                    {/* Feeder Label Pill */}
                    <rect
                      x={xPos - 55}
                      y="255"
                      width="110"
                      height="18"
                      rx="4"
                      fill="#FFFFFF"
                      stroke="#CBD5E1"
                      strokeWidth="1"
                    />
                    <text
                      x={xPos}
                      y="268"
                      textAnchor="middle"
                      fill="#334155"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      {pt.tag}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
            <span>* Operator Safety Note: Remote breaker toggling enforces supervisory audit logging.</span>
            <span className="font-semibold text-slate-700">Substation Bay: 110/22kV Marapalam Switchyard</span>
          </div>
        </div>
      )}

      {/* TAB 2: SCADA DYNAMIC TELEMETRY SIMULATOR */}
      {activeTab === 'simulator' && <ScadaSimulatorControl />}

      {/* TAB 3: INDUSTRIAL GATEWAY PROTOCOLS */}
      {activeTab === 'protocols' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-950 font-mono uppercase">
                SCADA Gateway Protocol Adapters & Communication Channels
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                IEC 60870-5-104 (ASDU Type 9/13/45) · Modbus TCP (Holding Regs) · MQTT (Pub/Sub) · WebSocket
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-bold">
              All Protocol Stacks Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 font-mono">IEC 60870-5-104</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <div className="text-[11px] font-mono text-slate-600 space-y-1">
                <div>Port: <b className="text-slate-900">2404 (TCP)</b></div>
                <div>APCI: <b className="text-emerald-700">STARTDT ACTIVE</b></div>
                <div>ASDU Type: <b>13 (Short Float)</b></div>
                <div>COT: <b>3 (Spontaneous)</b></div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 font-mono">Modbus TCP</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <div className="text-[11px] font-mono text-slate-600 space-y-1">
                <div>Port: <b className="text-slate-900">502 (TCP)</b></div>
                <div>Unit ID: <b>1</b></div>
                <div>Holding Regs: <b>40001 - 40050</b></div>
                <div>Function: <b>03 (Read Holding)</b></div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 font-mono">MQTT Telemetry</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <div className="text-[11px] font-mono text-slate-600 space-y-1">
                <div>Topic: <b className="text-slate-900">powergis/substation/#</b></div>
                <div>QoS: <b>1 (At least once)</b></div>
                <div>Format: <b>JSON Telemetry</b></div>
                <div>Retained: <b>True</b></div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 font-mono">WebSocket Stream</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <div className="text-[11px] font-mono text-slate-600 space-y-1">
                <div>Path: <b className="text-slate-900">/ws/scada/telemetry</b></div>
                <div>Encoding: <b>Binary / JSON</b></div>
                <div>Heartbeat: <b>5000 ms</b></div>
                <div>Latency: <b className="text-emerald-700">~12 ms</b></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SCADA ALARMS & EVENT LOGS */}
      {(activeTab === 'sld' || activeTab === 'alarms') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                Substation Telemetry Alarms & Event Log ({alarms.length})
              </h3>
            </div>

            <div className="flex items-center space-x-1.5 text-[10px] font-mono">
              {(['ALL', 'critical', 'high', 'medium'] as const).map(sev => (
                <button
                  key={sev}
                  onClick={() => setAlarmFilter(sev)}
                  className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
                    alarmFilter === sev
                      ? 'bg-slate-900 text-white border-slate-900 font-bold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sev.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredAlarms.map(a => (
              <div
                key={a.alarmCode}
                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono transition-all ${
                  a.severity === 'critical'
                    ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                    : a.severity === 'high'
                    ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${
                        a.severity === 'critical'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : a.severity === 'high'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {a.severity}
                    </span>
                    <span className="font-bold text-slate-900">{a.alarmCode}</span>
                    {a.sourceType && (
                      <span className="text-[9px] px-1 rounded bg-slate-200 text-slate-700 font-bold">
                        {a.sourceType}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">{a.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-sans">{a.message}</p>
                </div>

                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                      a.status === 'active'
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    {a.status.toUpperCase()}
                  </span>
                  {a.status === 'active' && (
                    <button
                      onClick={() => handleAcknowledge(a.alarmCode)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SELECT-BEFORE-OPERATE (SBO) CONFIRMATION MODAL WITH PROTOCOL & INTERLOCK (SECTION 12.2) */}
      {selectedTagForSBO && targetPoint && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <form
            onSubmit={handleExecuteSBO}
            className="bg-white border border-slate-300 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-950 font-mono">
                  Select-Before-Operate (SBO) Remote Command
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTagForSBO(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Breaker Info */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Breaker Tag:</span>
                <span className="font-bold text-slate-900">{targetPoint.tag}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Description:</span>
                <span className="font-bold text-slate-900">{targetPoint.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data Source:</span>
                <span
                  className={`font-bold px-1.5 py-0.2 rounded border text-[10px] ${
                    targetPoint.sourceType === 'SIMULATOR'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {targetPoint.sourceType}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Current State:</span>
                <span
                  className={`font-bold px-1.5 py-0.2 rounded border ${
                    targetPoint.breakerStatus === 'CLOSED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  {targetPoint.breakerStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Target State:</span>
                <span
                  className={`font-extrabold px-2 py-0.5 rounded border text-sm ${
                    targetNewState === 'OPEN'
                      ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                      : 'bg-emerald-600 text-white border-emerald-700'
                  }`}
                >
                  {targetNewState} ({targetNewState === 'OPEN' ? 'DE-ENERGIZE / TRIP' : 'RE-ENERGIZE'})
                </span>
              </div>
            </div>

            {/* Protocol Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 font-mono">
                Gateway Dispatch Protocol:
              </label>
              <select
                value={sboProtocol}
                onChange={e => setSboProtocol(e.target.value as ScadaGatewayProtocol)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
              >
                <option value="IEC-60870-5-104">IEC 60870-5-104 (ASDU Type 45 Single Command)</option>
                <option value="MODBUS-TCP">Modbus TCP (Function Code 05 Write Coil)</option>
                <option value="MQTT">MQTT Supervisory Control Topic</option>
                <option value="REST">REST / HTTPS API Gateway</option>
              </select>
            </div>

            {/* Supervisory Reason Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 font-mono">
                Mandatory Supervisory Reason Code:
              </label>
              <select
                value={sboReason}
                onChange={e => setSboReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              >
                <option value="Emergency Line Breakdown / Conductor Snap">Emergency Line Breakdown / Conductor Snap</option>
                <option value="Scheduled Line Maintenance / PTW Clearance">Scheduled Line Maintenance / PTW Clearance</option>
                <option value="Load Shedding / Peak Overload Relief">Load Shedding / Peak Overload Relief</option>
                <option value="Fault Isolation & Sectionalizing">Fault Isolation & Sectionalizing</option>
                <option value="Transformer Tap Operation Support">Transformer Tap Operation Support</option>
              </select>
            </div>

            {/* Safety Interlock Checkbox */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sboConfirmed}
                  onChange={e => setSboConfirmed(e.target.checked)}
                  className="mt-0.5 rounded text-slate-900 focus:ring-0 cursor-pointer"
                />
                <span className="text-amber-950 font-medium">
                  I certify that statutory Permit-to-Work (PTW) clearances have been verified and all field patrol personnel are clear of the line.
                </span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedTagForSBO(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canOperateSCADA}
                className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer ${
                  targetNewState === 'OPEN'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                } ${!canOperateSCADA ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {canOperateSCADA ? `Dispatch SBO Command (${targetNewState})` : 'Access Denied (Role Restricted)'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

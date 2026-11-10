// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SCADA DYNAMIC TELEMETRY SIMULATOR CONTROL PANEL (SECTION 12 & PHASE 3)
// 10 Operating Modes • Physically Consistent 3-Phase Engine • Data Isolation
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { assetService } from '../../services/assetService';
import {
  scadaSimulatorService,
  SimulationEventLog,
  TelemetryTrendPoint,
} from '../../services/scadaSimulatorService';
import {
  ScadaSimulationConfig,
  ScadaSimulationMode,
  ScadaScenarioPreset,
  ScadaTelemetryPoint,
} from '../../types/operations';
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  Zap,
  Activity,
  Gauge,
  Thermometer,
  Sliders,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  ChevronDown,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const ScadaSimulatorControl: React.FC = () => {
  const [config, setConfig] = useState<ScadaSimulationConfig>(scadaSimulatorService.getConfig());
  const [points, setPoints] = useState<ScadaTelemetryPoint[]>(scadaSimulatorService.getPoints());
  const [logs, setLogs] = useState<SimulationEventLog[]>(scadaSimulatorService.getEventLogs());
  const [selectedTag, setSelectedTag] = useState<string>('SIM_FDR_MARA_01');
  const [trendData, setTrendData] = useState<TelemetryTrendPoint[]>(
    scadaSimulatorService.getTrendHistory('SIM_FDR_MARA_01')
  );

  // Manual injection form state
  const [manualVolt, setManualVolt] = useState<number>(11.2);
  const [manualAmp, setManualAmp] = useState<number>(245.0);
  const [manualPf, setManualPf] = useState<number>(0.965);
  const [manualTap, setManualTap] = useState<number>(0);
  const [manualStatusMsg, setManualStatusMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = scadaSimulatorService.subscribe(() => {
      setConfig(scadaSimulatorService.getConfig());
      setPoints(scadaSimulatorService.getPoints());
      setLogs(scadaSimulatorService.getEventLogs());
      setTrendData([...scadaSimulatorService.getTrendHistory(selectedTag)]);
    });
    return unsub;
  }, [selectedTag]);

  const isSimulatorModeActive = assetService.isSimulatorMode();
  const activePoint = points.find(p => p.tag === selectedTag) || points[0];

  const handleStart = () => {
    assetService.setSimulatorMode(true);
    scadaSimulatorService.start();
  };
  const handlePause = () => scadaSimulatorService.pause();
  const handleResume = () => scadaSimulatorService.resume();
  const handleStop = () => scadaSimulatorService.stop();
  const handleReset = () => scadaSimulatorService.reset();

  const handleSpeedChange = (spd: 1 | 2 | 5 | 10) => {
    scadaSimulatorService.setSpeed(spd);
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    scadaSimulatorService.setMode(e.target.value as ScadaSimulationMode);
  };

  const handleScenarioChange = (preset: ScadaScenarioPreset) => {
    scadaSimulatorService.setScenario(preset);
  };

  const handleManualInject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePoint) return;
    scadaSimulatorService.injectManualTelemetry(activePoint.tag, {
      voltageKV: manualVolt,
      currentAmps: manualAmp,
      powerFactor: manualPf,
      tapPosition: manualTap,
    });
    setManualStatusMsg(`Telemetry injected into ${activePoint.tag} successfully.`);
    setTimeout(() => setManualStatusMsg(null), 4000);
  };

  const handleExportCSV = () => {
    const csv = scadaSimulatorService.exportTelemetrySnapshotCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `powergis_scada_sim_snapshot_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportPlayback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      if (content) {
        const res = scadaSimulatorService.importHistoricalCSVPlayback(content);
        alert(res.message);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white border border-[#E4E4E7] rounded-md p-4 sm:p-6 shadow-sm space-y-6 text-[#09090B] select-none">
      {/* 1. Header & Primary Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-md bg-[#09090B] text-white font-extrabold flex items-center justify-center text-lg border border-zinc-800 flex-shrink-0">
            <Cpu className="w-5 h-5 text-zinc-100" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-bold text-[#09090B] tracking-tight">
                SCADA Dynamic Telemetry Simulator
              </h2>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                10 MODES • DATA ISOLATION
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Session: <span className="font-bold text-zinc-800">{config.sessionId}</span> • Source:{' '}
              <span className="font-semibold text-zinc-900">source_type = SIMULATOR</span>
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!config.isRunning ? (
            <button
              onClick={handleStart}
              className="px-3.5 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Simulator</span>
            </button>
          ) : config.isPaused ? (
            <button
              onClick={handleResume}
              className="px-3.5 py-2 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume</span>
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="px-3.5 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={handleStop}
            disabled={!config.isRunning}
            className={`px-3.5 py-2 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              config.isRunning
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                : 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed'
            }`}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop</span>
          </button>

          <button
            onClick={handleReset}
            className="px-3.5 py-2 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold border border-zinc-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Speed Selectors */}
          <div className="flex items-center rounded-md bg-zinc-100 p-0.5 border border-zinc-200 text-xs font-mono">
            {([1, 2, 5, 10] as const).map(spd => (
              <button
                key={spd}
                onClick={() => handleSpeedChange(spd)}
                className={`px-2.5 py-1 rounded transition-colors font-bold cursor-pointer ${
                  config.speed === spd
                    ? 'bg-white text-zinc-950 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Import / Export Controls */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportPlayback}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-md bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
            title="Import Historical Telemetry CSV Playback"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Playback CSV</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="p-2 rounded-md bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
            title="Export Telemetry Snapshot CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Snapshot CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Simulation Mode & Scenario Presets Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-zinc-50 p-3.5 rounded-md border border-zinc-200">
        <div>
          <label className="block text-[11px] font-bold text-zinc-700 font-mono mb-1">
            Operating Mode (10 Modes):
          </label>
          <select
            value={config.mode}
            onChange={handleModeChange}
            className="w-full bg-white border border-zinc-300 rounded-md px-2.5 py-1.5 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-900"
          >
            <option value="continuous">1. Continuous Dynamic Simulation</option>
            <option value="manual">2. Manual Telemetry Injection</option>
            <option value="fluctuation">3. Configurable Random Fluctuation</option>
            <option value="preset_playback">4. Preset Scenario Playback</option>
            <option value="time_based">5. Time-based Scenario Playback (24h)</option>
            <option value="csv_playback">6. CSV/Excel Historical Data Playback</option>
            <option value="multi_substation">7. Multi-Substation Simulation</option>
            <option value="multi_feeder">8. Multi-Feeder Simulation</option>
            <option value="fault_injection">9. Fault & Outage Injection</option>
            <option value="restoration">10. Equipment Restoration Simulation</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-700 font-mono mb-1">
            Interval & Step Frequency:
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min={1}
              max={60}
              value={config.intervalSeconds}
              onChange={e => scadaSimulatorService.setIntervalSeconds(parseInt(e.target.value))}
              className="w-full accent-zinc-900 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-zinc-900 w-12 text-right">
              {config.intervalSeconds}s
            </span>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-700 font-mono mb-1">
            Target Asset / Telemetry Tag:
          </label>
          <select
            value={selectedTag}
            onChange={e => setSelectedTag(e.target.value)}
            className="w-full bg-white border border-zinc-300 rounded-md px-2.5 py-1.5 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-900"
          >
            {points.map(p => (
              <option key={p.tag} value={p.tag}>
                {p.tag} - {p.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-700 font-mono mb-1">
            Quick Scenario Preset:
          </label>
          <div className="flex items-center gap-1 overflow-x-auto">
            {(
              [
                ['NORMAL', 'Normal', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
                ['PEAK_DEMAND', 'Peak', 'bg-amber-50 text-amber-800 border-amber-200'],
                ['OVERLOAD', 'Overload', 'bg-orange-50 text-orange-800 border-orange-200'],
                ['FAULT_EARTH', 'E-Fault', 'bg-rose-50 text-rose-700 border-rose-200'],
                ['RESTORATION', 'Restore', 'bg-blue-50 text-blue-700 border-blue-200'],
              ] as const
            ).map(([preset, label, clr]) => (
              <button
                key={preset}
                onClick={() => handleScenarioChange(preset as ScadaScenarioPreset)}
                className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer whitespace-nowrap ${
                  config.scenario === preset
                    ? 'bg-[#09090B] text-white border-zinc-900 shadow-xs'
                    : `${clr} hover:opacity-80`
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Live 3-Phase Parameter Metrics Strip for Active Asset */}
      {isSimulatorModeActive && activePoint ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#09090B] font-mono flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>
                Physically Consistent 3-Phase Telemetry: {activePoint.description} ({activePoint.tag})
              </span>
            </h3>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                activePoint.breakerStatus === 'CLOSED'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              Breaker: {activePoint.breakerStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            <div className="p-3 rounded-md bg-zinc-50 border border-zinc-200 text-center">
              <span className="text-[10px] text-zinc-500 font-mono block">Line Voltage</span>
              <span className="text-base font-extrabold text-zinc-950 font-mono mt-0.5 block">
                {activePoint.voltageKV} kV
              </span>
              <span className="text-[9px] text-zinc-400 font-mono">Tap: {activePoint.tapPosition || 0}</span>
            </div>

            <div className="p-3 rounded-md bg-zinc-50 border border-zinc-200 text-center">
              <span className="text-[10px] text-zinc-500 font-mono block">Phase Current</span>
              <span className="text-base font-extrabold text-zinc-950 font-mono mt-0.5 block">
                {activePoint.currentAmps} A
              </span>
              <span className="text-[9px] text-zinc-400 font-mono">Balanced RMS</span>
            </div>

            <div className="p-3 rounded-md bg-zinc-50 border border-zinc-200 text-center">
              <span className="text-[10px] text-zinc-500 font-mono block">Active Power (P)</span>
              <span className="text-base font-extrabold text-emerald-700 font-mono mt-0.5 block">
                {activePoint.activePowerMW} MW
              </span>
              <span className="text-[9px] text-zinc-400 font-mono">Cos(φ) {activePoint.powerFactor || 0.965}</span>
            </div>

            <div className="p-3 rounded-md bg-zinc-50 border border-zinc-200 text-center">
              <span className="text-[10px] text-zinc-500 font-mono block">Reactive Power (Q)</span>
              <span className="text-base font-extrabold text-blue-700 font-mono mt-0.5 block">
                {activePoint.reactivePowerMVAR} MVAR
              </span>
              <span className="text-[9px] text-zinc-400 font-mono">Sin(φ) Inductive</span>
            </div>

            <div className="p-3 rounded-md bg-zinc-50 border border-zinc-200 text-center">
              <span className="text-[10px] text-zinc-500 font-mono block">Grid Frequency</span>
              <span className="text-base font-extrabold text-zinc-950 font-mono mt-0.5 block">
                {activePoint.frequencyHz} Hz
              </span>
              <span className="text-[9px] text-zinc-400 font-mono">IEGC Band ±0.05</span>
            </div>

            <div className="p-3 rounded-md bg-zinc-50 border border-zinc-200 text-center">
              <span className="text-[10px] text-zinc-500 font-mono block">Phase Angles</span>
              <span className="text-xs font-bold text-zinc-950 font-mono mt-1 block">
                0° / 120° / 240°
              </span>
              <span className="text-[9px] text-zinc-400 font-mono">120° Symmetry</span>
            </div>

            <div className="p-3 rounded-md bg-zinc-50 border border-zinc-200 text-center">
              <span className="text-[10px] text-zinc-500 font-mono block">Neutral Current</span>
              <span className="text-base font-extrabold text-amber-700 font-mono mt-0.5 block">
                {activePoint.neutralCurrentAmps || 0} A
              </span>
              <span className="text-[9px] text-zinc-400 font-mono">Zero Seq. Return</span>
            </div>

            <div className="p-3 rounded-md bg-zinc-50 border border-zinc-200 text-center">
              <span className="text-[10px] text-zinc-500 font-mono block">Thermal Oil / Wdg</span>
              <span className="text-base font-extrabold text-zinc-950 font-mono mt-0.5 block">
                {activePoint.oilTempC || 48}°C
              </span>
              <span className="text-[9px] text-zinc-400 font-mono">
                Winding: {activePoint.windingTempC || 58}°C
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-md bg-zinc-50 border border-zinc-200 text-center space-y-1">
          <Activity className="w-5 h-5 text-zinc-400 mx-auto mb-1" />
          <h4 className="text-xs font-semibold text-[#09090B]">3-Phase Telemetry Inactive (Clean Standby Mode)</h4>
          <p className="text-[11px] text-zinc-500 font-mono">
            Operating in clean mode (0 active telemetry feeds). Click &apos;Start Simulator&apos; to stream physically consistent 3-phase measurements.
          </p>
        </div>
      )}

      {/* 4. Real-time Telemetry Historical Trend Graph (Recharts) */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-md p-4 space-y-2">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
          <div className="flex items-center space-x-2">
            <Gauge className="w-4 h-4 text-zinc-700" />
            <h4 className="text-xs font-bold text-zinc-900 font-mono uppercase">
              Dynamic Telemetry Trend Waveform: {selectedTag} (Rolling 60 Samples)
            </h4>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">Physical Consistency Engine</span>
        </div>

        {isSimulatorModeActive && trendData.length > 0 ? (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 9 }} stroke="#64748b" />
                <YAxis yAxisId="amp" tick={{ fontSize: 9 }} stroke="#2563eb" domain={['auto', 'auto']} />
                <YAxis
                  yAxisId="pwr"
                  orientation="right"
                  tick={{ fontSize: 9 }}
                  stroke="#16a34a"
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    fontSize: '11px',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Line
                  yAxisId="amp"
                  type="monotone"
                  dataKey="currentAmps"
                  name="Current (A)"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="pwr"
                  type="monotone"
                  dataKey="activePowerMW"
                  name="Power (MW)"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="amp"
                  type="monotone"
                  dataKey="windingTempC"
                  name="Winding Temp (°C)"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-36 w-full flex flex-col items-center justify-center p-4 text-center rounded-md bg-white border border-zinc-200">
            <Gauge className="w-6 h-6 text-zinc-400 mb-1.5" />
            <span className="text-xs font-semibold text-[#09090B]">No Dynamic Telemetry Trends in Clean Standby</span>
            <p className="text-[11px] text-zinc-500 max-w-sm mt-0.5 font-mono">
              Simulator is currently turned OFF. Click &apos;Start Simulator&apos; to begin streaming dynamic 3-phase waveforms.
            </p>
          </div>
        )}
      </div>

      {/* 5. Manual Telemetry Injection Panel */}
      <form
        onSubmit={handleManualInject}
        className="bg-white border border-zinc-200 rounded-md p-4 space-y-3"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-zinc-700" />
            <h4 className="text-xs font-bold text-zinc-900 font-mono uppercase">
              Manual Telemetry Injection Form: {selectedTag}
            </h4>
          </div>
          {manualStatusMsg && (
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
              {manualStatusMsg}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] text-zinc-500 font-mono mb-1">Target Voltage (kV):</label>
            <input
              type="number"
              step="0.05"
              value={manualVolt}
              onChange={e => setManualVolt(parseFloat(e.target.value))}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-md px-3 py-1.5 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 font-mono mb-1">Target Current (A):</label>
            <input
              type="number"
              step="1.0"
              value={manualAmp}
              onChange={e => setManualAmp(parseFloat(e.target.value))}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-md px-3 py-1.5 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 font-mono mb-1">Power Factor (cos φ):</label>
            <input
              type="number"
              step="0.005"
              min="0.5"
              max="1.0"
              value={manualPf}
              onChange={e => setManualPf(parseFloat(e.target.value))}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-md px-3 py-1.5 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 font-mono mb-1">Tap Position (-8 to +8):</label>
            <input
              type="number"
              step="1"
              min="-8"
              max="8"
              value={manualTap}
              onChange={e => setManualTap(parseInt(e.target.value))}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-md px-3 py-1.5 text-xs font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            Apply Manual Telemetry Injection
          </button>
        </div>
      </form>

      {/* 6. Simulation Event Logs Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-zinc-900 font-mono uppercase flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-zinc-600" />
            <span>Simulation Event History & Ingestion Log ({isSimulatorModeActive ? logs.length : 0})</span>
          </h4>
          <span className="text-[10px] text-zinc-500 font-mono">Immutable Sandbox Audit</span>
        </div>

        {isSimulatorModeActive && logs.length > 0 ? (
          <div className="border border-zinc-200 rounded-md overflow-hidden max-h-48 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 text-zinc-600 font-mono text-[10px] uppercase tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="p-2.5">Time</th>
                  <th className="p-2.5">Scenario</th>
                  <th className="p-2.5">Event Type</th>
                  <th className="p-2.5">Tag</th>
                  <th className="p-2.5">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                {logs.slice(0, 15).map(log => (
                  <tr key={log.id} className="hover:bg-zinc-50">
                    <td className="p-2 text-zinc-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-2 font-semibold text-zinc-700">{log.scenario}</td>
                    <td className="p-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          log.eventType === 'FAULT' || log.eventType === 'BREAKER_TRIP'
                            ? 'bg-rose-100 text-rose-800'
                            : log.eventType === 'OVERLOAD'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-zinc-100 text-zinc-800'
                        }`}
                      >
                        {log.eventType}
                      </span>
                    </td>
                    <td className="p-2 text-zinc-800 font-semibold">{log.tag}</td>
                    <td className="p-2 text-zinc-600 font-sans">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-zinc-500 font-mono text-xs border border-zinc-200 rounded-md bg-zinc-50 space-y-1">
            <Clock className="w-5 h-5 text-zinc-400 mx-auto mb-1" />
            <p className="font-semibold text-zinc-700">No simulation events logged in clean operational mode</p>
            <p className="text-[11px] text-zinc-400">Click &apos;Start Simulator&apos; to initialize simulation ingestion events.</p>
          </div>
        )}
      </div>
    </div>
  );
};

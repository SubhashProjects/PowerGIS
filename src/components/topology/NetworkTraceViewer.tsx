// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// NETWORK TOPOLOGY & UPSTREAM/DOWNSTREAM GRAPH TRACING ENGINE
// Analyzes: Source Substations, Feeders, DT Service Areas, Connected Consumers
// ============================================================================

import React, { useState } from 'react';
import { assetService } from '../../services/assetService';
import { GitFork, ArrowUp, ArrowDown, Cpu, Zap, Box, Users, ShieldAlert } from 'lucide-react';

export const NetworkTraceViewer: React.FC = () => {
  const [selectedFeederId, setSelectedFeederId] = useState<string>('fdr-mara-1');
  const [traceDirection, setTraceDirection] = useState<'upstream' | 'downstream'>('downstream');

  const feeders = assetService.getFeeders();
  const currentFeeder = feeders.find(f => f.id === selectedFeederId) || feeders[0];

  const sourceSubstation = assetService.getSubstations().find(s => s.id === currentFeeder.substationId);
  const connectedDTs = assetService.getTransformers().filter(t => t.feederId === currentFeeder.id);
  const connectedPoles = assetService.getPoles().filter(p => p.feederId === currentFeeder.id);
  const connectedConsumers = assetService.getConsumers().filter(c => c.feederId === currentFeeder.id);

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">Network Topology & Upstream/Downstream Tracing</h2>
            <p className="text-xs text-slate-400">Electrical Connectivity Analysis • Feeder to DT Service Area to End Consumer</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setTraceDirection('upstream')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
              traceDirection === 'upstream'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Trace Upstream</span>
          </button>
          <button
            onClick={() => setTraceDirection('downstream')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
              traceDirection === 'downstream'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Trace Downstream</span>
          </button>
        </div>
      </div>

      {/* Feeder Selector */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-400 font-medium">Select Distribution Feeder:</span>
          <select
            value={selectedFeederId}
            onChange={e => setSelectedFeederId(e.target.value)}
            className="bg-[#0b1220] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
          >
            {feeders.map(f => (
              <option key={f.id} value={f.id}>
                {f.code} - {f.name} ({f.voltageClass})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <span className="text-slate-400">Length: <b className="text-sky-400">{currentFeeder.lengthKm} km</b></span>
          <span className="text-slate-400">Peak Load: <b className="text-amber-400">{currentFeeder.peakLoadAmps} A</b></span>
        </div>
      </div>

      {/* GRAPH TOPOLOGY HIERARCHY TREE */}
      <div className="bg-[#0b101c] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
        <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center space-x-2">
          <span>Electrical Supply Graph Topology</span>
          <span className="text-[10px] text-sky-400 font-mono">
            {traceDirection === 'upstream' ? '(Load -> Source Grid Substation)' : '(Source Substation -> Feeder -> DTs -> End Consumers)'}
          </span>
        </h3>

        {/* Level 1: Substation */}
        <div className="p-4 rounded-xl bg-[#111a2c] border border-slate-700/70 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-red-400">Source Grid Substation</div>
              <div className="font-bold text-sm text-white">{sourceSubstation?.name || 'Marapalam 110kV'}</div>
              <div className="text-xs text-slate-400 font-mono">{sourceSubstation?.code} • {sourceSubstation?.voltageClass}</div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 font-mono">
            OPERATIONAL
          </span>
        </div>

        {/* Level 2: Feeder Backbone */}
        <div className="ml-6 pl-6 border-l-2 border-sky-500/40 space-y-4">
          <div className="p-4 rounded-xl bg-[#111a2c] border border-sky-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-sky-400">11kV Feeder Trunk</div>
                <div className="font-bold text-sm text-white">{currentFeeder.name}</div>
                <div className="text-xs text-slate-400 font-mono">{currentFeeder.conductorType} • {currentFeeder.lengthKm} km</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 font-mono">
              ENERGIZED
            </span>
          </div>

          {/* Level 3: Connected DT Service Areas */}
          <div className="ml-6 pl-6 border-l-2 border-emerald-500/40 space-y-3">
            <div className="text-xs font-semibold text-slate-300">
              Stepped Down Transformers ({connectedDTs.length} DT Service Areas):
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {connectedDTs.map(dt => (
                <div key={dt.id} className="p-3 rounded-xl bg-[#0e1626] border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-300">{dt.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">{dt.capacityKVA} kVA</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Loading: <b className="text-slate-200">{dt.loadPercentage}%</b></span>
                    <span>Oil Level: <b className="text-slate-200">{dt.oilLevelPct}%</b></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Level 4: Connected Consumers */}
            <div className="ml-6 pl-6 border-l-2 border-purple-500/40 space-y-2">
              <div className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>Connected Downstream Consumer Services ({connectedConsumers.length} Verified Premises):</span>
              </div>

              <div className="space-y-1.5">
                {connectedConsumers.map(c => (
                  <div key={c.id} className="p-2.5 rounded-lg bg-[#0a101b] border border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200">{c.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono ml-2">({c.consumerNumber})</span>
                      <div className="text-[10px] text-slate-500">{c.address}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400">
                      {c.isSmartMeter ? 'Smart Meter' : 'Conventional'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

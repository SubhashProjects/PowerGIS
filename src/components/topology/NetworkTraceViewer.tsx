// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// NETWORK TOPOLOGY & UPSTREAM/DOWNSTREAM GRAPH TRACING ENGINE (SECTION 8)
// PURE WHITE THEME & ELECTRICAL SUPPLY GRAPH TOPOLOGY
// ============================================================================

import React, { useState } from 'react';
import { assetService } from '../../services/assetService';
import { GitFork, ArrowUp, ArrowDown, Cpu, Zap, Box, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';

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
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-neutral-900 select-none">
      {/* Top Banner */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white font-extrabold flex items-center justify-center text-lg shadow-xs flex-shrink-0">
            <GitFork className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
                Network Topology & Supply Graph Tracing
              </h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                POSTGIS PGROUTING
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">
              Source Substation › 11kV Feeder Backbone › DT Service Areas › End Consumer Points
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => setTraceDirection('upstream')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              traceDirection === 'upstream'
                ? 'bg-neutral-900 text-white shadow-xs font-bold'
                : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200'
            }`}
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Trace Upstream</span>
          </button>
          <button
            onClick={() => setTraceDirection('downstream')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              traceDirection === 'downstream'
                ? 'bg-neutral-900 text-white shadow-xs font-bold'
                : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200'
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Trace Downstream</span>
          </button>
        </div>
      </div>

      {/* Feeder Selector & Metrics Strip */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <span className="text-xs text-neutral-600 font-medium font-mono">Select Active Feeder:</span>
          <select
            value={selectedFeederId}
            onChange={e => setSelectedFeederId(e.target.value)}
            className="bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-1.5 text-xs text-neutral-900 font-mono focus:bg-white focus:outline-none focus:border-neutral-900"
          >
            {feeders.map(f => (
              <option key={f.id} value={f.id}>
                {f.code} - {f.name} ({f.voltageClass})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <span className="text-neutral-600">Length: <b className="text-neutral-900">{currentFeeder.lengthKm} km</b></span>
          <span className="text-neutral-600">Peak Load: <b className="text-amber-700">{currentFeeder.peakLoadAmps} A</b></span>
          <span className="text-neutral-600">Conductor: <b className="text-neutral-900">{currentFeeder.conductorType}</b></span>
        </div>
      </div>

      {/* GRAPH TOPOLOGY HIERARCHY TREE */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-neutral-100 pb-3">
          <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider flex items-center space-x-2">
            <span>Electrical Supply Graph Topology</span>
          </h3>
          <span className="text-[11px] text-neutral-500 font-mono">
            {traceDirection === 'upstream'
              ? 'Direction: Downstream Consumer › Source Grid Substation'
              : 'Direction: Source Substation › 11kV Feeder › Distribution Transformers › Consumers'}
          </span>
        </div>

        {/* Level 1: Substation */}
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-rose-700 font-mono">Level 1: Source Grid Substation</div>
              <div className="font-bold text-sm text-neutral-950">{sourceSubstation?.name || 'Marapalam 110kV Primary'}</div>
              <div className="text-xs text-neutral-500 font-mono mt-0.5">{sourceSubstation?.code} • {sourceSubstation?.voltageClass}</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
            OPERATIONAL (ENERGIZED)
          </span>
        </div>

        {/* Level 2: Feeder Backbone */}
        <div className="ml-4 sm:ml-6 pl-4 sm:pl-6 border-l-2 border-sky-400 space-y-4">
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-sky-700 font-mono">Level 2: 11kV Feeder Trunk</div>
                <div className="font-bold text-sm text-neutral-950">{currentFeeder.name}</div>
                <div className="text-xs text-neutral-500 font-mono mt-0.5">{currentFeeder.conductorType} • {currentFeeder.lengthKm} km</div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 font-mono">
              ENERGIZED ({currentFeeder.peakLoadAmps}A)
            </span>
          </div>

          {/* Level 3: Connected DT Service Areas */}
          <div className="ml-4 sm:ml-6 pl-4 sm:pl-6 border-l-2 border-emerald-400 space-y-3">
            <div className="text-xs font-bold text-neutral-800 font-mono">
              Level 3: Stepped Down Transformers ({connectedDTs.length} DT Service Areas):
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {connectedDTs.map(dt => (
                <div key={dt.id} className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-neutral-950">{dt.name}</span>
                    <span className="font-mono text-[10px] font-bold text-neutral-700 px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200">
                      {dt.capacityKVA} kVA
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono flex items-center justify-between pt-1 border-t border-neutral-100">
                    <span>Loading: <b className="text-neutral-900">{dt.loadPercentage}%</b></span>
                    <span>Oil Level: <b className="text-neutral-900">{dt.oilLevelPct}%</b></span>
                    <span>Imbalance: <b className="text-amber-700">{dt.phaseImbalancePct}%</b></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Level 4: Connected Consumers */}
            <div className="ml-4 sm:ml-6 pl-4 sm:pl-6 border-l-2 border-purple-400 space-y-2.5">
              <div className="text-xs font-bold text-neutral-800 font-mono flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Level 4: Connected Downstream Consumer Services ({connectedConsumers.length} Verified Premises):</span>
              </div>

              <div className="space-y-1.5">
                {connectedConsumers.map(c => (
                  <div key={c.id} className="p-3 rounded-xl bg-white border border-neutral-200 text-xs flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="font-bold text-neutral-950">{c.name}</span>
                      <span className="text-[11px] text-neutral-500 font-mono ml-2">({c.consumerNumber})</span>
                      <div className="text-[10px] text-neutral-400 mt-0.5">{c.address}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border font-semibold ${
                      c.isSmartMeter
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                    }`}>
                      {c.isSmartMeter ? 'Smart Prepaid' : 'Conventional'}
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

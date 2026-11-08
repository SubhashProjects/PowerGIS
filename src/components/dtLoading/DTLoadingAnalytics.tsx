// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// DISTRIBUTION TRANSFORMER (DT) LOADING & PHASE IMBALANCE ANALYTICS
// Monitors: Peak Loading, Phase Current (IR, IY, IB), Overload & Augmentation
// ============================================================================

import React, { useState } from 'react';
import { assetService } from '../../services/assetService';
import { Transformer } from '../../types/assets';
import { BarChart2, AlertTriangle, TrendingUp, CheckCircle2, Zap } from 'lucide-react';

export const DTLoadingAnalytics: React.FC = () => {
  const transformers = assetService.getTransformers();
  const [selectedDT, setSelectedDT] = useState<Transformer>(transformers[0] || null);

  // Phase current calculations based on loading % and capacity
  const nominalCurrentPerPhase = Math.round((selectedDT.capacityKVA * 1000) / (Math.sqrt(3) * 415));
  const actualAvgCurrent = Math.round((nominalCurrentPerPhase * selectedDT.loadPercentage) / 100);

  // Simulated 3-Phase currents with phase imbalance
  const ir = Math.round(actualAvgCurrent * (1 + (selectedDT.phaseImbalancePct / 100)));
  const iy = actualAvgCurrent;
  const ib = Math.round(actualAvgCurrent * (1 - (selectedDT.phaseImbalancePct / 100)));

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">DT Loading & Phase Imbalance Analytics</h2>
            <p className="text-xs text-slate-400">CEA Thermal Guidelines • Overload Warning & Augmentation Recommendations</p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700">
          3-Phase LV Network (415V)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Transformers List */}
        <div className="lg:col-span-1 bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
          <h3 className="font-semibold text-xs text-white uppercase tracking-wider border-b border-slate-800 pb-2">
            Distribution Transformers ({transformers.length})
          </h3>

          <div className="space-y-2">
            {transformers.map(dt => (
              <button
                key={dt.id}
                onClick={() => setSelectedDT(dt)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedDT?.id === dt.id
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10'
                    : 'bg-[#0a101b] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-200">{dt.name}</span>
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                    dt.loadPercentage >= 80 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {dt.loadPercentage}% Load
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-1">
                  {dt.code} • {dt.capacityKVA} kVA
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected DT Analytics Card */}
        {selectedDT && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-white">{selectedDT.name}</h3>
                  <div className="text-xs text-slate-400 font-mono">{selectedDT.code} • Make: {selectedDT.make}</div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-xs text-slate-400">Capacity</div>
                  <div className="text-base font-bold text-sky-400">{selectedDT.capacityKVA} kVA</div>
                </div>
              </div>

              {/* Loading Bar Gauge */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Continuous Loading Percentage</span>
                  <span className="font-mono font-bold text-slate-100">{selectedDT.loadPercentage}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      selectedDT.loadPercentage >= 80
                        ? 'bg-gradient-to-r from-amber-500 to-rose-600'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    }`}
                    style={{ width: `${Math.min(100, selectedDT.loadPercentage)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0%</span>
                  <span>Optimal (60-75%)</span>
                  <span>Overload (&gt;80%)</span>
                </div>
              </div>

              {/* 3-Phase Current Imbalance Gauges */}
              <div className="p-4 rounded-xl bg-[#090f1a] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>3-Phase Secondary Current & Imbalance</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Phase Imbalance: <b className="text-amber-400">{selectedDT.phaseImbalancePct}%</b>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 font-mono">
                  <div className="p-3 rounded-xl bg-[#111929] border border-red-500/30 text-center">
                    <div className="text-[10px] uppercase font-bold text-red-400">R - Phase</div>
                    <div className="text-lg font-bold text-white mt-1">{ir} A</div>
                    <div className="text-[9px] text-slate-400">Peak Load</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#111929] border border-yellow-500/30 text-center">
                    <div className="text-[10px] uppercase font-bold text-yellow-400">Y - Phase</div>
                    <div className="text-lg font-bold text-white mt-1">{iy} A</div>
                    <div className="text-[9px] text-slate-400">Nominal Load</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#111929] border border-blue-500/30 text-center">
                    <div className="text-[10px] uppercase font-bold text-blue-400">B - Phase</div>
                    <div className="text-lg font-bold text-white mt-1">{ib} A</div>
                    <div className="text-[9px] text-slate-400">Underloaded</div>
                  </div>
                </div>
              </div>

              {/* Engineering Augmentation Recommendation */}
              <div className="p-3.5 rounded-xl bg-[#0a101b] border border-slate-800 flex items-start space-x-3 text-xs">
                {selectedDT.loadPercentage >= 80 ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-slate-200">
                    {selectedDT.loadPercentage >= 80
                      ? 'Augmentation Recommended Under RDSS Capital Scheme'
                      : 'Operating Safely Within Normal Thermal Limits'}
                  </div>
                  <p className="text-slate-400 mt-1">
                    {selectedDT.loadPercentage >= 80
                      ? `Operating at ${selectedDT.loadPercentage}% continuous peak load with ${selectedDT.phaseImbalancePct}% phase imbalance. Propose capacity upgrade from ${selectedDT.capacityKVA} kVA to ${selectedDT.capacityKVA * 2} kVA or redistribute LT secondary circuits.`
                      : `Transformer loading and oil temperature levels (oil at ${selectedDT.oilLevelPct}%) are satisfactory. Maintain routine annual filtration schedule.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

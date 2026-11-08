// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// DISTRIBUTION TRANSFORMER (DT) LOADING & PHASE IMBALANCE ANALYTICS
// PURE WHITE THEME & CEA THERMAL GUIDELINES
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
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-neutral-900 select-none">
      {/* Top Banner */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white font-extrabold flex items-center justify-center text-lg shadow-xs flex-shrink-0">
            <BarChart2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
                Distribution Transformer (DT) Loading & Phase Imbalance
              </h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                CEA THERMAL SPEC
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">
              Continuous Peak Loading · 3-Phase Balance (IR, IY, IB) · Augmentation Planning
            </p>
          </div>
        </div>

        <span className="px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-800 font-mono text-xs border border-neutral-200 self-start sm:self-auto font-semibold">
          3-Phase LV Network (415V / 50Hz)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Transformers List */}
        <div className="lg:col-span-1 bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
            <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">
              Distribution Transformers ({transformers.length})
            </h3>
            <span className="text-[10px] font-mono text-neutral-500">Urban Division</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {transformers.map(dt => (
              <button
                key={dt.id}
                onClick={() => setSelectedDT(dt)}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedDT?.id === dt.id
                    ? 'bg-neutral-50 border-neutral-900 shadow-xs ring-1 ring-neutral-900'
                    : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-neutral-950">{dt.name}</span>
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                    dt.loadPercentage >= 80
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  }`}>
                    {dt.loadPercentage}% Load
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 font-mono mt-1">
                  {dt.code} • {dt.capacityKVA} kVA • Phase Imbalance: {dt.phaseImbalancePct}%
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected DT Analytics Card */}
        {selectedDT && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="font-bold text-base text-neutral-950">{selectedDT.name}</h3>
                  <div className="text-xs text-neutral-500 font-mono mt-0.5">
                    {selectedDT.code} • Make: {selectedDT.make} • Feeder: {selectedDT.feederId}
                  </div>
                </div>

                <div className="text-left sm:text-right font-mono">
                  <div className="text-[10px] text-neutral-400 uppercase font-semibold">Rated Capacity</div>
                  <div className="text-lg font-extrabold text-neutral-950">{selectedDT.capacityKVA} kVA</div>
                </div>
              </div>

              {/* Loading Bar Gauge */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-700 font-medium font-mono">Continuous Loading Percentage</span>
                  <span className="font-mono font-bold text-neutral-950 text-sm">{selectedDT.loadPercentage}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-neutral-100 border border-neutral-200 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      selectedDT.loadPercentage >= 80
                        ? 'bg-gradient-to-r from-amber-500 to-rose-600'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    }`}
                    style={{ width: `${Math.min(100, selectedDT.loadPercentage)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                  <span>0%</span>
                  <span>Optimal Range (50-75%)</span>
                  <span>Overload Danger (&gt;80%)</span>
                </div>
              </div>

              {/* 3-Phase Current Imbalance Gauges */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="font-bold text-xs text-neutral-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>3-Phase Secondary Line Current & Imbalance</span>
                  </h4>
                  <span className="text-[11px] text-neutral-600 font-mono">
                    Phase Imbalance: <b className="text-amber-700 font-bold">{selectedDT.phaseImbalancePct}%</b>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 font-mono">
                  <div className="p-3 rounded-xl bg-white border border-rose-200 text-center shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-rose-700">R - Phase</div>
                    <div className="text-lg sm:text-xl font-extrabold text-neutral-950 mt-1">{ir} A</div>
                    <div className="text-[9px] text-neutral-500">Heaviest Loaded</div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-amber-200 text-center shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-amber-700">Y - Phase</div>
                    <div className="text-lg sm:text-xl font-extrabold text-neutral-950 mt-1">{iy} A</div>
                    <div className="text-[9px] text-neutral-500">Nominal Load</div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-sky-200 text-center shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-sky-700">B - Phase</div>
                    <div className="text-lg sm:text-xl font-extrabold text-neutral-950 mt-1">{ib} A</div>
                    <div className="text-[9px] text-neutral-500">Underloaded</div>
                  </div>
                </div>
              </div>

              {/* Engineering Augmentation Recommendation */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start space-x-3 text-xs">
                {selectedDT.loadPercentage >= 80 ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-neutral-950">
                    {selectedDT.loadPercentage >= 80
                      ? 'Augmentation Recommended Under RDSS Capital Scheme'
                      : 'Operating Safely Within Normal Thermal Limits'}
                  </div>
                  <p className="text-neutral-600 mt-1 leading-relaxed">
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

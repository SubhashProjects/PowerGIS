// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// DISTRIBUTION TRANSFORMER (DT) LOADING & PHASE IMBALANCE ANALYTICS
// PURE WHITE THEME & CEA THERMAL GUIDELINES
// ============================================================================

import React, { useState, useEffect } from 'react';
import { assetService } from '../../services/assetService';
import { Transformer } from '../../types/assets';
import { COMMONS } from '../../commons';
import { BarChart2, AlertTriangle, TrendingUp, CheckCircle2, Zap } from 'lucide-react';

export const DTLoadingAnalytics: React.FC = () => {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const unsub = assetService.subscribe(() => {
      setVersion(v => v + 1);
    });
    return unsub;
  }, []);

  const transformers = assetService.getTransformers();
  const [selectedDT, setSelectedDT] = useState<Transformer | null>(null);

  const activeDT = selectedDT && transformers.some(t => t.id === selectedDT.id)
    ? selectedDT
    : (transformers[0] || null);

  if (transformers.length === 0 || !activeDT) {
    return (
      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-[#09090B] select-none">
        {/* Top Banner */}
        <div className="bg-white border border-[#E4E4E7] rounded-md p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-md bg-[#09090B] text-white font-extrabold flex items-center justify-center text-lg shadow-xs flex-shrink-0">
              <BarChart2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight">
                  Distribution Transformer (DT) Loading & Phase Imbalance
                </h1>
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                  CEA THERMAL SPEC
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Continuous Peak Loading · 3-Phase Balance (IR, IY, IB) · Augmentation Planning
              </p>
            </div>
          </div>

          <span className="px-3 py-1.5 rounded-md bg-zinc-100 text-zinc-800 font-mono text-xs border border-zinc-200 self-start sm:self-auto font-semibold">
            Clean Standby Mode Active
          </span>
        </div>

        {/* Empty State Card */}
        <div className="p-10 rounded-md bg-white border border-[#E4E4E7] text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto text-zinc-400">
            <Zap className="w-6 h-6 text-zinc-500" />
          </div>
          <h3 className="font-bold text-base text-zinc-900">No Distribution Transformers in Clean Mode</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Upload your distribution spatial network (KML, GeoJSON, CSV) with DT coordinates, or turn ON the SCADA / System Simulator to inspect simulated 3-phase current loading, thermal stress, and phase imbalance.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => assetService.toggleSimulatorMode()}
              className="px-4 py-2 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white font-semibold text-xs font-mono shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Turn ON Simulator</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Phase current calculations based on loading % and capacity
  const nominalCurrentPerPhase = Math.round((activeDT.capacityKVA * 1000) / (Math.sqrt(3) * 415));
  const actualAvgCurrent = Math.round((nominalCurrentPerPhase * (activeDT.loadPercentage || 50)) / 100);

  // Simulated 3-Phase currents with phase imbalance
  const ir = Math.round(actualAvgCurrent * (1 + ((activeDT.phaseImbalancePct || 0) / 100)));
  const iy = actualAvgCurrent;
  const ib = Math.round(actualAvgCurrent * (1 - ((activeDT.phaseImbalancePct || 0) / 100)));

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-[#09090B] select-none">
      {/* Top Banner */}
      <div className="bg-white border border-[#E4E4E7] rounded-md p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-md bg-[#09090B] text-white font-extrabold flex items-center justify-center text-lg shadow-xs flex-shrink-0">
            <BarChart2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight">
                {COMMONS.labels.dtLoading.title}
              </h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                CEA THERMAL SPEC
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              {COMMONS.labels.dtLoading.subtitle}
            </p>
          </div>
        </div>

        <span className="px-3 py-1.5 rounded-md bg-zinc-100 text-zinc-800 font-mono text-xs border border-zinc-200 self-start sm:self-auto font-semibold">
          3-Phase LV Network (415V / 50Hz)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Transformers List */}
        <div className="lg:col-span-1 bg-white border border-[#E4E4E7] rounded-md p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
            <h3 className="font-bold text-xs text-zinc-900 uppercase tracking-wider font-mono">
              Distribution Transformers ({transformers.length})
            </h3>
            <span className="text-[10px] font-mono text-zinc-500">Urban Division</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {transformers.map(dt => (
              <button
                key={dt.id}
                onClick={() => setSelectedDT(dt)}
                className={`w-full text-left p-3 rounded-md border transition-all cursor-pointer ${
                  activeDT.id === dt.id
                    ? 'bg-zinc-50 border-zinc-900 shadow-xs ring-1 ring-zinc-900'
                    : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-zinc-950">{dt.name}</span>
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                    dt.loadPercentage >= 80
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  }`}>
                    {dt.loadPercentage}% Load
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 font-mono mt-1">
                  {dt.code} • {dt.capacityKVA} kVA • Phase Imbalance: {dt.phaseImbalancePct}%
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected DT Analytics Card */}
        {activeDT && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#E4E4E7] rounded-md p-5 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="font-bold text-base text-zinc-950">{activeDT.name}</h3>
                  <div className="text-xs text-zinc-500 font-mono mt-0.5">
                    {activeDT.code} • Make: {activeDT.make} • Feeder: {activeDT.feederId}
                  </div>
                </div>

                <div className="text-left sm:text-right font-mono">
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Rated Capacity</div>
                  <div className="text-lg font-extrabold text-zinc-950">{activeDT.capacityKVA} kVA</div>
                </div>
              </div>

              {/* Loading Bar Gauge */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-700 font-medium font-mono">Continuous Loading Percentage</span>
                  <span className="font-mono font-bold text-zinc-950 text-sm">{activeDT.loadPercentage}%</span>
                </div>
                <div className="w-full h-3 rounded bg-zinc-100 border border-zinc-200 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded ${
                      activeDT.loadPercentage >= 80
                        ? 'bg-rose-600'
                        : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, activeDT.loadPercentage)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>0%</span>
                  <span>Optimal Range (50-75%)</span>
                  <span>Overload Danger (&gt;80%)</span>
                </div>
              </div>

              {/* 3-Phase Current Imbalance Gauges */}
              <div className="p-4 rounded-md bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="font-bold text-xs text-zinc-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Zap className="w-4 h-4 text-zinc-700" />
                    <span>3-Phase Secondary Line Current & Imbalance</span>
                  </h4>
                  <span className="text-[11px] text-zinc-600 font-mono">
                    Phase Imbalance: <b className="text-amber-700 font-bold">{activeDT.phaseImbalancePct}%</b>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 font-mono">
                  <div className="p-3 rounded-md bg-white border border-rose-200 text-center shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-rose-700">R - Phase</div>
                    <div className="text-lg sm:text-xl font-extrabold text-zinc-950 mt-1">{ir} A</div>
                    <div className="text-[9px] text-zinc-500">Heaviest Loaded</div>
                  </div>

                  <div className="p-3 rounded-md bg-white border border-amber-200 text-center shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-amber-700">Y - Phase</div>
                    <div className="text-lg sm:text-xl font-extrabold text-zinc-950 mt-1">{iy} A</div>
                    <div className="text-[9px] text-zinc-500">Nominal Load</div>
                  </div>

                  <div className="p-3 rounded-md bg-white border border-zinc-300 text-center shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-zinc-700">B - Phase</div>
                    <div className="text-lg sm:text-xl font-extrabold text-zinc-950 mt-1">{ib} A</div>
                    <div className="text-[9px] text-zinc-500">Underloaded</div>
                  </div>
                </div>
              </div>

              {/* Engineering Augmentation Recommendation */}
              <div className="p-4 rounded-md bg-zinc-50 border border-zinc-200 flex items-start space-x-3 text-xs">
                {activeDT.loadPercentage >= 80 ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-zinc-950">
                    {activeDT.loadPercentage >= 80
                      ? 'Augmentation Recommended Under RDSS Capital Scheme'
                      : 'Operating Safely Within Normal Thermal Limits'}
                  </div>
                  <p className="text-zinc-600 mt-1 leading-relaxed">
                    {activeDT.loadPercentage >= 80
                      ? `Operating at ${activeDT.loadPercentage}% continuous peak load with ${activeDT.phaseImbalancePct}% phase imbalance. Propose capacity upgrade from ${activeDT.capacityKVA} kVA to ${activeDT.capacityKVA * 2} kVA or redistribute LT secondary circuits.`
                      : `Transformer loading and oil temperature levels (oil at ${activeDT.oilLevelPct}%) are satisfactory. Maintain routine annual filtration schedule.`}
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

// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ISO 55000 ASSET RISK SCORING & HEALTH INDEX MATRIX
// HIGH-CRAFT MINIMALIST SWISS UTILITY INTERFACE - BLOBLESS, ZERO-GRADIENT
// ============================================================================

import React, { useState, useEffect } from 'react';
import { assetService } from '../../services/assetService';
import { riskService, AssetRiskScore } from '../../services/riskService';
import { Target, ShieldCheck, Zap } from 'lucide-react';

export const AssetRiskMatrix: React.FC = () => {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const unsub = assetService.subscribe(() => {
      setVersion(v => v + 1);
    });
    return unsub;
  }, []);

  const transformers = assetService.getTransformers();

  const evaluatedScores: AssetRiskScore[] = transformers.map((t, idx) =>
    riskService.evaluateTransformerRisk(t, idx === 0 ? 2 : 0)
  );

  const [selectedScore, setSelectedScore] = useState<AssetRiskScore | null>(evaluatedScores[0] || null);

  useEffect(() => {
    if (evaluatedScores.length > 0 && (!selectedScore || !evaluatedScores.some(s => s.transformerId === selectedScore.transformerId))) {
      setSelectedScore(evaluatedScores[0]);
    }
  }, [transformers.length]);

  if (transformers.length === 0 || !selectedScore) {
    return (
      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-[#09090B]">
        {/* Top Banner */}
        <div className="bg-white border border-zinc-200 rounded-md p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-[#09090B] text-white font-bold flex items-center justify-center text-base border border-zinc-800 flex-shrink-0">
              <Target className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-[#09090B] tracking-tight">
                  ISO 55000 Asset Risk Scoring & Criticality Matrix
                </h1>
                <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                  ISO 55001 ASSET MGMT
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Multi-Parametric Health Index · Condition, Age, Peak Load & Fault Recurrence Weighting
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-md bg-zinc-100 text-zinc-700 font-mono text-xs border border-zinc-200 self-start sm:self-auto font-medium">
            Clean Standby Mode
          </span>
        </div>

        {/* Empty Standby Card */}
        <div className="p-12 rounded-md bg-white border border-zinc-200 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500">
            <Target className="w-5 h-5 text-zinc-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#09090B]">0 Distribution Transformers in Clean Mode</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              ISO 55000 asset risk evaluations require mapped transformers. All simulated distribution transformers have been moved to the Simulator. Turn ON the Simulator to test multi-parametric health index scores and replacement roadmaps.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => assetService.setSimulatorMode(true)}
              className="px-3.5 py-1.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white font-medium text-xs border border-zinc-900 transition-colors flex items-center space-x-2 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Turn ON Asset Simulator</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-[#09090B]">
      {/* Top Banner */}
      <div className="bg-white border border-zinc-200 rounded-md p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#09090B] text-white font-bold flex items-center justify-center text-base border border-zinc-800 flex-shrink-0">
            <Target className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-[#09090B] tracking-tight">
                ISO 55000 Asset Risk Scoring & Criticality Matrix
              </h1>
              <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                ISO 55001 ASSET MGMT
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Multi-Parametric Health Index · Condition, Age, Peak Load & Fault Recurrence Weighting
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-md bg-zinc-100 text-zinc-700 font-mono text-xs border border-zinc-200 self-start sm:self-auto font-medium">
          Asset Reliability Scorecard Active
        </span>
      </div>

      {/* Formula Explanation Card */}
      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-md text-xs text-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-mono">
        <span className="text-zinc-900 font-semibold">Standard Risk Weighting Formula:</span>
        <span className="text-zinc-600">
          Risk = (0.30 × Condition) + (0.25 × Age) + (0.20 × Load) + (0.15 × Faults) + (0.10 × Criticality)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Risk Scores Table */}
        <div className="lg:col-span-1 bg-white border border-zinc-200 rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
            <h3 className="font-semibold text-xs text-[#09090B] uppercase tracking-wider font-mono">
              Transformer Health Index ({evaluatedScores.length})
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">ISO 55000</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {evaluatedScores.map(score => {
              const isCrit = score.riskCategory === 'Critical' || score.riskCategory === 'High';
              const isSelected = selectedScore.transformerId === score.transformerId;
              return (
                <button
                  key={score.transformerId}
                  onClick={() => setSelectedScore(score)}
                  className={`w-full text-left p-3 rounded-md border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-50 border-zinc-900 ring-1 ring-zinc-900'
                      : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#09090B]">{score.name}</span>
                    <span
                      className={`text-[10px] font-medium font-mono px-1.5 py-0.5 rounded border ${
                        isCrit
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {score.riskCategory} ({score.totalRiskScore}/100)
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono mt-1">{score.code}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Risk Breakdown Card */}
        {selectedScore && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-zinc-200 rounded-md p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="font-bold text-base text-[#09090B]">{selectedScore.name}</h3>
                  <div className="text-xs text-zinc-500 font-mono mt-0.5">{selectedScore.code}</div>
                </div>

                <div className="text-left sm:text-right font-mono">
                  <div className="text-[10px] text-zinc-500 uppercase font-semibold">Composite Health Risk</div>
                  <div className="text-2xl font-bold text-[#09090B]">{selectedScore.totalRiskScore} / 100</div>
                </div>
              </div>

              {/* 5 Factors Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[#09090B] uppercase tracking-wider font-mono">
                  Individual Health Index Components
                </h4>

                <div className="space-y-2.5 text-xs font-mono">
                  <div>
                    <div className="flex justify-between mb-1 text-zinc-600">
                      <span>Condition Degradation Risk (30% weight)</span>
                      <span className="font-semibold text-zinc-900">{selectedScore.conditionRisk}/100</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden">
                      <div className="h-full bg-red-600 rounded-full" style={{ width: `${selectedScore.conditionRisk}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-zinc-600">
                      <span>Asset Age Factor (25% weight)</span>
                      <span className="font-semibold text-zinc-900">{selectedScore.ageFactor}/100</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden">
                      <div className="h-full bg-amber-600 rounded-full" style={{ width: `${selectedScore.ageFactor}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-zinc-600">
                      <span>Continuous Loading Factor (20% weight)</span>
                      <span className="font-semibold text-zinc-900">{selectedScore.loadFactor}/100</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${selectedScore.loadFactor}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-zinc-600">
                      <span>Fault Recurrence Rate (15% weight)</span>
                      <span className="font-semibold text-zinc-900">{selectedScore.faultFactor}/100</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden">
                      <div className="h-full bg-zinc-700 rounded-full" style={{ width: `${selectedScore.faultFactor}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-zinc-600">
                      <span>Capacity & Criticality (10% weight)</span>
                      <span className="font-semibold text-zinc-900">{selectedScore.criticality}/100</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${selectedScore.criticality}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Plan Recommendation */}
              <div className="p-3.5 rounded-md bg-zinc-50 border border-zinc-200 text-xs space-y-1">
                <span className="font-semibold text-[#09090B] flex items-center space-x-1.5 font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>ISO 55000 Remedial Engineering Action Plan:</span>
                </span>
                <p className="text-zinc-700 leading-relaxed font-sans mt-1">{selectedScore.recommendation}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

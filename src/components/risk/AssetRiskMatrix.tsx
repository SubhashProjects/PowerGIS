// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// ISO 55000 ASSET RISK SCORING & HEALTH INDEX MATRIX
// Formula: 30% Condition + 25% Age + 20% Loading + 15% Faults + 10% Criticality
// ============================================================================

import React, { useState } from 'react';
import { assetService } from '../../services/assetService';
import { riskService, AssetRiskScore } from '../../services/riskService';
import { Target, AlertTriangle, ShieldCheck, Activity, Award, HelpCircle } from 'lucide-react';

export const AssetRiskMatrix: React.FC = () => {
  const transformers = assetService.getTransformers();

  const evaluatedScores: AssetRiskScore[] = transformers.map((t, idx) =>
    riskService.evaluateTransformerRisk(t, idx === 0 ? 2 : 0)
  );

  const [selectedScore, setSelectedScore] = useState<AssetRiskScore>(evaluatedScores[0]);

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">ISO 55000 Asset Risk Scoring & Criticality Matrix</h2>
            <p className="text-xs text-slate-400">Multi-Parametric Health Index • Condition, Age, Loading & Fault Recurrence</p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700">
          ISO 55001 Asset Mgmt
        </span>
      </div>

      {/* Formula Explanation Card */}
      <div className="p-3.5 bg-[#090f1a] border border-slate-800 rounded-2xl text-xs text-slate-300 flex items-center justify-between font-mono">
        <span className="text-purple-400 font-bold">Standard Risk Weighting Formula:</span>
        <span className="text-slate-400">
          Risk = (0.30 × Condition) + (0.25 × Age) + (0.20 × Load) + (0.15 × Faults) + (0.10 × Criticality)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Scores Table */}
        <div className="lg:col-span-1 bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
          <h3 className="font-semibold text-xs text-white uppercase tracking-wider border-b border-slate-800 pb-2">
            Transformer Health Index ({evaluatedScores.length})
          </h3>

          <div className="space-y-2">
            {evaluatedScores.map(score => {
              const isCrit = score.riskCategory === 'Critical' || score.riskCategory === 'High';
              return (
                <button
                  key={score.transformerId}
                  onClick={() => setSelectedScore(score)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedScore.transformerId === score.transformerId
                      ? 'bg-purple-500/15 border-purple-500/50 shadow-md shadow-purple-500/10'
                      : 'bg-[#0a101b] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-200">{score.name}</span>
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                        isCrit
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {score.riskCategory} ({score.totalRiskScore}/100)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-1">{score.code}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Risk Breakdown Card */}
        {selectedScore && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-white">{selectedScore.name}</h3>
                  <div className="text-xs text-slate-400 font-mono">{selectedScore.code}</div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-xs text-slate-400">Total Composite Risk Score</div>
                  <div className="text-2xl font-bold text-purple-400">{selectedScore.totalRiskScore} / 100</div>
                </div>
              </div>

              {/* 5 Factors Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Individual Health Index Components
                </h4>

                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Condition Degradation Risk (30% weight)</span>
                      <span className="font-mono text-slate-200">{selectedScore.conditionRisk}/100</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-rose-500" style={{ width: `${selectedScore.conditionRisk}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Asset Age Factor (25% weight)</span>
                      <span className="font-mono text-slate-200">{selectedScore.ageFactor}/100</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${selectedScore.ageFactor}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Continuous Loading Factor (20% weight)</span>
                      <span className="font-mono text-slate-200">{selectedScore.loadFactor}/100</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: `${selectedScore.loadFactor}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Fault Recurrence Rate (15% weight)</span>
                      <span className="font-mono text-slate-200">{selectedScore.faultFactor}/100</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: `${selectedScore.faultFactor}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Capacity & Criticality (10% weight)</span>
                      <span className="font-mono text-slate-200">{selectedScore.criticality}/100</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-teal-500" style={{ width: `${selectedScore.criticality}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Plan Recommendation */}
              <div className="p-3.5 rounded-xl bg-[#090f1a] border border-slate-800 text-xs space-y-1">
                <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>ISO 55000 Remedial Engineering Action Plan:</span>
                </span>
                <p className="text-slate-400">{selectedScore.recommendation}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

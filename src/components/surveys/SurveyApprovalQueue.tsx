// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// MULTI-TIER SURVEY APPROVAL QUEUE (CONTRACTOR -> JE -> AE -> LIVE GIS)
// ============================================================================

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { surveyService } from '../../services/surveyService';
import { SurveySubmission } from '../../types/surveys';
import {
  FileCheck, CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck,
  ChevronRight, History, ArrowRight
} from 'lucide-react';

export const SurveyApprovalQueue: React.FC = () => {
  const { user, permissions } = useAuth();
  const [submissions, setSubmissions] = useState<SurveySubmission[]>(surveyService.getSubmissions());
  const [selectedSub, setSelectedSub] = useState<SurveySubmission | null>(submissions[0] || null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const refresh = () => {
    const list = surveyService.getSubmissions();
    setSubmissions(list);
    if (selectedSub) {
      const updated = list.find(s => s.id === selectedSub.id);
      if (updated) setSelectedSub(updated);
    }
  };

  const handleJEVerify = () => {
    if (!selectedSub) return;
    try {
      surveyService.jeVerify(selectedSub.id, 'Inspected coordinates on site; approved at JE stage');
      setFeedbackMsg('Survey verified successfully by Junior Engineer (JE). Handed over to AE for final sanction.');
      refresh();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAEApprove = () => {
    if (!selectedSub) return;
    try {
      const published = surveyService.aeApproveAndPublish(selectedSub.id, 'Sanctioned by Assistant Engineer; live GIS published');
      setFeedbackMsg(`Final sanction complete! ${published} assets have been successfully promoted from Staging to Live Production GIS.`);
      refresh();
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmReject = () => {
    if (!selectedSub) return;
    if (!rejectionReason.trim()) {
      alert('A mandatory reason is required to reject a submission.');
      return;
    }
    try {
      surveyService.rejectSubmission(selectedSub.id, rejectionReason);
      setShowRejectModal(false);
      setRejectionReason('');
      setFeedbackMsg('Submission rejected. Returned to contractor with mandatory rectification comments.');
      refresh();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-medium text-[10px] border border-sky-500/20">Pending JE Review</span>;
      case 'je_verified':
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium text-[10px] border border-amber-500/20">JE Verified (Pending AE)</span>;
      case 'ae_approved':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium text-[10px] border border-emerald-500/20">AE Approved (Live GIS)</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-medium text-[10px] border border-rose-500/20">Rejected for Correction</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium text-[10px]">{status}</span>;
    }
  };

  const stagingAssets = selectedSub ? surveyService.getStagingAssets(selectedSub.id) : [];
  const history = selectedSub ? surveyService.getApprovalHistory(selectedSub.id) : [];

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Workflow Diagram Banner */}
      <div className="p-3 bg-[#11192a] border border-slate-700/80 rounded-2xl shadow-xl flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center space-x-2 font-semibold">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span>Statutory Multi-Tier Approval Chain:</span>
        </div>
        <div className="flex items-center space-x-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">1. Contractor Draft</span>
          <ArrowRight className="w-3 h-3 text-slate-500" />
          <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-500/30">2. JE Field Verify</span>
          <ArrowRight className="w-3 h-3 text-slate-500" />
          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30">3. AE Sanction</span>
          <ArrowRight className="w-3 h-3 text-slate-500" />
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold">4. Live Production GIS</span>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-center space-x-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Submissions List */}
        <div className="lg:col-span-1 bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center space-x-1.5">
              <FileCheck className="w-4 h-4 text-sky-400" />
              <span>Survey Submissions</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">{submissions.length} Total</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {submissions.map(sub => (
              <button
                key={sub.id}
                onClick={() => setSelectedSub(sub)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedSub?.id === sub.id
                    ? 'bg-sky-500/15 border-sky-500/50 shadow-md shadow-sky-500/10'
                    : 'bg-[#0a101b] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-sky-300">{sub.submissionCode}</span>
                  {getStatusBadge(sub.status)}
                </div>
                <div className="font-medium text-xs text-slate-200 mt-1 truncate">{sub.title}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">By {sub.contractorName}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Submission Details & Approval Actions */}
        {selectedSub && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-bold text-sm text-white">{selectedSub.title}</h2>
                    {getStatusBadge(selectedSub.status)}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {selectedSub.submissionCode} • Section: {selectedSub.sectionName}
                  </div>
                </div>

                {/* Authority Action Buttons */}
                <div className="flex items-center space-x-2">
                  {/* JE Action */}
                  {selectedSub.status === 'submitted' && (
                    <button
                      onClick={handleJEVerify}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify as JE</span>
                    </button>
                  )}

                  {/* AE Action */}
                  {selectedSub.status === 'je_verified' && (
                    <button
                      onClick={handleAEApprove}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Sanction & Publish to GIS (AE)</span>
                    </button>
                  )}

                  {/* Reject Action */}
                  {(selectedSub.status === 'submitted' || selectedSub.status === 'je_verified') && (
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Asset Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 rounded-xl bg-[#090f1a] border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Poles Captured</div>
                  <div className="text-lg font-bold text-sky-400">{selectedSub.assetCounts.poles || 0}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#090f1a] border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Transformers (DTs)</div>
                  <div className="text-lg font-bold text-emerald-400">{selectedSub.assetCounts.transformers || 0}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#090f1a] border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Consumers / Meters</div>
                  <div className="text-lg font-bold text-purple-400">{selectedSub.assetCounts.consumers || 0}</div>
                </div>
              </div>

              {/* Rejection Reason display if rejected */}
              {selectedSub.status === 'rejected' && selectedSub.rejectionReason && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200 text-xs">
                  <span className="font-bold">Mandatory Rectification Reason: </span>
                  <span>{selectedSub.rejectionReason}</span>
                </div>
              )}

              {/* Staging Assets Preview Table */}
              <div>
                <h4 className="font-semibold text-xs text-slate-300 mb-2">Staged Assets ({stagingAssets.length})</h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#090f1a] text-slate-400 font-mono text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Temp ID</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">GPS Accuracy</th>
                        <th className="p-2.5">Coordinates</th>
                        <th className="p-2.5">Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {stagingAssets.map(asset => (
                        <tr key={asset.id} className="hover:bg-slate-800/30">
                          <td className="p-2.5 font-semibold text-slate-200">{asset.temporaryCode}</td>
                          <td className="p-2.5 uppercase text-sky-400">{asset.assetType}</td>
                          <td className="p-2.5 text-emerald-400">±{asset.gpsAccuracyM}m</td>
                          <td className="p-2.5 text-slate-400">{asset.coordinates[0].toFixed(5)}, {asset.coordinates[1].toFixed(5)}</td>
                          <td className="p-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px]">
                              {asset.validationStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Immutable Approval Audit History */}
              <div>
                <h4 className="font-semibold text-xs text-slate-300 mb-2 flex items-center space-x-1.5">
                  <History className="w-3.5 h-3.5 text-sky-400" />
                  <span>Approval Audit History Trail</span>
                </h4>
                <div className="space-y-2">
                  {history.map(entry => (
                    <div key={entry.id} className="p-2.5 rounded-lg bg-[#0a101b] border border-slate-800 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-200">{entry.actorName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 ml-2 font-mono uppercase">{entry.action}</span>
                        <div className="text-[11px] text-slate-400 mt-0.5">{entry.comments}</div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal with Mandatory Reason */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#121b2d] border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Reject Field Survey Submission</span>
            </h3>
            <p className="text-xs text-slate-400">
              Government auditing standards mandate a written engineering justification when rejecting contractor field surveys.
            </p>

            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Pole P-03 GPS accuracy exceeds 2m tolerance; phase conductor span has invalid snapping relationship."
              className="w-full h-24 bg-[#0a101b] border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            />

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

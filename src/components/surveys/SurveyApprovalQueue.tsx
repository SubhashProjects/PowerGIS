// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// MULTI-TIER SURVEY APPROVAL QUEUE - MONOCHROME B&W THEME
// CONTRACTOR -> JE VERIFICATION -> AE SANCTION -> LIVE GIS PUBLICATION
// ============================================================================

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { surveyService } from '../../services/surveyService';
import { SurveySubmission } from '../../types/surveys';
import {
  FileCheck, CheckCircle2, XCircle, AlertTriangle, ShieldCheck,
  History, ArrowRight, X
} from 'lucide-react';

export const SurveyApprovalQueue: React.FC = () => {
  const { user } = useAuth();
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
        return <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-white font-mono font-bold text-[10px] border border-neutral-700">Pending JE Review</span>;
      case 'je_verified':
        return <span className="px-2 py-0.5 rounded-full bg-white text-black font-mono font-bold text-[10px]">JE Verified (Pending AE)</span>;
      case 'ae_approved':
        return <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-white font-mono font-extrabold text-[10px] border border-neutral-600">AE Approved (Live GIS)</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono text-[10px] border border-neutral-700">Rejected</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400 font-mono text-[10px]">{status}</span>;
    }
  };

  const stagingAssets = selectedSub ? surveyService.getStagingAssets(selectedSub.id) : [];
  const history = selectedSub ? surveyService.getApprovalHistory(selectedSub.id) : [];

  return (
    <div className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 text-neutral-100 select-none">
      {/* Workflow Diagram Banner */}
      <div className="p-4 bg-[#0a0a0a] border border-neutral-800 rounded-3xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-neutral-300">
        <div className="flex items-center space-x-2.5 font-bold text-white">
          <ShieldCheck className="w-5 h-5 text-white" />
          <span>Statutory Multi-Tier Approval Chain:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-neutral-900 text-neutral-300 border border-neutral-800">1. Contractor Draft</span>
          <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
          <span className="px-2.5 py-1 rounded-lg bg-neutral-900 text-white border border-neutral-700 font-bold">2. JE Field Verify</span>
          <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
          <span className="px-2.5 py-1 rounded-lg bg-neutral-900 text-white border border-neutral-700 font-bold">3. AE Sanction</span>
          <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
          <span className="px-2.5 py-1 rounded-lg bg-white text-black font-extrabold shadow-sm">4. Live Production GIS</span>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-700 text-white text-xs flex items-center space-x-2.5 shadow-xl animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Submissions List */}
        <div className="lg:col-span-1 bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-white flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-white" />
              <span>Survey Submissions</span>
            </h3>
            <span className="text-[10px] text-neutral-400 font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
              {submissions.length} Total
            </span>
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {submissions.map(sub => (
              <button
                key={sub.id}
                onClick={() => setSelectedSub(sub)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                  selectedSub?.id === sub.id
                    ? 'bg-neutral-900 border-white shadow-lg text-white font-semibold'
                    : 'bg-neutral-950 border-neutral-850 hover:border-neutral-700 text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white">{sub.submissionCode}</span>
                  {getStatusBadge(sub.status)}
                </div>
                <div className="font-semibold text-xs text-neutral-200 mt-1 truncate">{sub.title}</div>
                <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">By {sub.contractorName}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Submission Details & Approval Actions */}
        {selectedSub && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-bold text-sm text-white">{selectedSub.title}</h2>
                    {getStatusBadge(selectedSub.status)}
                  </div>
                  <div className="text-xs text-neutral-400 font-mono mt-0.5">
                    {selectedSub.submissionCode} • Section: {selectedSub.sectionName}
                  </div>
                </div>

                {/* Authority Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* JE Action */}
                  {selectedSub.status === 'submitted' && (
                    <button
                      onClick={handleJEVerify}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-white/10"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify as JE</span>
                    </button>
                  )}

                  {/* AE Action */}
                  {selectedSub.status === 'je_verified' && (
                    <button
                      onClick={handleAEApprove}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-white/10"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Sanction & Publish (AE)</span>
                    </button>
                  )}

                  {/* Reject Action */}
                  {(selectedSub.status === 'submitted' || selectedSub.status === 'je_verified') && (
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Asset Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 uppercase font-mono font-semibold">Poles Captured</div>
                  <div className="text-xl font-extrabold text-white font-mono mt-0.5">{selectedSub.assetCounts.poles || 0}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 uppercase font-mono font-semibold">Transformers (DTs)</div>
                  <div className="text-xl font-extrabold text-white font-mono mt-0.5">{selectedSub.assetCounts.transformers || 0}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 uppercase font-mono font-semibold">Consumers / Meters</div>
                  <div className="text-xl font-extrabold text-white font-mono mt-0.5">{selectedSub.assetCounts.consumers || 0}</div>
                </div>
              </div>

              {/* Rejection Reason display if rejected */}
              {selectedSub.status === 'rejected' && selectedSub.rejectionReason && (
                <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-700 text-white text-xs">
                  <span className="font-bold">Mandatory Rectification Reason: </span>
                  <span className="text-neutral-300 font-mono">{selectedSub.rejectionReason}</span>
                </div>
              )}

              {/* Staging Assets Preview Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                  Staged Assets ({stagingAssets.length})
                </h4>
                <div className="border border-neutral-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#111111] text-neutral-400 font-mono text-[10px] uppercase tracking-wider border-b border-neutral-800">
                        <tr>
                          <th className="p-3">Temp Code</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">GPS Accuracy</th>
                          <th className="p-3">Coordinates</th>
                          <th className="p-3">Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-850 font-mono text-neutral-300">
                        {stagingAssets.map(asset => (
                          <tr key={asset.id} className="hover:bg-neutral-900/60 transition-colors">
                            <td className="p-3 font-bold text-white">{asset.temporaryCode}</td>
                            <td className="p-3 uppercase text-neutral-200">{asset.assetType}</td>
                            <td className="p-3 text-white font-bold">±{asset.gpsAccuracyM}m</td>
                            <td className="p-3 text-neutral-400">{asset.coordinates[0].toFixed(5)}, {asset.coordinates[1].toFixed(5)}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-neutral-900 text-white font-mono text-[10px] border border-neutral-700">
                                {asset.validationStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Immutable Approval Audit History */}
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center space-x-2">
                  <History className="w-4 h-4 text-white" />
                  <span>Approval Audit History Trail</span>
                </h4>
                <div className="space-y-2">
                  {history.map(entry => (
                    <div key={entry.id} className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white">{entry.actorName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-900 text-neutral-300 ml-2 font-mono uppercase border border-neutral-800 font-bold">
                          {entry.action}
                        </span>
                        <div className="text-[11px] text-neutral-400 mt-1 font-mono">{entry.comments}</div>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono">
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-white" />
                <span>Reject Field Survey Submission</span>
              </h3>
              <button onClick={() => setShowRejectModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed font-mono">
              Engineering standards mandate a written engineering justification when rejecting contractor field surveys.
            </p>

            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Pole P-03 GPS accuracy exceeds 2m tolerance; conductor span has invalid snapping relationship."
              className="w-full h-24 bg-neutral-900 border border-neutral-700 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-white"
            />

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold shadow-md shadow-white/10"
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

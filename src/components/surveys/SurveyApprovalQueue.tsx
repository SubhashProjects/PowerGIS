// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// MULTI-TIER SURVEY APPROVAL QUEUE (CONTRACTOR -> JE -> AE -> LIVE GIS)
// PURE WHITE THEME & STATUTORY APPROVAL AUDIT CHAIN
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
        return <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-mono font-bold text-[10px] border border-amber-200">Pending JE Review</span>;
      case 'je_verified':
        return <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 font-mono font-bold text-[10px] border border-sky-200">JE Verified (Pending AE)</span>;
      case 'ae_approved':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-mono font-extrabold text-[10px] border border-emerald-200">AE Approved (Live GIS)</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 font-mono text-[10px] border border-rose-200">Rejected</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-mono text-[10px]">{status}</span>;
    }
  };

  const stagingAssets = selectedSub ? surveyService.getStagingAssets(selectedSub.id) : [];
  const history = selectedSub ? surveyService.getApprovalHistory(selectedSub.id) : [];

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-neutral-900 select-none">
      {/* Workflow Diagram Banner */}
      <div className="p-4 bg-white border border-neutral-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-neutral-700">
        <div className="flex items-center space-x-2.5 font-bold text-neutral-950 font-mono">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>Statutory Multi-Tier Approval Chain:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-neutral-50 text-neutral-600 border border-neutral-200">1. Contractor Draft</span>
          <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-bold">2. JE Field Verify</span>
          <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
          <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-900 border border-sky-200 font-bold">3. AE Sanction</span>
          <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-300 font-extrabold shadow-2xs">4. Live Production GIS</span>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center space-x-2.5 shadow-xs animate-fadeIn font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-bold">{feedbackMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Submissions List */}
        <div className="lg:col-span-1 bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900 flex items-center space-x-2 font-mono">
              <FileCheck className="w-4 h-4 text-neutral-700" />
              <span>Survey Submissions</span>
            </h3>
            <span className="text-[10px] text-neutral-600 font-mono px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 font-bold">
              {submissions.length} Total
            </span>
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {submissions.map(sub => {
              const isSelected = selectedSub?.id === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSub(sub)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-50 border-neutral-900 shadow-xs ring-1 ring-neutral-900'
                      : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-neutral-950">{sub.submissionCode}</span>
                    {getStatusBadge(sub.status)}
                  </div>
                  <div className="font-semibold text-xs text-neutral-900 mt-1 truncate">{sub.title}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5 font-mono">By {sub.contractorName}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Submission Details & Approval Actions */}
        {selectedSub && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-bold text-sm sm:text-base text-neutral-950">{selectedSub.title}</h2>
                    {getStatusBadge(selectedSub.status)}
                  </div>
                  <div className="text-xs text-neutral-500 font-mono mt-0.5">
                    {selectedSub.submissionCode} • Section: {selectedSub.sectionName}
                  </div>
                </div>

                {/* Authority Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  {/* JE Action */}
                  {selectedSub.status === 'submitted' && (
                    <button
                      onClick={handleJEVerify}
                      className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Verify as JE</span>
                    </button>
                  )}

                  {/* AE Action */}
                  {selectedSub.status === 'je_verified' && (
                    <button
                      onClick={handleAEApprove}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Sanction & Publish (AE)</span>
                    </button>
                  )}

                  {/* Reject Action */}
                  {(selectedSub.status === 'submitted' || selectedSub.status === 'je_verified') && (
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Reject</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Asset Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">Poles Captured</div>
                  <div className="text-xl font-extrabold text-neutral-950 font-mono mt-0.5">{selectedSub.assetCounts.poles || 0}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">Transformers (DTs)</div>
                  <div className="text-xl font-extrabold text-neutral-950 font-mono mt-0.5">{selectedSub.assetCounts.transformers || 0}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">Consumers / Meters</div>
                  <div className="text-xl font-extrabold text-neutral-950 font-mono mt-0.5">{selectedSub.assetCounts.consumers || 0}</div>
                </div>
              </div>

              {/* Rejection Reason display if rejected */}
              {selectedSub.status === 'rejected' && selectedSub.rejectionReason && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs font-mono">
                  <span className="font-bold">Mandatory Rectification Reason: </span>
                  <span className="text-rose-800">{selectedSub.rejectionReason}</span>
                </div>
              )}

              {/* Staging Assets Preview Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-neutral-900 uppercase tracking-wider font-mono">
                  Staged Assets ({stagingAssets.length})
                </h4>
                <div className="border border-neutral-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-neutral-50 text-neutral-600 font-mono text-[10px] uppercase tracking-wider border-b border-neutral-200">
                        <tr>
                          <th className="p-3">Temp Code</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">GPS Accuracy</th>
                          <th className="p-3">Coordinates</th>
                          <th className="p-3">Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 font-mono text-neutral-700">
                        {stagingAssets.map(asset => (
                          <tr key={asset.id} className="hover:bg-neutral-50 transition-colors">
                            <td className="p-3 font-bold text-neutral-950">{asset.temporaryCode}</td>
                            <td className="p-3 uppercase text-neutral-700 font-semibold">{asset.assetType}</td>
                            <td className="p-3 text-neutral-900 font-bold">±{asset.gpsAccuracyM}m</td>
                            <td className="p-3 text-neutral-500">{asset.coordinates[0].toFixed(5)}, {asset.coordinates[1].toFixed(5)}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono text-[10px] border border-emerald-200 font-bold">
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
                <h4 className="font-bold text-xs text-neutral-900 uppercase tracking-wider flex items-center space-x-2 font-mono">
                  <History className="w-4 h-4 text-neutral-700" />
                  <span>Approval Audit History Trail</span>
                </h4>
                <div className="space-y-2">
                  {history.map(entry => (
                    <div key={entry.id} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold text-neutral-950">{entry.actorName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white text-neutral-800 ml-2 font-mono uppercase border border-neutral-300 font-bold">
                          {entry.action}
                        </span>
                        <div className="text-[11px] text-neutral-600 mt-1 font-mono">{entry.comments}</div>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">
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
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-white border border-neutral-300 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-sm text-neutral-950 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Reject Field Survey Submission</span>
              </h3>
              <button onClick={() => setShowRejectModal(false)} className="p-1 rounded text-neutral-400 hover:text-neutral-900 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed font-mono">
              Engineering standards mandate a written engineering justification when rejecting contractor field surveys.
            </p>

            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Pole P-03 GPS accuracy exceeds 2m tolerance; conductor span has invalid snapping relationship."
              className="w-full h-24 bg-neutral-50 border border-neutral-300 rounded-xl p-3 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
            />

            <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-100">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
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

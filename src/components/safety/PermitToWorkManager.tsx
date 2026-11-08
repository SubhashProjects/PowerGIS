// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// ELECTRICAL SAFETY & PERMIT TO WORK (PTW) WORKFLOW MANAGER
// Isolation, Earthing, Danger Notices, Line Clear & Restoration Authorizations
// ============================================================================

import React, { useState } from 'react';
import { initialPTWs, initialFeeders } from '../../services/mockData';
import { SafetyPermit } from '../../types/operations';
import {
  HardHat, ShieldAlert, CheckCircle2, AlertTriangle, FileText, Plus, Lock, CheckSquare
} from 'lucide-react';

export const PermitToWorkManager: React.FC = () => {
  const [permits, setPermits] = useState<SafetyPermit[]>(initialPTWs);
  const [selectedPermit, setSelectedPermit] = useState<SafetyPermit | null>(permits[0] || null);
  const [showNewModal, setShowNewModal] = useState<boolean>(false);

  // Form State
  const [feederId, setFeederId] = useState<string>('fdr-mara-1');
  const [workDesc, setWorkDesc] = useState<string>('');
  const [isolationPoints, setIsolationPoints] = useState<string>('Substation 11kV Breaker opened, racked out & earthed');
  const [earthingConfirmed, setEarthingConfirmed] = useState<boolean>(true);
  const [dangerNotices, setDangerNotices] = useState<boolean>(true);

  const handleCreatePTW = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workDesc.trim()) {
      alert('Please enter work description for PTW.');
      return;
    }

    const fdr = initialFeeders.find(f => f.id === feederId) || initialFeeders[0];

    const newPTW: SafetyPermit = {
      id: `ptw-${Date.now()}`,
      ptwNumber: `PTW-2026-${String(permits.length + 1).padStart(3, '0')}`,
      feederId,
      feederCode: fdr.code,
      applicantName: 'Er. V. Anand, JE',
      issuingOfficerName: 'Er. T. Senthil Nathan, AE',
      workDescription: workDesc,
      isolationPoints,
      earthingConfirmed,
      dangerNoticesPosted: dangerNotices,
      gasDischargeTested: true,
      status: 'isolated',
      issueTime: new Date().toISOString(),
      sectionId: 'sec-mara',
    };

    setPermits([newPTW, ...permits]);
    setSelectedPermit(newPTW);
    setShowNewModal(false);
    setWorkDesc('');
  };

  const handleClearPTW = (id: string) => {
    setPermits(prev =>
      prev.map(p => (p.id === id ? { ...p, status: 'restored', clearanceTime: new Date().toISOString() } : p))
    );
    if (selectedPermit?.id === id) {
      setSelectedPermit({ ...selectedPermit, status: 'restored', clearanceTime: new Date().toISOString() });
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">Electrical Safety Management (Permit to Work - PTW)</h2>
            <p className="text-xs text-slate-400">Lockout/Tagout (LOTO) • Mandatory Isolation & Line Clear Verification</p>
          </div>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30 flex items-center space-x-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Issue New PTW</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Permits List */}
        <div className="lg:col-span-1 bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
          <h3 className="font-semibold text-xs text-white uppercase tracking-wider border-b border-slate-800 pb-2">
            Permit Register ({permits.length})
          </h3>

          <div className="space-y-2">
            {permits.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPermit(p)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedPermit?.id === p.id
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10'
                    : 'bg-[#0a101b] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-amber-300">{p.ptwNumber}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                    p.status === 'isolated' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {p.status}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-200 mt-1 truncate">{p.feederCode}</div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{p.workDescription}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Permit Inspection Card */}
        {selectedPermit && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-sm text-white">{selectedPermit.ptwNumber}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/25">
                      {selectedPermit.status}
                    </span>
                  </div>
                  <div className="text-xs text-sky-400 font-mono mt-0.5">Feeder: {selectedPermit.feederCode}</div>
                </div>

                {selectedPermit.status === 'isolated' && (
                  <button
                    onClick={() => handleClearPTW(selectedPermit.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authorize Line Clear & Re-energize</span>
                  </button>
                )}
              </div>

              <div>
                <span className="text-[11px] text-slate-400 font-medium">Work Description & Scope:</span>
                <p className="text-xs text-slate-200 mt-1 p-2.5 rounded-xl bg-[#090f1a] border border-slate-800">
                  {selectedPermit.workDescription}
                </p>
              </div>

              {/* Statutory Safety Checklist */}
              <div className="p-4 rounded-xl bg-[#090f1a] border border-slate-800 space-y-2.5">
                <h4 className="font-semibold text-xs text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Lock className="w-4 h-4" />
                  <span>Mandatory Statutory Safety Verifications (CEA Safety Regs)</span>
                </h4>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    <span>Isolation Points Locked Out: <b>{selectedPermit.isolationPoints}</b></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    <span>Portable Earths Applied on Both Sides of Work Section: <b>CONFIRMED</b></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    <span>'MEN AT WORK - DO NOT CLOSE' Caution Boards Posted: <b>CONFIRMED</b></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    <span>Gas Discharge & Induction Voltage Tested Zero: <b>VERIFIED</b></span>
                  </div>
                </div>
              </div>

              {/* Signatures & Authority */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono p-3 rounded-xl bg-[#0a101b] border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400">Applicant Officer:</span>
                  <div className="font-semibold text-slate-200 mt-0.5">{selectedPermit.applicantName}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Issuing Authority:</span>
                  <div className="font-semibold text-slate-200 mt-0.5">{selectedPermit.issuingOfficerName}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New PTW Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreatePTW} className="bg-[#121b2d] border border-slate-700 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <HardHat className="w-4 h-4 text-amber-400" />
              <span>Issue Electrical Permit to Work (Line Clear)</span>
            </h3>

            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">Target Feeder to Isolate</label>
              <select
                value={feederId}
                onChange={e => setFeederId(e.target.value)}
                className="w-full bg-[#0a101b] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
              >
                {initialFeeders.map(f => (
                  <option key={f.id} value={f.id}>{f.code} - {f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">Work Description</label>
              <textarea
                value={workDesc}
                onChange={e => setWorkDesc(e.target.value)}
                placeholder="e.g. Conductor stringing and tree clearance between Pole 2 and Pole 4."
                className="w-full h-20 bg-[#0a101b] border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">Isolation & Lockout Protocol</label>
              <input
                type="text"
                value={isolationPoints}
                onChange={e => setIsolationPoints(e.target.value)}
                className="w-full bg-[#0a101b] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/30"
              >
                Sign & Issue Permit
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

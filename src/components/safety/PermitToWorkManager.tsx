// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ELECTRICAL SAFETY & PERMIT TO WORK (PTW) WORKFLOW MANAGER
// PURE WHITE THEME & STATUTORY CEA LOTO PROTOCOLS
// ============================================================================

import React, { useState, useEffect } from 'react';
import { initialPTWs, initialFeeders } from '../../services/mockData';
import { assetService } from '../../services/assetService';
import { SafetyPermit } from '../../types/operations';
import {
  HardHat, ShieldAlert, CheckCircle2, AlertTriangle, FileText, Plus, Lock, CheckSquare, X, Zap
} from 'lucide-react';

export const PermitToWorkManager: React.FC = () => {
  const [userPermits, setUserPermits] = useState<SafetyPermit[]>([]);
  const [simPermits, setSimPermits] = useState<SafetyPermit[]>(initialPTWs);
  const [isSimActive, setIsSimActive] = useState<boolean>(assetService.isSimulatorMode());

  useEffect(() => {
    const unsub = assetService.subscribe(() => {
      setIsSimActive(assetService.isSimulatorMode());
    });
    return unsub;
  }, []);

  const permits = isSimActive ? [...userPermits, ...simPermits] : userPermits;
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

    setUserPermits(prev => [newPTW, ...prev]);
    setSelectedPermit(newPTW);
    setShowNewModal(false);
    setWorkDesc('');
  };

  const handleClearPTW = (id: string) => {
    if (userPermits.some(p => p.id === id)) {
      setUserPermits(prev =>
        prev.map(p => (p.id === id ? { ...p, status: 'restored', clearanceTime: new Date().toISOString() } : p))
      );
    } else {
      setSimPermits(prev =>
        prev.map(p => (p.id === id ? { ...p, status: 'restored', clearanceTime: new Date().toISOString() } : p))
      );
    }
    if (selectedPermit?.id === id) {
      setSelectedPermit({ ...selectedPermit, status: 'restored', clearanceTime: new Date().toISOString() });
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-neutral-900 select-none">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white font-extrabold flex items-center justify-center text-lg shadow-xs flex-shrink-0">
            <HardHat className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
                Electrical Safety & Permit to Work (PTW) Gateway
              </h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                CEA SAFETY REGS
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">
              Lockout / Tagout (LOTO) · Mandatory Isolation · Line Clear & Re-energize Authorization
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Issue New PTW</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Permits List */}
        <div className="lg:col-span-1 bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
            <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">
              Permit Register ({permits.length})
            </h3>
            <span className="text-[10px] text-neutral-500 font-mono">Statutory Clearances</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {permits.map(p => {
              const isSelected = selectedPermit?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPermit(p)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-50 border-neutral-900 shadow-xs ring-1 ring-neutral-900'
                      : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-neutral-950">{p.ptwNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                      p.status === 'isolated'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-neutral-900 mt-1 truncate">{p.feederCode}</div>
                  <p className="text-[11px] text-neutral-500 truncate mt-0.5">{p.workDescription}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Permit Inspection Card */}
        {selectedPermit && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-extrabold text-base text-neutral-950">{selectedPermit.ptwNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                      selectedPermit.status === 'isolated'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    }`}>
                      {selectedPermit.status}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-600 font-mono mt-0.5">Isolated Feeder: {selectedPermit.feederCode}</div>
                </div>

                {selectedPermit.status === 'isolated' && (
                  <button
                    onClick={() => handleClearPTW(selectedPermit.id)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all self-start sm:self-auto cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authorize Line Clear & Re-energize</span>
                  </button>
                )}
              </div>

              <div>
                <span className="text-[11px] text-neutral-500 font-mono font-medium">Work Description & Scope:</span>
                <p className="text-xs text-neutral-800 mt-1 p-3 rounded-xl bg-neutral-50 border border-neutral-200 leading-relaxed">
                  {selectedPermit.workDescription}
                </p>
              </div>

              {/* Statutory Safety Checklist */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                <h4 className="font-bold text-xs text-neutral-900 uppercase tracking-wider flex items-center space-x-1.5 font-mono">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Mandatory Statutory Safety Verifications (CEA Safety Regs)</span>
                </h4>

                <div className="space-y-2 text-xs text-neutral-700 font-sans">
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Isolation Points Locked Out: <b>{selectedPermit.isolationPoints}</b></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Portable Earths Applied on Both Sides of Work Section: <b>CONFIRMED</b></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>'MEN AT WORK - DO NOT CLOSE' Caution Boards Posted: <b>CONFIRMED</b></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Gas Discharge & Induction Voltage Tested Zero: <b>VERIFIED</b></span>
                  </div>
                </div>
              </div>

              {/* Signatures & Authority */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono p-3 rounded-xl bg-white border border-neutral-200">
                <div>
                  <span className="text-[10px] text-neutral-500 font-sans">Applicant Officer:</span>
                  <div className="font-bold text-neutral-950 mt-0.5">{selectedPermit.applicantName}</div>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 font-sans">Issuing Authority:</span>
                  <div className="font-bold text-neutral-950 mt-0.5">{selectedPermit.issuingOfficerName}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New PTW Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <form onSubmit={handleCreatePTW} className="bg-white border border-neutral-300 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-sm text-neutral-950 flex items-center space-x-2">
                <HardHat className="w-4 h-4 text-amber-600" />
                <span>Issue Electrical Permit to Work (Line Clear)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-neutral-600 font-medium mb-1 font-mono">Target Feeder to Isolate</label>
              <select
                value={feederId}
                onChange={e => setFeederId(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono focus:bg-white focus:outline-none focus:border-neutral-900"
              >
                {initialFeeders.map(f => (
                  <option key={f.id} value={f.id}>{f.code} - {f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-neutral-600 font-medium mb-1 font-mono">Work Description</label>
              <textarea
                value={workDesc}
                onChange={e => setWorkDesc(e.target.value)}
                placeholder="e.g. Conductor stringing and tree clearance between Pole 2 and Pole 4."
                className="w-full h-20 bg-neutral-50 border border-neutral-300 rounded-xl p-3 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="block text-[11px] text-neutral-600 font-medium mb-1 font-mono">Isolation & Lockout Protocol</label>
              <input
                type="text"
                value={isolationPoints}
                onChange={e => setIsolationPoints(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono focus:bg-white focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs cursor-pointer"
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

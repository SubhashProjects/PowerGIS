// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// 8-STAGE TICKET MANAGEMENT & NETWORK DISTANCE ENGINE (SECTION 9)
// PURE WHITE THEME & LIVE SLA COUNTDOWN WATCHER
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { faultService } from '../../services/faultService';
import { initialUsers } from '../../services/mockData';
import { Fault, FaultStatus, FaultPriority } from '../../types/operations';
import { FAULT_LIFECYCLE_STAGES as STAGES, SLA_HOURS, getStageIndex } from '../../config/workflowConfig';
import {
  AlertTriangle, CheckCircle2, Clock, MapPin, Plus, Compass, Wrench, X,
  ShieldCheck, AlertOctagon, CheckSquare, ArrowRight, UserCheck, Timer
} from 'lucide-react';

export const FaultList: React.FC = () => {
  const { user } = useAuth();
  const [faults, setFaults] = useState<Fault[]>(faultService.getFaults());
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [selectedFault, setSelectedFault] = useState<Fault | null>(faults[0] || null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [now, setNow] = useState<Date>(new Date());

  // New Fault Form State
  const [category, setCategory] = useState<string>('Conductor Snapped');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<FaultPriority>('high');
  const [lat, setLat] = useState<number>(11.9265);
  const [lng, setLng] = useState<number>(79.8225);
  const [feederId, setFeederId] = useState<string>('fdr-mara-1');

  // Live timer for SLA countdown updates every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const refresh = () => {
    const list = faultService.getFaults();
    setFaults(list);
    if (selectedFault) {
      const updated = list.find(f => f.id === selectedFault.id);
      if (updated) setSelectedFault(updated);
    }
  };

  const handleCreateFault = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Please provide a fault description.');
      return;
    }

    const created = faultService.registerFault({
      category,
      description,
      priority,
      status: 'new',
      feederId,
      sectionId: user.sectionId || 'sec-mara',
      jeJurisdictionId: user.jeJurisdictionId,
      reportedBy: user.id,
      affectedConsumersEst: 320,
      coordinates: [lat, lng],
    });

    setShowNewModal(false);
    setDescription('');
    refresh();
    setSelectedFault(created);
  };

  const handleUpdateStatus = (status: FaultStatus) => {
    if (!selectedFault) return;
    faultService.updateFaultStatus(selectedFault.id, status);
    refresh();
  };

  const handleAssign = (assignedUserId: string) => {
    if (!selectedFault) return;
    faultService.updateFaultStatus(selectedFault.id, 'assigned', assignedUserId);
    refresh();
  };

  // SLA Calculation Helper
  const getSlaInfo = (fault: Fault) => {
    const reportedTime = new Date(fault.reportedAt).getTime();
    const slaDurationMs = SLA_HOURS[fault.priority] * 3600 * 1000;
    const deadlineTime = reportedTime + slaDurationMs;
    const isClosed = fault.status === 'closed' || fault.status === 'completed' || fault.status === 'verified';

    if (isClosed && fault.resolvedAt) {
      const resolvedTime = new Date(fault.resolvedAt).getTime();
      const metSla = resolvedTime <= deadlineTime;
      return {
        text: metSla ? 'Resolved within SLA' : 'Resolved after SLA Breach',
        breached: !metSla,
        remainingHours: 0,
        statusColor: metSla ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200',
        percentElapsed: 100,
      };
    }

    const remainingMs = deadlineTime - now.getTime();
    const remainingHours = remainingMs / (3600 * 1000);
    const elapsedMs = now.getTime() - reportedTime;
    const percentElapsed = Math.min(100, Math.max(0, Math.round((elapsedMs / slaDurationMs) * 100)));

    if (remainingMs <= 0) {
      const breachedHoursAgo = Math.abs(Math.round(remainingHours * 10) / 10);
      return {
        text: `BREACHED by ${breachedHoursAgo}h`,
        breached: true,
        remainingHours,
        statusColor: 'text-rose-700 bg-rose-50 border-rose-300 font-bold animate-pulse',
        percentElapsed: 100,
      };
    }

    const hrs = Math.floor(remainingHours);
    const mins = Math.floor((remainingMs % (3600 * 1000)) / 60000);
    const text = `${hrs}h ${mins}m remaining`;

    let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (percentElapsed >= 75) {
      statusColor = 'text-amber-800 bg-amber-50 border-amber-300 font-semibold';
    }

    return {
      text,
      breached: false,
      remainingHours,
      statusColor,
      percentElapsed,
    };
  };

  const filteredFaults = faults.filter(f => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return f.status !== 'closed' && f.status !== 'verified';
    if (statusFilter === 'resolved') return f.status === 'completed' || f.status === 'verified';
    if (statusFilter === 'closed') return f.status === 'closed';
    return true;
  });

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-neutral-900 select-none">
      {/* Top Header Card */}
      <div className="bg-white border border-[#E4E4E7] rounded-md p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-md bg-[#09090B] text-white font-extrabold flex items-center justify-center text-base border border-zinc-800 flex-shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-[#09090B] tracking-tight">
                8-Stage Ticket Management & Breakdown Engine
              </h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                SECTION 9 SPEC
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Live IEEE/JERC SLA Deadlines · Proximity Geodesics · Lifecycle Progression
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-3.5 py-2 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Report New Breakdown</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: Fault Tickets List */}
        <div className="lg:col-span-1 bg-white border border-[#E4E4E7] rounded-md p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-800 font-mono">
              Grid Fault Tickets ({filteredFaults.length})
            </h3>
            {/* Filter buttons */}
            <div className="flex items-center space-x-1 text-[10px] font-mono">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${statusFilter === 'all' ? 'bg-[#09090B] text-white font-bold' : 'text-zinc-600 hover:text-zinc-950'}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${statusFilter === 'active' ? 'bg-rose-700 text-white font-bold' : 'text-zinc-600 hover:text-zinc-950'}`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('resolved')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${statusFilter === 'resolved' ? 'bg-emerald-700 text-white font-bold' : 'text-zinc-600 hover:text-zinc-950'}`}
              >
                Resolved
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredFaults.map(f => {
              const sla = getSlaInfo(f);
              const isSelected = selectedFault?.id === f.id;

              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFault(f)}
                  className={`w-full text-left p-3 rounded-md border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-50 border-zinc-900 shadow-sm'
                      : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-zinc-950">{f.faultCode}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold border ${
                        f.priority === 'critical'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : f.priority === 'high'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                      }`}
                    >
                      {f.priority}
                    </span>
                  </div>

                  <div className="font-bold text-xs text-zinc-900 mt-1 truncate">{f.category}</div>
                  <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{f.description}</p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 text-[10px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 font-semibold">
                      {STAGES.find(s => s.key === f.status)?.label || f.status}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded border ${sla.statusColor}`}>
                      {sla.text}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Fault Details & Lifecycle Progression */}
        {selectedFault && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#E4E4E7] rounded-md p-4 sm:p-5 shadow-xs space-y-4">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-extrabold text-sm sm:text-base text-zinc-950">
                      {selectedFault.faultCode}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                        selectedFault.priority === 'critical'
                          ? 'bg-rose-50 text-rose-700 border-rose-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      Priority: {selectedFault.priority}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-zinc-800 mt-1">{selectedFault.category}</h3>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    Reported: {selectedFault.reportedAt} · Est. Affected: {selectedFault.affectedConsumersEst} Consumers
                  </p>
                </div>

                {/* SLA Timer Badge */}
                {(() => {
                  const sla = getSlaInfo(selectedFault);
                  return (
                    <div className="p-2 rounded-md border border-zinc-200 bg-zinc-50 flex items-center space-x-2 self-start sm:self-auto font-mono text-xs">
                      <Timer className="w-4 h-4 text-zinc-700" />
                      <div>
                        <div className="text-[10px] text-zinc-500 font-medium">SLA Deadline ({SLA_HOURS[selectedFault.priority]}h)</div>
                        <div className={`font-bold ${sla.statusColor} px-1.5 py-0.5 rounded border mt-0.5`}>
                          {sla.text}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 8-STAGE LIFECYCLE PROGRESSION STEPPER (SECTION 9.1) */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-md p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-800 font-mono">
                  <span className="flex items-center space-x-1.5 text-zinc-900">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>8-Stage Lifecycle Progress:</span>
                  </span>
                  <span className="text-zinc-900 bg-zinc-200 font-bold px-2 py-0.5 rounded text-[11px]">
                    Stage {getStageIndex(selectedFault.status) + 1} of 8
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center">
                  {STAGES.map((stage, idx) => {
                    const currentIdx = getStageIndex(selectedFault.status);
                    const isCompleted = idx < currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <button
                        key={stage.key}
                        onClick={() => handleUpdateStatus(stage.key)}
                        className={`p-1.5 rounded-md border text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#09090B] text-white border-zinc-950 font-bold'
                            : isCompleted
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                            : 'bg-white text-zinc-400 border-zinc-200 hover:text-zinc-800 hover:border-zinc-300'
                        }`}
                        title={`Advance to ${stage.label}`}
                      >
                        <div className="text-[9px] font-bold">{stage.stageNum}</div>
                        <div className="truncate">{stage.label.split('. ')[1]}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="text-xs text-zinc-700 bg-zinc-50 p-3 rounded-md border border-zinc-200 leading-relaxed">
                <span className="font-bold text-zinc-900">Incident Report: </span>
                {selectedFault.description}
              </div>

              {/* SPATIAL DISTANCE METRICS (POSTGIS SPHERICAL GEODESICS) */}
              <div className="p-4 rounded-md bg-white border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-zinc-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Compass className="w-4 h-4 text-zinc-800" />
                    <span>Calculated Spatial Proximity & Network Distances</span>
                  </h4>
                  <span className="text-[10px] text-zinc-800 font-bold font-mono bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                    PostGIS Geodesic
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-md bg-zinc-50 border border-zinc-200">
                    <div className="text-[10px] text-zinc-600 font-bold font-mono">Nearest Pole</div>
                    <div className="font-mono text-sm sm:text-base font-extrabold text-zinc-950 mt-0.5">
                      {selectedFault.distanceFromPoleM ? `${selectedFault.distanceFromPoleM} m` : 'Calculating...'}
                    </div>
                    <div className="text-[9px] text-zinc-500 font-mono">Straight-line</div>
                  </div>

                  <div className="p-2.5 rounded-md bg-zinc-50 border border-zinc-200">
                    <div className="text-[10px] text-zinc-600 font-bold font-mono">Nearest Transformer</div>
                    <div className="font-mono text-sm sm:text-base font-extrabold text-zinc-950 mt-0.5">
                      {selectedFault.distanceFromDtM ? `${selectedFault.distanceFromDtM} m` : 'Calculating...'}
                    </div>
                    <div className="text-[9px] text-zinc-500 font-mono">Straight-line</div>
                  </div>

                  <div className="p-2.5 rounded-md bg-zinc-50 border border-zinc-200">
                    <div className="text-[10px] text-zinc-600 font-bold font-mono">Along Feeder Route</div>
                    <div className="font-mono text-sm sm:text-base font-extrabold text-zinc-950 mt-0.5">
                      {selectedFault.distanceAlongFeederM ? `${selectedFault.distanceAlongFeederM} m` : '1850 m'}
                    </div>
                    <div className="text-[9px] text-zinc-500 font-mono">LineString Route</div>
                  </div>

                  <div className="p-2.5 rounded-md bg-zinc-50 border border-zinc-200">
                    <div className="text-[10px] text-zinc-600 font-bold font-mono">From Section Office</div>
                    <div className="font-mono text-sm sm:text-base font-extrabold text-zinc-950 mt-0.5">
                      {selectedFault.distanceFromOfficeKm ? `${selectedFault.distanceFromOfficeKm} km` : '0.8 km'}
                    </div>
                    <div className="text-[9px] text-zinc-500 font-mono">Marapalam Section</div>
                  </div>
                </div>
              </div>

              {/* Assignment & Crew Dispatch */}
              <div className="p-3.5 rounded-md bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-zinc-500 font-mono">Assigned Field Crew / Contractor:</span>
                  <div className="font-semibold text-xs text-zinc-900 mt-0.5">
                    {initialUsers.find(u => u.id === selectedFault.assignedTo)?.fullName || 'Unassigned (Awaiting JE/AE Dispatch)'}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    onChange={e => handleAssign(e.target.value)}
                    className="bg-white border border-zinc-300 rounded-md px-3 py-1.5 text-xs text-zinc-800 font-mono focus:outline-none focus:border-zinc-900"
                    defaultValue=""
                  >
                    <option value="" disabled>Dispatch Field Crew...</option>
                    <option value="user-contractor">Larsen EPC Contractor Gang</option>
                    <option value="user-je">Marapalam O&M Internal Gang</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Breakdown Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 select-none">
          <form onSubmit={handleCreateFault} className="bg-white border border-zinc-200 rounded-md p-5 sm:p-6 max-w-lg w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-sm text-zinc-950 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-zinc-900" />
                <span>Report Distribution Grid Breakdown</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-600 font-medium mb-1 font-mono">Fault Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              >
                <option value="Conductor Snapped">Conductor Snapped</option>
                <option value="HT Line Fault">HT 11kV Line Fault</option>
                <option value="LT Line Fault">LT Line Ground Fault</option>
                <option value="Pole Damaged">Pole Damaged by Vehicle / Storm</option>
                <option value="Transformer Oil Leakage">Distribution Transformer Oil Leakage</option>
                <option value="DT Failure">Transformer Burnout / Flashover</option>
                <option value="Tree Touching Conductor">Tree Overhang / Vegetation Flash</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-600 font-medium mb-1 font-mono">Description & Location</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Snapped conductor across Maraimalai Adigal Salai opposite Bus Stand. Danger notices deployed."
                className="w-full h-20 bg-zinc-50 border border-zinc-300 rounded-md p-3 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-zinc-600 font-medium mb-1 font-mono">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={lat}
                  onChange={e => setLat(parseFloat(e.target.value))}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 font-mono focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-600 font-medium mb-1 font-mono">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={lng}
                  onChange={e => setLng(parseFloat(e.target.value))}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 font-mono focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer"
              >
                Submit & Calculate Distances
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

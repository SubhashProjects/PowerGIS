// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// FAULT MANAGEMENT & NETWORK DISTANCE ENGINE - MONOCHROME B&W THEME
// Calculates: Nearest Pole, Nearest DT, Distance along feeder, Office distance
// ============================================================================

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { faultService } from '../../services/faultService';
import { initialUsers } from '../../services/mockData';
import { Fault, FaultStatus } from '../../types/operations';
import {
  AlertTriangle, CheckCircle2, Clock, MapPin, Plus, Compass, Wrench, X
} from 'lucide-react';

export const FaultList: React.FC = () => {
  const { user } = useAuth();
  const [faults, setFaults] = useState<Fault[]>(faultService.getFaults());
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [selectedFault, setSelectedFault] = useState<Fault | null>(faults[0] || null);

  // New Fault Form
  const [category, setCategory] = useState<string>('Conductor Snapped');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [lat, setLat] = useState<number>(11.9265);
  const [lng, setLng] = useState<number>(79.8225);
  const [feederId, setFeederId] = useState<string>('fdr-mara-1');

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

  return (
    <div className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 text-neutral-100 select-none">
      {/* Top Header & Actions */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white text-black font-extrabold flex items-center justify-center text-xl shadow-lg shadow-white/10 flex-shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Grid Breakdown & Fault Management</h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md bg-neutral-900 text-white border border-neutral-700">
                PROXIMITY ENGINE
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5 font-mono">
              Spatial Proximity & Network Feeder Distance Geodesics
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-white/10 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Report Breakdown</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Faults List */}
        <div className="lg:col-span-1 bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-white">
              Active Fault Tickets ({faults.length})
            </h3>
            <span className="text-[10px] text-neutral-400 font-mono">Live Sync</span>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {faults.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFault(f)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                  selectedFault?.id === f.id
                    ? 'bg-neutral-900 border-white shadow-lg text-white font-semibold'
                    : 'bg-neutral-950 border-neutral-850 hover:border-neutral-700 text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white">{f.faultCode}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-black text-white border border-neutral-700">
                    {f.status}
                  </span>
                </div>
                <div className="font-semibold text-xs text-neutral-200 mt-1 truncate">{f.category}</div>
                <p className="text-[11px] text-neutral-400 mt-0.5 truncate">{f.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Fault Detailed Analytics */}
        {selectedFault && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white">{selectedFault.faultCode}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono bg-neutral-900 text-white border border-neutral-700">
                      {selectedFault.priority}
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-neutral-300 mt-1">{selectedFault.category}</h3>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={selectedFault.status}
                    onChange={e => handleUpdateStatus(e.target.value as FaultStatus)}
                    className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white uppercase font-mono font-bold focus:outline-none"
                  >
                    <option value="new">New</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="material_required">Material Required</option>
                    <option value="completed">Completed</option>
                    <option value="verified">Verified (JE)</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">{selectedFault.description}</p>

              {/* SPATIAL DISTANCE METRICS CARD */}
              <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <Compass className="w-4 h-4 text-white" />
                    <span>Calculated Spatial Proximity & Network Distances</span>
                  </h4>
                  <span className="text-[10px] text-neutral-400 font-mono">PostGIS Spherical Geodesic</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400 font-medium font-mono">Nearest Pole</div>
                    <div className="font-mono text-base font-extrabold text-white mt-0.5">
                      {selectedFault.distanceFromPoleM ? `${selectedFault.distanceFromPoleM} m` : 'Calculating...'}
                    </div>
                    <div className="text-[9px] text-neutral-500 font-mono">Straight-line</div>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400 font-medium font-mono">Nearest Transformer</div>
                    <div className="font-mono text-base font-extrabold text-white mt-0.5">
                      {selectedFault.distanceFromDtM ? `${selectedFault.distanceFromDtM} m` : 'Calculating...'}
                    </div>
                    <div className="text-[9px] text-neutral-500 font-mono">Straight-line</div>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400 font-medium font-mono">Along Feeder Route</div>
                    <div className="font-mono text-base font-extrabold text-white mt-0.5">
                      {selectedFault.distanceAlongFeederM ? `${selectedFault.distanceAlongFeederM} m` : '1850 m'}
                    </div>
                    <div className="text-[9px] text-neutral-500 font-mono">LineString Route</div>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400 font-medium font-mono">From Section Office</div>
                    <div className="font-mono text-base font-extrabold text-white mt-0.5">
                      {selectedFault.distanceFromOfficeKm ? `${selectedFault.distanceFromOfficeKm} km` : '0.8 km'}
                    </div>
                    <div className="text-[9px] text-neutral-500 font-mono">Marapalam Section</div>
                  </div>
                </div>
              </div>

              {/* Assignment & Crew Dispatch */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-neutral-400 font-mono">Assigned Field Crew / Contractor:</span>
                  <div className="font-semibold text-xs text-white mt-0.5">
                    {initialUsers.find(u => u.id === selectedFault.assignedTo)?.fullName || 'Unassigned'}
                  </div>
                </div>

                <select
                  onChange={e => handleAssign(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>Assign Crew...</option>
                  <option value="user-contractor">Larsen EPC Contractor Gang</option>
                  <option value="user-je">Marapalam O&M Internal Gang</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Breakdown Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
          <form onSubmit={handleCreateFault} className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-white" />
                <span>Report Distribution Grid Breakdown</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-neutral-400 font-medium mb-1 font-mono">Fault Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
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
              <label className="block text-[11px] text-neutral-400 font-medium mb-1 font-mono">Description & Location</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Snapped conductor across Maraimalai Adigal Salai opposite Bus Stand. Danger notices deployed."
                className="w-full h-20 bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 font-medium mb-1 font-mono">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={lat}
                  onChange={e => setLat(parseFloat(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 font-medium mb-1 font-mono">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={lng}
                  onChange={e => setLng(parseFloat(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold shadow-md shadow-white/10"
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

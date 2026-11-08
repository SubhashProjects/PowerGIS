// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// TASK & WORK ORDER MANAGEMENT KANBAN BOARD - MONOCHROME B&W THEME
// Columns: Assigned -> In Progress -> Completed -> Verified (JE) -> Closed (AE)
// ============================================================================

import React, { useState } from 'react';
import { initialWorkOrders } from '../../services/mockData';
import { WorkOrder, WorkOrderStatus } from '../../types/operations';
import {
  CheckSquare, Plus, User, ArrowRight, X
} from 'lucide-react';

export const WorkOrderKanban: React.FC = () => {
  const [orders, setOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [showNewModal, setShowNewModal] = useState<boolean>(false);

  // New Work Order form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Line Maintenance');
  const [instructions, setInstructions] = useState('');
  const [assignedCrew, setAssignedCrew] = useState('Marapalam Breakdown Gang #1');

  const columns: Array<{ id: WorkOrderStatus; title: string }> = [
    { id: 'assigned', title: 'Assigned to Crew' },
    { id: 'in_progress', title: 'In Progress / On Site' },
    { id: 'completed', title: 'Work Completed' },
    { id: 'verified', title: 'JE Verified' },
    { id: 'closed', title: 'AE Approved & Closed' },
  ];

  const handleAdvanceStatus = (orderId: string, currentStatus: WorkOrderStatus) => {
    let nextStatus: WorkOrderStatus = currentStatus;
    if (currentStatus === 'assigned') nextStatus = 'in_progress';
    else if (currentStatus === 'in_progress') nextStatus = 'completed';
    else if (currentStatus === 'completed') nextStatus = 'verified';
    else if (currentStatus === 'verified') nextStatus = 'closed';

    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newOrder: WorkOrder = {
      id: `wo-${Date.now()}`,
      orderNumber: `WO-2026-${String(orders.length + 101).padStart(4, '0')}`,
      title,
      category,
      instructions,
      priority: 'high',
      status: 'assigned',
      assignedCrew,
      sectionId: 'sec-mara',
      jeVerified: false,
      aeApproved: false,
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    };

    setOrders([newOrder, ...orders]);
    setShowNewModal(false);
    setTitle('');
    setInstructions('');
  };

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-neutral-100 select-none">
      {/* Top Banner */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white text-black font-extrabold flex items-center justify-center text-xl shadow-lg shadow-white/10 flex-shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Work Order & Maintenance Task Kanban</h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md bg-neutral-900 text-white border border-neutral-700">
                FIELD WORKFLOW
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5 font-mono">
              Field Gang Dispatch • Multi-Tier Verification (JE/AE) • Material Reconciliation
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-white/10 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Work Order</span>
        </button>
      </div>

      {/* 5-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 sm:gap-4 overflow-x-auto pb-4">
        {columns.map(col => {
          const colOrders = orders.filter(o => o.status === col.id);

          return (
            <div
              key={col.id}
              className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-3.5 flex flex-col space-y-3 min-h-[480px]"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <span className="font-bold text-xs uppercase tracking-wider text-white">{col.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-900 font-mono text-neutral-300 border border-neutral-800">
                  {colOrders.length}
                </span>
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {colOrders.map(order => (
                  <div
                    key={order.id}
                    className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-850 hover:border-neutral-700 shadow-md text-xs space-y-2 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-white font-bold text-[10px]">{order.orderNumber}</span>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-800">
                        {order.priority}
                      </span>
                    </div>

                    <h4 className="font-semibold text-neutral-100 text-xs leading-tight">{order.title}</h4>
                    <p className="text-[11px] text-neutral-400 line-clamp-2">{order.instructions}</p>

                    <div className="pt-2 border-t border-neutral-850 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                      <span className="flex items-center space-x-1">
                        <User className="w-3 h-3 text-neutral-500" />
                        <span className="truncate max-w-[90px]">{order.assignedCrew}</span>
                      </span>

                      {col.id !== 'closed' && (
                        <button
                          onClick={() => handleAdvanceStatus(order.id, order.status)}
                          className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-white hover:text-black text-neutral-300 font-bold flex items-center space-x-1 transition-colors"
                          title="Advance to next workflow stage"
                        >
                          <span>Next</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Work Order Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
          <form onSubmit={handleCreateOrder} className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-white" />
                <span>Create Distribution Work Order</span>
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
              <label className="block text-[11px] text-neutral-400 font-medium mb-1 font-mono">Work Order Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Conductor re-stringing on Marapalam 11kV Feeder"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 font-medium mb-1 font-mono">Task Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="Line Maintenance">Line Maintenance</option>
                  <option value="Pole Replacement">Pole Replacement</option>
                  <option value="DT Replacement">DT Replacement</option>
                  <option value="Conductor Replacement">Conductor Replacement</option>
                  <option value="Smart Meter Installation">Smart Meter Installation</option>
                  <option value="Emergency Repair">Emergency Repair</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 font-medium mb-1 font-mono">Assigned Crew</label>
                <input
                  type="text"
                  value={assignedCrew}
                  onChange={e => setAssignedCrew(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-neutral-400 font-medium mb-1 font-mono">Gang Instructions</label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="Instructions on safety, required material and line clear."
                className="w-full h-20 bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-white"
              />
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
                Create Work Order
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// TASK & WORK ORDER MANAGEMENT KANBAN BOARD (SECTION 10)
// PURE WHITE THEME & 5-STAGE WORKFLOW KANBAN
// Columns: Assigned -> In Progress -> Completed -> Verified (JE) -> Closed (AE)
// ============================================================================

import React, { useState } from 'react';
import { initialWorkOrders } from '../../services/mockData';
import { WorkOrder, WorkOrderStatus } from '../../types/operations';
import {
  CheckSquare, Plus, User, ArrowRight, X, Clock, Calendar, CheckCircle2
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
    { id: 'assigned', title: '1. Assigned to Crew' },
    { id: 'in_progress', title: '2. In Progress / On Site' },
    { id: 'completed', title: '3. Work Completed' },
    { id: 'verified', title: '4. JE Verified' },
    { id: 'closed', title: '5. AE Approved & Closed' },
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
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-neutral-900 select-none">
      {/* Top Banner */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white font-extrabold flex items-center justify-center text-lg shadow-xs flex-shrink-0">
            <CheckSquare className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
                Work Order & Maintenance Task Kanban
              </h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                FIELD WORKFLOW KANBAN
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">
              Field Gang Dispatch · Multi-Tier Verification (JE/AE) · Material Consumption Tracking
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs self-start sm:self-auto cursor-pointer"
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
              className="bg-white border border-neutral-200 rounded-2xl p-3.5 flex flex-col space-y-3 min-h-[500px] shadow-2xs"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <span className="font-bold text-xs uppercase tracking-wider text-neutral-900 font-mono">
                  {col.title}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 font-mono font-bold text-neutral-700 border border-neutral-200">
                  {colOrders.length}
                </span>
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {colOrders.map(order => (
                  <div
                    key={order.id}
                    className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 hover:border-neutral-300 shadow-2xs text-xs space-y-2 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-neutral-950 font-bold text-[10px]">{order.orderNumber}</span>
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                          order.priority === 'critical'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {order.priority}
                      </span>
                    </div>

                    <h4 className="font-bold text-neutral-900 text-xs leading-snug">{order.title}</h4>
                    <p className="text-[11px] text-neutral-600 line-clamp-2 leading-relaxed">{order.instructions}</p>

                    <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                      <span className="flex items-center space-x-1 truncate max-w-[110px]">
                        <User className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                        <span className="truncate">{order.assignedCrew}</span>
                      </span>

                      {col.id !== 'closed' && (
                        <button
                          onClick={() => handleAdvanceStatus(order.id, order.status)}
                          className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-bold flex items-center space-x-1 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <form onSubmit={handleCreateOrder} className="bg-white border border-neutral-300 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-sm text-neutral-950 flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-neutral-900" />
                <span>Create Distribution Work Order</span>
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
              <label className="block text-[11px] text-neutral-600 font-medium mb-1 font-mono">Work Order Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Conductor re-stringing on Marapalam 11kV Feeder"
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1 font-mono">Task Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
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
                <label className="block text-[11px] text-neutral-600 font-medium mb-1 font-mono">Assigned Crew</label>
                <input
                  type="text"
                  value={assignedCrew}
                  onChange={e => setAssignedCrew(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono focus:bg-white focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-neutral-600 font-medium mb-1 font-mono">Gang Instructions</label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="Instructions on safety, required material and line clear."
                className="w-full h-20 bg-neutral-50 border border-neutral-300 rounded-xl p-3 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
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
                Create Work Order
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

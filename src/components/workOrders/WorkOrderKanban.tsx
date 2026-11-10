// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// TASK & WORK ORDER MANAGEMENT KANBAN BOARD (SECTION 10)
// PURE WHITE THEME & 5-STAGE WORKFLOW KANBAN
// Columns: Assigned -> In Progress -> Completed -> Verified (JE) -> Closed (AE)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { initialWorkOrders } from '../../services/mockData';
import { assetService } from '../../services/assetService';
import { WorkOrder, WorkOrderStatus } from '../../types/operations';
import { WORK_ORDER_COLUMNS } from '../../config/workflowConfig';
import {
  CheckSquare, Plus, User, ArrowRight, X, Clock, Calendar, CheckCircle2, Zap
} from 'lucide-react';

export const WorkOrderKanban: React.FC = () => {
  const [userOrders, setUserOrders] = useState<WorkOrder[]>([]);
  const [simOrders, setSimOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [isSimActive, setIsSimActive] = useState<boolean>(assetService.isSimulatorMode());
  const [showNewModal, setShowNewModal] = useState<boolean>(false);

  useEffect(() => {
    const unsub = assetService.subscribe(() => {
      setIsSimActive(assetService.isSimulatorMode());
    });
    return unsub;
  }, []);

  const orders = isSimActive ? [...userOrders, ...simOrders] : userOrders;

  // New Work Order form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Line Maintenance');
  const [instructions, setInstructions] = useState('');
  const [assignedCrew, setAssignedCrew] = useState('Marapalam Breakdown Gang #1');

  const columns = WORK_ORDER_COLUMNS;

  const handleAdvanceStatus = (orderId: string, currentStatus: WorkOrderStatus) => {
    let nextStatus: WorkOrderStatus = currentStatus;
    if (currentStatus === 'assigned') nextStatus = 'in_progress';
    else if (currentStatus === 'in_progress') nextStatus = 'completed';
    else if (currentStatus === 'completed') nextStatus = 'verified';
    else if (currentStatus === 'verified') nextStatus = 'closed';

    if (userOrders.some(o => o.id === orderId)) {
      setUserOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: nextStatus } : o)));
    } else {
      setSimOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: nextStatus } : o)));
    }
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

    setUserOrders(prev => [newOrder, ...prev]);
    setShowNewModal(false);
    setTitle('');
    setInstructions('');
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-[#09090B] select-none">
      {/* Top Banner */}
      <div className="bg-white border border-[#E4E4E7] rounded-md p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-md bg-[#09090B] text-white font-extrabold flex items-center justify-center text-base border border-zinc-800 flex-shrink-0">
            <CheckSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-[#09090B] tracking-tight">
                Work Order & Maintenance Task Kanban
              </h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                FIELD WORKFLOW KANBAN
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Field Gang Dispatch · Multi-Tier Verification (JE/AE) · Material Consumption Tracking
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-3.5 py-2 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors self-start sm:self-auto cursor-pointer"
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
              className={`bg-white border border-[#E4E4E7] rounded-md p-3.5 flex flex-col space-y-3 min-h-[500px] shadow-sm ${col.topBorder}`}
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <span className="font-bold text-xs uppercase tracking-wider text-zinc-900 font-mono">
                  {col.title}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border border-zinc-200 ${col.badgeBg}`}>
                  {colOrders.length}
                </span>
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {colOrders.map(order => (
                  <div
                    key={order.id}
                    className="p-3 rounded-md bg-zinc-50 border border-zinc-200 hover:border-zinc-400 text-xs space-y-2 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-zinc-950 font-bold text-[10px]">{order.orderNumber}</span>
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

                    <h4 className="font-bold text-zinc-900 text-xs leading-snug">{order.title}</h4>
                    <p className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed">{order.instructions}</p>

                    <div className="pt-2 border-t border-zinc-200 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span className="flex items-center space-x-1 truncate max-w-[110px]">
                        <User className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                        <span className="truncate">{order.assignedCrew}</span>
                      </span>

                      {col.id !== 'closed' && (
                        <button
                          onClick={() => handleAdvanceStatus(order.id, order.status)}
                          className="px-2 py-1 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 select-none">
          <form onSubmit={handleCreateOrder} className="bg-white border border-zinc-300 rounded-md p-5 sm:p-6 max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-sm text-zinc-950 flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-zinc-900" />
                <span>Create Distribution Work Order</span>
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
              <label className="block text-[11px] text-zinc-600 font-medium mb-1 font-mono">Work Order Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Conductor re-stringing on Marapalam 11kV Feeder"
                className="w-full bg-zinc-50 border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-zinc-600 font-medium mb-1 font-mono">Task Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
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
                <label className="block text-[11px] text-zinc-600 font-medium mb-1 font-mono">Assigned Crew</label>
                <input
                  type="text"
                  value={assignedCrew}
                  onChange={e => setAssignedCrew(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 font-mono focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-600 font-medium mb-1 font-mono">Gang Instructions</label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="Instructions on safety, required material and line clear."
                className="w-full h-20 bg-zinc-50 border border-zinc-300 rounded-md p-3 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-100">
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
                Create Work Order
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

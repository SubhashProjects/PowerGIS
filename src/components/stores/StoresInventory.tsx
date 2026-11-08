// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// STORES & MATERIAL MANAGEMENT COMPONENT
// Inventory Balance, Store Issue/Return, Contractor Consumption & Reconciliation
// ============================================================================

import React, { useState } from 'react';
import { initialStores } from '../../services/mockData';
import { StoresItem } from '../../types/operations';
import {
  Package, Plus, ArrowUpRight, ArrowDownLeft, AlertCircle, CheckCircle2, History
} from 'lucide-react';

export const StoresInventory: React.FC = () => {
  const [items, setItems] = useState<StoresItem[]>(initialStores);
  const [selectedItem, setSelectedItem] = useState<StoresItem | null>(items[0] || null);

  // Issue Form
  const [issueQty, setIssueQty] = useState<number>(5);
  const [workOrderRef, setWorkOrderRef] = useState<string>('WO-2026-0101');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleIssueMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (selectedItem.currentStock < issueQty) {
      alert(`Insufficient stock! Available: ${selectedItem.currentStock} ${selectedItem.unitOfMeasure}`);
      return;
    }

    setItems(prev =>
      prev.map(i =>
        i.id === selectedItem.id ? { ...i, currentStock: i.currentStock - issueQty } : i
      )
    );

    setSuccessMsg(`Issued ${issueQty} ${selectedItem.unitOfMeasure} of ${selectedItem.name} against ${workOrderRef}`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">Central Stores & Material Inventory</h2>
            <p className="text-xs text-slate-400">Marapalam O&M Store Depot • Work Order Material Allocation & Reconciliation</p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700">
          Stock Reconciliation
        </span>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-center space-x-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inventory Items List */}
        <div className="lg:col-span-2 bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-semibold text-xs text-white uppercase tracking-wider">
              Store Stock Inventory ({items.length})
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Real-time Balance</span>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#090f1a] text-slate-400 font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Item Code</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Current Stock</th>
                  <th className="p-2.5">Reorder Level</th>
                  <th className="p-2.5">Unit Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {items.map(item => {
                  const isLow = item.currentStock <= item.reorderLevel;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`cursor-pointer transition-colors ${
                        selectedItem?.id === item.id ? 'bg-sky-500/15' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-2.5 font-bold text-sky-400">{item.itemCode}</td>
                      <td className="p-2.5 font-sans font-semibold text-slate-200">{item.name}</td>
                      <td className="p-2.5 text-slate-400 font-sans">{item.category}</td>
                      <td className="p-2.5 font-bold">
                        <span className={isLow ? 'text-rose-400' : 'text-emerald-400'}>
                          {item.currentStock} {item.unitOfMeasure}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-400">{item.reorderLevel} {item.unitOfMeasure}</td>
                      <td className="p-2.5 text-slate-300">₹{item.unitCostINR.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Issue Material Card */}
        {selectedItem && (
          <div className="lg:col-span-1 bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <span className="text-[10px] uppercase font-bold text-teal-400">Issue Material to Work Order</span>
              <h3 className="font-bold text-sm text-white mt-0.5">{selectedItem.name}</h3>
              <div className="text-xs text-slate-400 font-mono">{selectedItem.itemCode}</div>
            </div>

            <div className="p-3 rounded-xl bg-[#0a101b] border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Available Stock:</span>
              <span className="font-mono font-bold text-emerald-400">
                {selectedItem.currentStock} {selectedItem.unitOfMeasure}
              </span>
            </div>

            <form onSubmit={handleIssueMaterial} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">Issue Quantity</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={selectedItem.currentStock}
                  value={issueQty}
                  onChange={e => setIssueQty(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0a101b] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">Work Order Number</label>
                <input
                  type="text"
                  value={workOrderRef}
                  onChange={e => setWorkOrderRef(e.target.value)}
                  className="w-full bg-[#0a101b] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-md shadow-teal-600/30 flex items-center justify-center space-x-1.5 transition-all"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Issue Material from Depot</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

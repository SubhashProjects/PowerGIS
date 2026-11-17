// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// STORES & MATERIAL MANAGEMENT COMPONENT
// PURE WHITE THEME & INVENTORY RECONCILIATION
// ============================================================================

import React, { useState, useEffect } from 'react';
import { initialStores } from '../../services/mockData';
import { assetService } from '../../services/assetService';
import { storesService } from '../../services/storesService';
import { isSupabaseConfigured } from '../../lib/supabase';
import { StoresItem } from '../../types/operations';
import {
 Package, Plus, ArrowUpRight, ArrowDownLeft, AlertCircle, CheckCircle2, History, Zap
} from 'lucide-react';

export const StoresInventory: React.FC = () => {
 const [userItems, setUserItems] = useState<StoresItem[]>([]);
 const [simItems, setSimItems] = useState<StoresItem[]>(initialStores);
 const [isSimActive, setIsSimActive] = useState<boolean>(assetService.isSimulatorMode());

 useEffect(() => {
 if (isSupabaseConfigured) {
 storesService.listItems().then(list => {
 setUserItems(list);
 setSelectedItem(list[0] ?? null);
 }).catch(error => setErrorMsg(error?.message || 'Unable to load inventory from Supabase.'));
 }
 const unsub = assetService.subscribe(() => {
 setIsSimActive(assetService.isSimulatorMode());
 });
 return unsub;
 }, []);

 const items = isSimActive ? [...userItems, ...simItems] : userItems;
 const [selectedItem, setSelectedItem] = useState<StoresItem | null>(items[0] || null);

 // Issue Form
 const [issueQty, setIssueQty] = useState<number>(5);
 const [workOrderRef, setWorkOrderRef] = useState<string>('');
 const [successMsg, setSuccessMsg] = useState<string | null>(null);
 const [errorMsg, setErrorMsg] = useState<string | null>(null);
 const [isSubmitting, setIsSubmitting] = useState(false);

 const handleIssueMaterial = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedItem) return;
 if (!Number.isFinite(issueQty) || issueQty <= 0) { setErrorMsg('Quantity must be greater than zero.'); return; }
 if (isSupabaseConfigured) {
 if (!workOrderRef.trim()) { setErrorMsg('Work-order number is required for an inventory issue.'); return; }
 setIsSubmitting(true); setErrorMsg(null);
 try {
 const result = await storesService.issue({ itemId: selectedItem.id, quantity: issueQty, workOrderNumber: workOrderRef.trim(), transactionType: 'issue' });
 const refreshed = await storesService.listItems();
 setUserItems(refreshed);
 setSelectedItem(refreshed.find(i => i.id === selectedItem.id) ?? null);
 setSuccessMsg(`Issued ${issueQty} ${selectedItem.unitOfMeasure} of ${selectedItem.name} against ${workOrderRef}. New stock: ${result.newStock}.`);
 setTimeout(() => setSuccessMsg(null), 4000);
 } catch (error: any) {
 setErrorMsg(error?.message || 'Inventory issue failed. No stock transaction was committed.');
 } finally { setIsSubmitting(false); }
 return;
 }
 if (selectedItem.currentStock < issueQty) { alert(`Insufficient stock! Available: ${selectedItem.currentStock} ${selectedItem.unitOfMeasure}`); return; }
 if (userItems.some(i => i.id === selectedItem.id)) {
 setUserItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, currentStock: i.currentStock - issueQty } : i));
 } else {
 setSimItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, currentStock: i.currentStock - issueQty } : i));
 }
 setSuccessMsg(`Issued ${issueQty} ${selectedItem.unitOfMeasure} of ${selectedItem.name} against ${workOrderRef}`);
 setTimeout(() => setSuccessMsg(null), 4000);
 };

 return (
 <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-neutral-900 select-none">
 {/* Top Banner */}
 <div className="bg-white border border-neutral-200 rounded-md p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 rounded-md bg-neutral-900 text-white font-extrabold flex items-center justify-center text-lg shadow-xs flex-shrink-0">
 <Package className="w-5 h-5 text-teal-400" />
 </div>
 <div>
 <div className="flex items-center space-x-2">
 <h1 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
 Central Stores & Material Inventory Depot
 </h1>
 <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
 ERP RECONCILIATION
 </span>
 </div>
 <p className="text-xs text-neutral-500 mt-0.5">
 Marapalam Central Depot · Bill of Materials (BOM) Allocation & Contractor Issues
 </p>
 </div>
 </div>

 <span className="px-3 py-1.5 rounded-md bg-neutral-100 text-neutral-800 text-xs border border-neutral-200 self-start sm:self-auto font-semibold">
 Real-Time Stock Active
 </span>
 </div>

 {successMsg && (
 <div className="p-3 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center space-x-2 shadow-xs animate-fadeIn ">
 <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
 <span className="font-bold">{successMsg}</span>
 </div>
 )}

 {errorMsg && (
 <div className="p-3 rounded-md bg-rose-50 border border-rose-300 text-rose-900 text-xs ">{errorMsg}</div>
 )}

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
 {/* Inventory Items List */}
 <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-md p-4 shadow-xs space-y-3">
 <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
 <h3 className="font-bold text-xs text-neutral-900 ">
 Store Stock Inventory ({items.length})
 </h3>
 <span className="text-[10px] text-neutral-500 ">Real-time Stock Balance</span>
 </div>

 <div className="border border-neutral-200 rounded-md overflow-hidden">
 <div className="pg-table-scroll overflow-x-auto">
 <table className="pg-data-table w-full text-xs text-left">
 <thead className="bg-neutral-50 text-neutral-600 text-[10px] border-b border-neutral-200">
 <tr>
 <th className="p-3">Item Code</th>
 <th className="p-3">Description</th>
 <th className="p-3">Category</th>
 <th className="p-3">Current Stock</th>
 <th className="p-3">Reorder Level</th>
 <th className="p-3">Unit Cost</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100 text-neutral-700">
 {items.map(item => {
 const isLow = item.currentStock <= item.reorderLevel;
 const isSelected = selectedItem?.id === item.id;
 return (
 <tr
 key={item.id}
 onClick={() => setSelectedItem(item)}
 className={`cursor-pointer transition-colors ${
 isSelected ? 'bg-neutral-100 font-semibold' : 'hover:bg-neutral-50'
 }`}
 >
 <td className="p-3 font-bold text-neutral-950">{item.itemCode}</td>
 <td className="p-3 font-sans font-semibold text-neutral-900">{item.name}</td>
 <td className="p-3 text-neutral-500 font-sans">{item.category}</td>
 <td className="p-3 font-bold">
 <span className={`px-2 py-0.5 rounded border text-[10px] ${
 isLow ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
 }`}>
 {item.currentStock} {item.unitOfMeasure}
 </span>
 </td>
 <td className="p-3 text-neutral-500">{item.reorderLevel} {item.unitOfMeasure}</td>
 <td className="p-3 text-neutral-900 font-bold">₹{item.unitCostINR.toLocaleString()}</td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 </div>

 {/* Issue Material Card */}
 {selectedItem && (
 <div className="lg:col-span-1 bg-white border border-neutral-200 rounded-md p-4 sm:p-5 shadow-xs space-y-4">
 <div className="border-b border-neutral-100 pb-2.5">
 <span className="text-[10px] font-bold text-teal-700 ">Issue Material to Work Order</span>
 <h3 className="font-bold text-sm text-neutral-950 mt-0.5">{selectedItem.name}</h3>
 <div className="text-xs text-neutral-500 ">{selectedItem.itemCode}</div>
 </div>

 <div className="p-3 rounded-md bg-neutral-50 border border-neutral-200 flex justify-between items-center text-xs ">
 <span className="text-neutral-500">Available Stock:</span>
 <span className="font-bold text-emerald-700">
 {selectedItem.currentStock} {selectedItem.unitOfMeasure}
 </span>
 </div>

 <form onSubmit={handleIssueMaterial} className="space-y-3 text-xs">
 <div>
 <label className="block text-[11px] text-neutral-600 font-medium mb-1 ">Issue Quantity</label>
 <input
 type="number"
 step="0.1"
 min="0.1"
 max={selectedItem.currentStock}
 value={issueQty}
 onChange={e => setIssueQty(parseFloat(e.target.value) || 0)}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
 />
 </div>

 <div>
 <label className="block text-[11px] text-neutral-600 font-medium mb-1 ">Work Order Number</label>
 <input
 type="text"
 value={workOrderRef}
 onChange={e => setWorkOrderRef(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
 />
 </div>

 <button
 type="submit"
 disabled={isSubmitting}
 className="w-full py-2.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white font-bold shadow-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
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

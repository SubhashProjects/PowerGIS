// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SYNCHRONIZED BOTTOM ATTRIBUTE DRAWER (SECTION 6.4 OF MASTER SPECIFICATION)
// TWO-WAY SYNCHRONIZATION WITH LEAFLET GIS MAP
// ============================================================================

import React, { useState } from 'react';
import { assetService } from '../../services/assetService';
import { dataExchangeService } from '../../services/dataExchangeService';
import {
  Table, ChevronUp, ChevronDown, Download, Search, Zap, X, Maximize2, Minimize2
} from 'lucide-react';

interface MapAttributeDrawerProps {
  onSelectAsset: (asset: any) => void;
  selectedAsset: any | null;
}

export const MapAttributeDrawer: React.FC<MapAttributeDrawerProps> = ({
  onSelectAsset,
  selectedAsset,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<'transformers' | 'feeders' | 'poles' | 'substations' | 'consumers'>('transformers');
  const [searchFilter, setSearchFilter] = useState('');

  const transformers = assetService.getTransformers();
  const feeders = assetService.getFeeders();
  const poles = assetService.getPoles();
  const substations = assetService.getSubstations();
  const consumers = assetService.getConsumers();

  const handleExportTab = () => {
    dataExchangeService.exportCSV(activeTab);
  };

  const getFilteredItems = () => {
    const q = searchFilter.trim().toLowerCase();
    switch (activeTab) {
      case 'transformers':
        return transformers.filter(t => !q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
      case 'feeders':
        return feeders.filter(f => !q || f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q));
      case 'poles':
        return poles.filter(p => !q || p.poleNumber.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
      case 'substations':
        return substations.filter(s => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
      case 'consumers':
        return consumers.filter(c => !q || c.consumerNumber.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
    }
  };

  const items = getFilteredItems();

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-[1000] transition-all duration-300 select-none flex flex-col ${
        isOpen
          ? isMaximized
            ? 'h-[80vh] shadow-2xl'
            : 'h-72 shadow-2xl'
          : 'h-10'
      }`}
    >
      {/* Drawer Handle & Quick Toolbar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 px-4 bg-white border-t border-b border-[#E4E4E7] flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors shadow-sm"
      >
        <div className="flex items-center space-x-2 text-xs font-bold text-zinc-950">
          <Table className="w-4 h-4 text-zinc-800" />
          <span>Spatial Attribute Repository</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700">
            {isOpen ? 'Click to Collapse' : 'Click to Open Data Grid'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isOpen && (
            <>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleExportTab();
                }}
                className="px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-[11px] font-mono font-semibold text-neutral-800 flex items-center space-x-1 border border-neutral-300"
                title="Export active table to CSV"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setIsMaximized(!isMaximized);
                }}
                className="p-1 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                title={isMaximized ? 'Restore Drawer' : 'Maximize Drawer'}
              >
                {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </>
          )}

          <div className="p-1 text-neutral-600">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Table Content */}
      {isOpen && (
        <div className="flex-1 bg-white flex flex-col min-h-0 overflow-hidden">
          {/* Sub-header with Tab Pills and Search Input */}
          <div className="px-4 py-2 border-b border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 text-xs font-medium">
              <button
                onClick={() => setActiveTab('transformers')}
                className={`px-3 py-1 rounded-md whitespace-nowrap transition-all ${
                  activeTab === 'transformers'
                    ? 'bg-neutral-900 text-white font-bold shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Transformers ({transformers.length})
              </button>
              <button
                onClick={() => setActiveTab('feeders')}
                className={`px-3 py-1 rounded-md whitespace-nowrap transition-all ${
                  activeTab === 'feeders'
                    ? 'bg-neutral-900 text-white font-bold shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Feeders ({feeders.length})
              </button>
              <button
                onClick={() => setActiveTab('poles')}
                className={`px-3 py-1 rounded-md whitespace-nowrap transition-all ${
                  activeTab === 'poles'
                    ? 'bg-neutral-900 text-white font-bold shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Poles ({poles.length})
              </button>
              <button
                onClick={() => setActiveTab('substations')}
                className={`px-3 py-1 rounded-md whitespace-nowrap transition-all ${
                  activeTab === 'substations'
                    ? 'bg-neutral-900 text-white font-bold shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Substations ({substations.length})
              </button>
              <button
                onClick={() => setActiveTab('consumers')}
                className={`px-3 py-1 rounded-md whitespace-nowrap transition-all ${
                  activeTab === 'consumers'
                    ? 'bg-neutral-900 text-white font-bold shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Consumers ({consumers.length})
              </button>
            </div>

            {/* Quick Filter Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Filter table records..."
                className="w-full bg-white border border-neutral-300 rounded-md pl-8 pr-3 py-1 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 font-mono"
              />
            </div>
          </div>

          {/* Table Data Viewport */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 text-neutral-600 uppercase font-mono text-[10px] sticky top-0 border-b border-neutral-200 z-10">
                {activeTab === 'transformers' && (
                  <tr>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Capacity</th>
                    <th className="p-2.5">Make</th>
                    <th className="p-2.5">Loading</th>
                    <th className="p-2.5">Oil Level</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                )}
                {activeTab === 'feeders' && (
                  <tr>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Feeder Name</th>
                    <th className="p-2.5">Voltage</th>
                    <th className="p-2.5">Length</th>
                    <th className="p-2.5">Peak Load</th>
                    <th className="p-2.5">State</th>
                  </tr>
                )}
                {activeTab === 'poles' && (
                  <tr>
                    <th className="p-2.5">Pole #</th>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Height</th>
                    <th className="p-2.5">Insulators</th>
                    <th className="p-2.5">Condition</th>
                  </tr>
                )}
                {activeTab === 'substations' && (
                  <tr>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Substation</th>
                    <th className="p-2.5">Class</th>
                    <th className="p-2.5">Capacity</th>
                    <th className="p-2.5">Feeders</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                )}
                {activeTab === 'consumers' && (
                  <tr>
                    <th className="p-2.5">Consumer #</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Meter Serial</th>
                    <th className="p-2.5">Sanctioned</th>
                    <th className="p-2.5">Address</th>
                  </tr>
                )}
              </thead>

              <tbody className="divide-y divide-neutral-100 font-mono text-neutral-800">
                {activeTab === 'transformers' &&
                  (items as typeof transformers).map(t => {
                    const isSelected = selectedAsset?.id === t.id || selectedAsset?.code === t.code;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => onSelectAsset(t)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 text-blue-900 font-bold border-l-4 border-blue-600' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <td className="p-2.5 font-bold text-neutral-950">{t.code}</td>
                        <td className="p-2.5 font-sans font-medium text-neutral-900">{t.name}</td>
                        <td className="p-2.5">{t.capacityKVA} kVA</td>
                        <td className="p-2.5 font-sans text-neutral-600">{t.make}</td>
                        <td className="p-2.5 font-bold">{t.loadPercentage}%</td>
                        <td className="p-2.5">{t.oilLevelPct}%</td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 text-neutral-800 border border-neutral-300 uppercase font-bold">
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                {activeTab === 'feeders' &&
                  (items as typeof feeders).map(f => {
                    const isSelected = selectedAsset?.id === f.id || selectedAsset?.code === f.code;
                    return (
                      <tr
                        key={f.id}
                        onClick={() => onSelectAsset(f)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 text-blue-900 font-bold border-l-4 border-blue-600' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <td className="p-2.5 font-bold text-neutral-950">{f.code}</td>
                        <td className="p-2.5 font-sans font-medium text-neutral-900">{f.name}</td>
                        <td className="p-2.5 font-bold text-neutral-900">{f.voltageClass}</td>
                        <td className="p-2.5">{f.lengthKm} km</td>
                        <td className="p-2.5">{f.peakLoadAmps} A</td>
                        <td className="p-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            f.isEnergized ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-neutral-100 text-neutral-600'
                          }`}>
                            {f.isEnergized ? 'ENERGIZED' : 'SHUTDOWN'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                {activeTab === 'poles' &&
                  (items as typeof poles).map(p => {
                    const isSelected = selectedAsset?.id === p.id || selectedAsset?.code === p.code;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => onSelectAsset(p)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 text-blue-900 font-bold border-l-4 border-blue-600' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <td className="p-2.5 font-bold text-neutral-950">{p.poleNumber}</td>
                        <td className="p-2.5 text-neutral-500">{p.code}</td>
                        <td className="p-2.5 font-sans text-neutral-800">{p.poleType}</td>
                        <td className="p-2.5">{p.heightMeters}m</td>
                        <td className="p-2.5">{p.numInsulators}</td>
                        <td className="p-2.5 font-semibold text-neutral-900">{p.condition}</td>
                      </tr>
                    );
                  })}

                {activeTab === 'substations' &&
                  (items as typeof substations).map(s => {
                    const isSelected = selectedAsset?.id === s.id || selectedAsset?.code === s.code;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => onSelectAsset(s)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 text-blue-900 font-bold border-l-4 border-blue-600' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <td className="p-2.5 font-bold text-neutral-950">{s.code}</td>
                        <td className="p-2.5 font-sans font-medium text-neutral-900">{s.name}</td>
                        <td className="p-2.5 font-bold">{s.voltageClass}</td>
                        <td className="p-2.5">{s.capacityMVA} MVA</td>
                        <td className="p-2.5">{s.numFeeders} Feeders</td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 text-neutral-800 border border-neutral-300 font-bold uppercase">
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                {activeTab === 'consumers' &&
                  (items as typeof consumers).map(c => {
                    const isSelected = selectedAsset?.id === c.id || selectedAsset?.consumerNumber === c.consumerNumber;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => onSelectAsset(c)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 text-blue-900 font-bold border-l-4 border-blue-600' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <td className="p-2.5 font-bold text-neutral-950">{c.consumerNumber}</td>
                        <td className="p-2.5 font-sans font-medium text-neutral-900">{c.name}</td>
                        <td className="p-2.5">{c.meterNumber}</td>
                        <td className="p-2.5">{c.sanctionedLoadKW} kW</td>
                        <td className="p-2.5 font-sans text-neutral-600 truncate max-w-xs">{c.address}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

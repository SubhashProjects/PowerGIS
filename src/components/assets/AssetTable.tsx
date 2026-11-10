// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ELECTRICAL ASSET REGISTER & TABULAR REPOSITORY
// HIGH-CRAFT MINIMALIST SWISS UTILITY INTERFACE - BLOBLESS, ZERO-GRADIENT
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { assetService } from '../../services/assetService';
import { dataExchangeService, ImportResult } from '../../services/dataExchangeService';
import { useAuth } from '../../context/AuthContext';
import {
  Zap, Search, Filter, Download, Plus, CheckCircle2, AlertTriangle, Eye, Upload, FileCode, X
} from 'lucide-react';

export const AssetTable: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'transformers' | 'feeders' | 'poles' | 'substations' | 'consumers'>('transformers');
  const [searchQuery, setSearchQuery] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Subscribe to AssetService updates (e.g. uploads or simulator mode toggles)
  useEffect(() => {
    const unsub = assetService.subscribe(() => {
      setRefreshKey(prev => prev + 1);
    });
    return unsub;
  }, []);

  const transformers = assetService.getTransformers();
  const feeders = assetService.getFeeders();
  const poles = assetService.getPoles();
  const substations = assetService.getSubstations();
  const consumers = assetService.getConsumers();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await dataExchangeService.importSpatialFile(file);
    setImportResult(res);
    setRefreshKey(prev => prev + 1); // trigger re-render of asset arrays
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 text-[#09090B]">
      {/* 1. Header & Actions Card */}
      <div className="bg-white border border-zinc-200 rounded-md p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#09090B] text-white font-bold flex items-center justify-center text-base border border-zinc-800 flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-[#09090B] tracking-tight">Electrical Asset Master Register</h1>
              <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                POSTGIS REPOSITORY
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 font-mono">
              Spatially Scoped Network Infrastructure • {user.role.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Export & Import Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".kml,.geojson,.json,.csv"
            onChange={handleImportFile}
            className="hidden"
          />

          {/* Import Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-md bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-800 flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Import KML, GeoJSON or CSV directly into asset registry"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-600" />
            <span>Import Spatial Dataset</span>
          </button>

          {/* Export GeoJSON Button */}
          <button
            onClick={() => dataExchangeService.exportGeoJSON([activeTab])}
            className="px-3.5 py-1.5 rounded-md bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-800 flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Download GeoJSON FeatureCollection of active tab"
          >
            <FileCode className="w-3.5 h-3.5 text-zinc-600" />
            <span>GeoJSON</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={() => dataExchangeService.exportCSV(activeTab)}
            className="px-3.5 py-1.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white text-xs font-medium flex items-center space-x-1.5 border border-zinc-900 transition-colors cursor-pointer"
            title="Download CSV asset register"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Import Result Notification Banner */}
      {importResult && (
        <div className="p-3.5 rounded-md bg-white border border-zinc-200 text-[#09090B] text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <div className="flex items-center space-x-2 font-medium">
              {importResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
              <span>{importResult.success ? 'Spatial Data Imported Successfully' : 'Import Incomplete'}</span>
            </div>
            <button onClick={() => setImportResult(null)} className="text-zinc-500 hover:text-zinc-900 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-zinc-600 font-mono text-[11px]">{importResult.message}</p>
          <div className="flex items-center space-x-3 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-[#09090B] text-white font-medium">
              Imported: {importResult.importedCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
              Duplicates: {importResult.duplicateCount}
            </span>
          </div>
        </div>
      )}

      {/* 2. Tabs Selector (White Theme Pills) */}
      <div className="flex space-x-1.5 overflow-x-auto pb-1 border-b border-zinc-200 text-xs font-medium">
        <button
          onClick={() => setActiveTab('transformers')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'transformers'
              ? 'bg-[#09090B] text-white font-medium'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          Distribution Transformers ({transformers.length})
        </button>
        <button
          onClick={() => setActiveTab('feeders')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'feeders'
              ? 'bg-[#09090B] text-white font-medium'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          11kV/22kV Feeders ({feeders.length})
        </button>
        <button
          onClick={() => setActiveTab('poles')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'poles'
              ? 'bg-[#09090B] text-white font-medium'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          Utility Poles ({poles.length})
        </button>
        <button
          onClick={() => setActiveTab('consumers')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'consumers'
              ? 'bg-[#09090B] text-white font-medium'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          Consumers & Meters ({consumers.length})
        </button>
        <button
          onClick={() => setActiveTab('substations')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'substations'
              ? 'bg-[#09090B] text-white font-medium'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          Substations ({substations.length})
        </button>
      </div>

      {/* 3. Responsive Table Container */}
      <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 text-zinc-600 font-mono text-[10px] uppercase tracking-wider border-b border-zinc-200">
              {activeTab === 'transformers' && (
                <tr>
                  <th className="p-3">Asset Code</th>
                  <th className="p-3">Transformer Name</th>
                  <th className="p-3">Rating (kVA)</th>
                  <th className="p-3">Make</th>
                  <th className="p-3">Loading (%)</th>
                  <th className="p-3">Oil Level (%)</th>
                  <th className="p-3">Phase Imbalance</th>
                  <th className="p-3">Grid Status</th>
                </tr>
              )}
              {activeTab === 'feeders' && (
                <tr>
                  <th className="p-3">Feeder Code</th>
                  <th className="p-3">Feeder Name</th>
                  <th className="p-3">Voltage</th>
                  <th className="p-3">Length (km)</th>
                  <th className="p-3">Conductor Type</th>
                  <th className="p-3">Peak Load (A)</th>
                  <th className="p-3">Grid State</th>
                </tr>
              )}
              {activeTab === 'poles' && (
                <tr>
                  <th className="p-3">Pole Number</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Height (m)</th>
                  <th className="p-3">Insulators</th>
                  <th className="p-3">Streetlight</th>
                  <th className="p-3">Condition</th>
                </tr>
              )}
              {activeTab === 'consumers' && (
                <tr>
                  <th className="p-3">Consumer #</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Meter Number</th>
                  <th className="p-3">Meter Type</th>
                  <th className="p-3">Sanctioned Load</th>
                  <th className="p-3">Address</th>
                </tr>
              )}
              {activeTab === 'substations' && (
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Substation Name</th>
                  <th className="p-3">Voltage Class</th>
                  <th className="p-3">Capacity</th>
                  <th className="p-3">Active Feeders</th>
                  <th className="p-3">Commissioned</th>
                  <th className="p-3">Status</th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-zinc-100 font-mono text-zinc-700">
              {activeTab === 'transformers' &&
                transformers.map(t => (
                  <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="p-3 font-semibold text-[#09090B]">{t.code}</td>
                    <td className="p-3 font-sans text-zinc-900 font-medium">{t.name}</td>
                    <td className="p-3 text-zinc-700">{t.capacityKVA} kVA</td>
                    <td className="p-3 font-sans text-zinc-600">{t.make}</td>
                    <td className="p-3 text-[#09090B] font-semibold">{t.loadPercentage}%</td>
                    <td className="p-3 text-zinc-700">{t.oilLevelPct}%</td>
                    <td className="p-3 text-zinc-600">{t.phaseImbalancePct}%</td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}

              {activeTab === 'feeders' &&
                feeders.map(f => (
                  <tr key={f.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="p-3 font-semibold text-[#09090B]">{f.code}</td>
                    <td className="p-3 font-sans text-zinc-900 font-medium">{f.name}</td>
                    <td className="p-3 text-zinc-800 font-semibold">{f.voltageClass}</td>
                    <td className="p-3 text-zinc-700">{f.lengthKm} km</td>
                    <td className="p-3 font-sans text-zinc-600">{f.conductorType}</td>
                    <td className="p-3 text-zinc-800">{f.peakLoadAmps} A</td>
                    <td className="p-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        f.isEnergized
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                      }`}>
                        {f.isEnergized ? 'ENERGIZED' : 'SHUTDOWN'}
                      </span>
                    </td>
                  </tr>
                ))}

              {activeTab === 'poles' &&
                poles.map(p => (
                  <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="p-3 font-semibold text-[#09090B]">{p.poleNumber}</td>
                    <td className="p-3 text-zinc-600">{p.code}</td>
                    <td className="p-3 font-sans text-zinc-800">{p.poleType}</td>
                    <td className="p-3 text-zinc-700">{p.heightMeters} m</td>
                    <td className="p-3 text-zinc-600">{p.numInsulators}</td>
                    <td className="p-3 text-zinc-700">{p.hasStreetlight ? 'Yes (LED)' : 'No'}</td>
                    <td className="p-3 text-zinc-900 font-medium">{p.condition}</td>
                  </tr>
                ))}

              {activeTab === 'consumers' &&
                consumers.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="p-3 font-semibold text-[#09090B]">{c.consumerNumber}</td>
                    <td className="p-3 font-sans text-zinc-900 font-medium">{c.name}</td>
                    <td className="p-3 text-zinc-700">{c.meterNumber}</td>
                    <td className="p-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        c.isSmartMeter
                          ? 'bg-[#09090B] text-white font-semibold'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                      }`}>
                        {c.isSmartMeter ? 'Smart Meter (AMI)' : 'Conventional'}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-800 font-semibold">{c.sanctionedLoadKW} kW</td>
                    <td className="p-3 font-sans text-zinc-600">{c.address}</td>
                  </tr>
                ))}

              {activeTab === 'substations' &&
                substations.map(s => (
                  <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="p-3 font-semibold text-[#09090B]">{s.code}</td>
                    <td className="p-3 font-sans text-zinc-900 font-medium">{s.name}</td>
                    <td className="p-3 text-zinc-800 font-semibold">{s.voltageClass}</td>
                    <td className="p-3 text-zinc-800">{s.capacityMVA} MVA</td>
                    <td className="p-3 text-zinc-600">{s.numFeeders} Feeders</td>
                    <td className="p-3 text-zinc-600">{s.commissionDate}</td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}

              {/* Clean Mode Empty State */}
              {((activeTab === 'transformers' && transformers.length === 0) ||
                (activeTab === 'feeders' && feeders.length === 0) ||
                (activeTab === 'poles' && poles.length === 0) ||
                (activeTab === 'consumers' && consumers.length === 0) ||
                (activeTab === 'substations' && substations.length === 0)) && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500 font-sans">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-9 h-9 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500">
                        <Zap className="w-4 h-4 text-zinc-500" />
                      </div>
                      <p className="font-semibold text-xs text-[#09090B]">No {activeTab} loaded in current view</p>
                      <p className="text-[11px] text-zinc-500 max-w-md">
                        Operating in clean operational mode (test/dummy grid data is hidden). Upload a KML, GeoJSON, or CSV layer above, or turn ON the Simulator to stream test assets.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

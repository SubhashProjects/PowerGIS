// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ELECTRICAL ASSET REGISTER & TABULAR REPOSITORY
// PURE WHITE THEME • FUNCTIONAL CSV/GEOJSON EXPORT & SPATIAL IMPORT
// ============================================================================

import React, { useState, useRef } from 'react';
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
    <div className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 text-neutral-900 select-none">
      {/* 1. Header & Actions Card */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white font-extrabold flex items-center justify-center text-xl shadow-xs flex-shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">Electrical Asset Master Register</h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 border border-neutral-300">
                POSTGIS REPOSITORY
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 font-mono">
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
            className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-xs font-semibold text-neutral-800 flex items-center space-x-1.5 transition-all"
            title="Import KML, GeoJSON or CSV directly into asset registry"
          >
            <Upload className="w-3.5 h-3.5 text-neutral-700" />
            <span>Import Spatial Dataset</span>
          </button>

          {/* Export GeoJSON Button */}
          <button
            onClick={() => dataExchangeService.exportGeoJSON([activeTab])}
            className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-xs font-semibold text-neutral-800 flex items-center space-x-1.5 transition-all"
            title="Download GeoJSON FeatureCollection of active tab"
          >
            <FileCode className="w-3.5 h-3.5 text-neutral-700" />
            <span>GeoJSON</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={() => dataExchangeService.exportCSV(activeTab)}
            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
            title="Download CSV asset register"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Import Result Notification Banner */}
      {importResult && (
        <div className="p-4 rounded-2xl bg-white border border-neutral-300 text-neutral-900 text-xs shadow-md space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
            <div className="flex items-center space-x-2 font-bold">
              {importResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
              <span>{importResult.success ? 'Spatial Data Imported Successfully' : 'Import Incomplete'}</span>
            </div>
            <button onClick={() => setImportResult(null)} className="text-neutral-500 hover:text-neutral-900">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-neutral-700 font-mono text-[11px]">{importResult.message}</p>
          <div className="flex items-center space-x-3 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-neutral-900 text-white font-bold">
              Imported: {importResult.importedCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
              Duplicates: {importResult.duplicateCount}
            </span>
          </div>
        </div>
      )}

      {/* 2. Tabs Selector (White Theme Pills) */}
      <div className="flex space-x-1.5 overflow-x-auto pb-1 border-b border-neutral-200 text-xs font-medium">
        <button
          onClick={() => setActiveTab('transformers')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'transformers'
              ? 'bg-neutral-900 text-white font-bold shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          Distribution Transformers ({transformers.length})
        </button>
        <button
          onClick={() => setActiveTab('feeders')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'feeders'
              ? 'bg-neutral-900 text-white font-bold shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          11kV/22kV Feeders ({feeders.length})
        </button>
        <button
          onClick={() => setActiveTab('poles')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'poles'
              ? 'bg-neutral-900 text-white font-bold shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          Utility Poles ({poles.length})
        </button>
        <button
          onClick={() => setActiveTab('consumers')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'consumers'
              ? 'bg-neutral-900 text-white font-bold shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          Consumers & Meters ({consumers.length})
        </button>
        <button
          onClick={() => setActiveTab('substations')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'substations'
              ? 'bg-neutral-900 text-white font-bold shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          Substations ({substations.length})
        </button>
      </div>

      {/* 3. Responsive Table Container */}
      <div className="bg-white border border-neutral-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 text-neutral-600 font-mono text-[10px] uppercase tracking-wider border-b border-neutral-200">
              {activeTab === 'transformers' && (
                <tr>
                  <th className="p-3.5">Asset Code</th>
                  <th className="p-3.5">Transformer Name</th>
                  <th className="p-3.5">Rating (kVA)</th>
                  <th className="p-3.5">Make</th>
                  <th className="p-3.5">Loading (%)</th>
                  <th className="p-3.5">Oil Level (%)</th>
                  <th className="p-3.5">Phase Imbalance</th>
                  <th className="p-3.5">Grid Status</th>
                </tr>
              )}
              {activeTab === 'feeders' && (
                <tr>
                  <th className="p-3.5">Feeder Code</th>
                  <th className="p-3.5">Feeder Name</th>
                  <th className="p-3.5">Voltage</th>
                  <th className="p-3.5">Length (km)</th>
                  <th className="p-3.5">Conductor Type</th>
                  <th className="p-3.5">Peak Load (A)</th>
                  <th className="p-3.5">Grid State</th>
                </tr>
              )}
              {activeTab === 'poles' && (
                <tr>
                  <th className="p-3.5">Pole Number</th>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Height (m)</th>
                  <th className="p-3.5">Insulators</th>
                  <th className="p-3.5">Streetlight</th>
                  <th className="p-3.5">Condition</th>
                </tr>
              )}
              {activeTab === 'consumers' && (
                <tr>
                  <th className="p-3.5">Consumer #</th>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Meter Number</th>
                  <th className="p-3.5">Meter Type</th>
                  <th className="p-3.5">Sanctioned Load</th>
                  <th className="p-3.5">Address</th>
                </tr>
              )}
              {activeTab === 'substations' && (
                <tr>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Substation Name</th>
                  <th className="p-3.5">Voltage Class</th>
                  <th className="p-3.5">Capacity</th>
                  <th className="p-3.5">Active Feeders</th>
                  <th className="p-3.5">Commissioned</th>
                  <th className="p-3.5">Status</th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-neutral-100 font-mono text-neutral-700">
              {activeTab === 'transformers' &&
                transformers.map(t => (
                  <tr key={t.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-neutral-950">{t.code}</td>
                    <td className="p-3.5 font-sans text-neutral-900 font-semibold">{t.name}</td>
                    <td className="p-3.5 text-neutral-700">{t.capacityKVA} kVA</td>
                    <td className="p-3.5 font-sans text-neutral-600">{t.make}</td>
                    <td className="p-3.5 text-neutral-950 font-bold">{t.loadPercentage}%</td>
                    <td className="p-3.5 text-neutral-700">{t.oilLevelPct}%</td>
                    <td className="p-3.5 text-neutral-600">{t.phaseImbalancePct}%</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}

              {activeTab === 'feeders' &&
                feeders.map(f => (
                  <tr key={f.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-neutral-950">{f.code}</td>
                    <td className="p-3.5 font-sans text-neutral-900 font-semibold">{f.name}</td>
                    <td className="p-3.5 text-neutral-800 font-bold">{f.voltageClass}</td>
                    <td className="p-3.5 text-neutral-700">{f.lengthKm} km</td>
                    <td className="p-3.5 font-sans text-neutral-600">{f.conductorType}</td>
                    <td className="p-3.5 text-neutral-800">{f.peakLoadAmps} A</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        f.isEnergized
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
                          : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                      }`}>
                        {f.isEnergized ? 'ENERGIZED' : 'SHUTDOWN'}
                      </span>
                    </td>
                  </tr>
                ))}

              {activeTab === 'poles' &&
                poles.map(p => (
                  <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-neutral-950">{p.poleNumber}</td>
                    <td className="p-3.5 text-neutral-600">{p.code}</td>
                    <td className="p-3.5 font-sans text-neutral-800">{p.poleType}</td>
                    <td className="p-3.5 text-neutral-700">{p.heightMeters} m</td>
                    <td className="p-3.5 text-neutral-600">{p.numInsulators}</td>
                    <td className="p-3.5 text-neutral-700">{p.hasStreetlight ? 'Yes (LED)' : 'No'}</td>
                    <td className="p-3.5 text-neutral-900 font-semibold">{p.condition}</td>
                  </tr>
                ))}

              {activeTab === 'consumers' &&
                consumers.map(c => (
                  <tr key={c.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-neutral-950">{c.consumerNumber}</td>
                    <td className="p-3.5 font-sans text-neutral-900 font-semibold">{c.name}</td>
                    <td className="p-3.5 text-neutral-700">{c.meterNumber}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.isSmartMeter
                          ? 'bg-neutral-900 text-white font-extrabold'
                          : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                      }`}>
                        {c.isSmartMeter ? 'Smart Meter (AMI)' : 'Conventional'}
                      </span>
                    </td>
                    <td className="p-3.5 text-neutral-800">{c.sanctionedLoadKW} kW</td>
                    <td className="p-3.5 font-sans text-neutral-600">{c.address}</td>
                  </tr>
                ))}

              {activeTab === 'substations' &&
                substations.map(s => (
                  <tr key={s.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-neutral-950">{s.code}</td>
                    <td className="p-3.5 font-sans text-neutral-900 font-semibold">{s.name}</td>
                    <td className="p-3.5 text-neutral-800 font-bold">{s.voltageClass}</td>
                    <td className="p-3.5 text-neutral-800">{s.capacityMVA} MVA</td>
                    <td className="p-3.5 text-neutral-600">{s.numFeeders} Feeders</td>
                    <td className="p-3.5 text-neutral-600">{s.commissionDate}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

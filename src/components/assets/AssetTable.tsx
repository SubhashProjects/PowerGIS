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
 if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
 assetService.loadFromSupabase().catch(error => setImportResult({ success: false, message: error?.message || 'Unable to load assets from Supabase.', importedCount: 0, duplicateCount: 0, errorCount: 1, details: [error?.message || 'Unable to load assets from Supabase.'] }));
 }
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
 <div className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 text-[#090909]">
 {/* 1. Header & Actions Card */}
 <div className="bg-white border border-neutral-200 rounded-md p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex items-center space-x-3">
 <div className="w-8 h-8 rounded-md bg-[#090909] text-white font-bold flex items-center justify-center text-base border border-neutral-800 flex-shrink-0">
 <Zap className="w-4 h-4 text-white" />
 </div>
 <div>
 <div className="flex items-center space-x-2">
 <h1 className="text-base sm:text-lg font-bold text-[#090909] tracking-tight">Electrical Asset Master Register</h1>
 <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
 POSTGIS REPOSITORY
 </span>
 </div>
 <p className="text-xs mt-0.5 ">
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
 className="px-3.5 py-1.5 rounded-md bg-white hover:bg-neutral-50 border border-neutral-200 text-xs font-medium text-neutral-800 flex items-center space-x-1.5 transition-colors cursor-pointer"
 title="Import KML, GeoJSON or CSV directly into asset registry"
 >
 <Upload className="w-3.5 h-3.5 text-neutral-600" />
 <span>Import Spatial Dataset</span>
 </button>

 {/* Export GeoJSON Button */}
 <button
 onClick={() => dataExchangeService.exportGeoJSON([activeTab])}
 className="px-3.5 py-1.5 rounded-md bg-white hover:bg-neutral-50 border border-neutral-200 text-xs font-medium text-neutral-800 flex items-center space-x-1.5 transition-colors cursor-pointer"
 title="Download GeoJSON FeatureCollection of active tab"
 >
 <FileCode className="w-3.5 h-3.5 text-neutral-600" />
 <span>GeoJSON</span>
 </button>

 {/* Export CSV Button */}
 <button
 onClick={() => dataExchangeService.exportCSV(activeTab)}
 className="px-3.5 py-1.5 rounded-md bg-[#090909] hover:bg-neutral-800 text-white text-xs font-medium flex items-center space-x-1.5 border border-neutral-900 transition-colors cursor-pointer"
 title="Download CSV asset register"
 >
 <Download className="w-3.5 h-3.5" />
 <span>Export CSV</span>
 </button>
 </div>
 </div>

 {/* Import Result Notification Banner */}
 {importResult && (
 <div className="p-3.5 rounded-md bg-white border border-neutral-200 text-[#090909] text-xs space-y-2">
 <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
 <div className="flex items-center space-x-2 font-medium">
 {importResult.success ? (
 <CheckCircle2 className="w-4 h-4 text-neutral-600" />
 ) : (
 <AlertTriangle className="w-4 h-4 text-neutral-600" />
 )}
 <span>{importResult.success ? 'Spatial Data Imported Successfully' : 'Import Incomplete'}</span>
 </div>
 <button onClick={() => setImportResult(null)} className="hover:text-neutral-900 cursor-pointer">
 <X className="w-4 h-4" />
 </button>
 </div>
 <p className="text-neutral-600 text-[11px]">{importResult.message}</p>
 <div className="flex items-center space-x-3 text-[11px]">
 <span className="px-2 py-0.5 rounded bg-[#090909] text-white font-medium">
 Imported: {importResult.importedCount}
 </span>
 <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
 Duplicates: {importResult.duplicateCount}
 </span>
 </div>
 </div>
 )}

 {/* 2. Tabs Selector (White Theme Pills) */}
 <div className="pg-tab-strip flex space-x-1.5 overflow-x-auto pb-1 border-b border-neutral-200 text-xs font-medium">
 <button
 onClick={() => setActiveTab('transformers')}
 className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
 activeTab === 'transformers'
 ? 'bg-[#090909] text-white font-medium'
 : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
 }`}
 >
 Distribution Transformers ({transformers.length})
 </button>
 <button
 onClick={() => setActiveTab('feeders')}
 className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
 activeTab === 'feeders'
 ? 'bg-[#090909] text-white font-medium'
 : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
 }`}
 >
 11kV/22kV Feeders ({feeders.length})
 </button>
 <button
 onClick={() => setActiveTab('poles')}
 className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
 activeTab === 'poles'
 ? 'bg-[#090909] text-white font-medium'
 : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
 }`}
 >
 Utility Poles ({poles.length})
 </button>
 <button
 onClick={() => setActiveTab('consumers')}
 className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
 activeTab === 'consumers'
 ? 'bg-[#090909] text-white font-medium'
 : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
 }`}
 >
 Consumers & Meters ({consumers.length})
 </button>
 <button
 onClick={() => setActiveTab('substations')}
 className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
 activeTab === 'substations'
 ? 'bg-[#090909] text-white font-medium'
 : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
 }`}
 >
 Substations ({substations.length})
 </button>
 </div>

 {/* 3. Responsive Table Container */}
 <div className="bg-white border border-neutral-200 rounded-md overflow-hidden">
 <div className="pg-table-scroll overflow-x-auto">
 <table className="pg-data-table w-full text-xs text-left">
 <thead className="bg-neutral-50 text-neutral-600 text-[10px] border-b border-neutral-200">
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

 <tbody className="divide-y divide-neutral-100 text-neutral-700">
 {activeTab === 'transformers' &&
 transformers.map(t => (
 <tr key={t.id} className="hover:bg-neutral-50 transition-colors">
 <td className="p-3 font-semibold text-[#090909]">{t.code}</td>
 <td className="p-3 font-sans text-neutral-900 font-medium">{t.name}</td>
 <td className="p-3 text-neutral-700">{t.capacityKVA} kVA</td>
 <td className="p-3 font-sans text-neutral-600">{t.make}</td>
 <td className="p-3 text-[#090909] font-semibold">{t.loadPercentage}%</td>
 <td className="p-3 text-neutral-700">{t.oilLevelPct}%</td>
 <td className="p-3 text-neutral-600">{t.phaseImbalancePct}%</td>
 <td className="p-3">
 <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
 {t.status}
 </span>
 </td>
 </tr>
 ))}

 {activeTab === 'feeders' &&
 feeders.map(f => (
 <tr key={f.id} className="hover:bg-neutral-50 transition-colors">
 <td className="p-3 font-semibold text-[#090909]">{f.code}</td>
 <td className="p-3 font-sans text-neutral-900 font-medium">{f.name}</td>
 <td className="p-3 text-neutral-800 font-semibold">{f.voltageClass}</td>
 <td className="p-3 text-neutral-700">{f.lengthKm} km</td>
 <td className="p-3 font-sans text-neutral-600">{f.conductorType}</td>
 <td className="p-3 text-neutral-800">{f.peakLoadAmps} A</td>
 <td className="p-3">
 <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
 f.isEnergized
 ? 'bg-neutral-50 text-neutral-800 border-neutral-200 font-semibold'
 : 'bg-neutral-100 text-neutral-600 border-neutral-200'
 }`}>
 {f.isEnergized ? 'ENERGIZED' : 'SHUTDOWN'}
 </span>
 </td>
 </tr>
 ))}

 {activeTab === 'poles' &&
 poles.map(p => (
 <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
 <td className="p-3 font-semibold text-[#090909]">{p.poleNumber}</td>
 <td className="p-3 text-neutral-600">{p.code}</td>
 <td className="p-3 font-sans text-neutral-800">{p.poleType}</td>
 <td className="p-3 text-neutral-700">{p.heightMeters} m</td>
 <td className="p-3 text-neutral-600">{p.numInsulators}</td>
 <td className="p-3 text-neutral-700">{p.hasStreetlight ? 'Yes (LED)' : 'No'}</td>
 <td className="p-3 text-neutral-900 font-medium">{p.condition}</td>
 </tr>
 ))}

 {activeTab === 'consumers' &&
 consumers.map(c => (
 <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
 <td className="p-3 font-semibold text-[#090909]">{c.consumerNumber}</td>
 <td className="p-3 font-sans text-neutral-900 font-medium">{c.name}</td>
 <td className="p-3 text-neutral-700">{c.meterNumber}</td>
 <td className="p-3">
 <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
 c.isSmartMeter
 ? 'bg-[#090909] text-white font-semibold'
 : 'bg-neutral-100 text-neutral-700 border-neutral-200'
 }`}>
 {c.isSmartMeter ? 'Smart Meter (AMI)' : 'Conventional'}
 </span>
 </td>
 <td className="p-3 text-neutral-800 font-semibold">{c.sanctionedLoadKW} kW</td>
 <td className="p-3 font-sans text-neutral-600">{c.address}</td>
 </tr>
 ))}

 {activeTab === 'substations' &&
 substations.map(s => (
 <tr key={s.id} className="hover:bg-neutral-50 transition-colors">
 <td className="p-3 font-semibold text-[#090909]">{s.code}</td>
 <td className="p-3 font-sans text-neutral-900 font-medium">{s.name}</td>
 <td className="p-3 text-neutral-800 font-semibold">{s.voltageClass}</td>
 <td className="p-3 text-neutral-800">{s.capacityMVA} MVA</td>
 <td className="p-3 text-neutral-600">{s.numFeeders} Feeders</td>
 <td className="p-3 text-neutral-600">{s.commissionDate}</td>
 <td className="p-3">
 <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
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
 <td colSpan={8} className="p-8 text-center font-sans">
 <div className="flex flex-col items-center justify-center space-y-2">
 <div className="w-9 h-9 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center ">
 <Zap className="w-4 h-4 " />
 </div>
 <p className="font-semibold text-xs text-[#090909]">No {activeTab} loaded in current view</p>
 <p className="text-[11px] max-w-md">
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

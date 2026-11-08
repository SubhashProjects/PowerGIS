// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// ELECTRICAL ASSET REGISTER & TABULAR REPOSITORY
// Covers: Substations, Feeders, DTs, Utility Poles, Conductors & Consumers
// ============================================================================

import React, { useState } from 'react';
import { assetService } from '../../services/assetService';
import { useAuth } from '../../context/AuthContext';
import {
  Zap, Search, Filter, Download, Plus, CheckCircle, AlertTriangle, Eye
} from 'lucide-react';

export const AssetTable: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'transformers' | 'feeders' | 'poles' | 'substations' | 'consumers'>('transformers');
  const [searchQuery, setSearchQuery] = useState('');

  const transformers = assetService.getTransformers();
  const feeders = assetService.getFeeders();
  const poles = assetService.getPoles();
  const substations = assetService.getSubstations();
  const consumers = assetService.getConsumers();

  const handleExportCSV = () => {
    let rows: string[] = [];
    if (activeTab === 'transformers') {
      rows.push('Code,Name,Capacity KVA,Make,Load %,Oil %,Status');
      transformers.forEach(t => rows.push(`"${t.code}","${t.name}",${t.capacityKVA},"${t.make}",${t.loadPercentage},${t.oilLevelPct},"${t.status}"`));
    } else if (activeTab === 'feeders') {
      rows.push('Code,Name,Voltage,Length km,Peak Load A,Energized,Status');
      feeders.forEach(f => rows.push(`"${f.code}","${f.name}","${f.voltageClass}",${f.lengthKm},${f.peakLoadAmps},${f.isEnergized},"${f.status}"`));
    } else if (activeTab === 'poles') {
      rows.push('Pole Number,Code,Type,Material,Height m,Streetlight,Condition');
      poles.forEach(p => rows.push(`"${p.poleNumber}","${p.code}","${p.poleType}","${p.material}",${p.heightMeters},${p.hasStreetlight},"${p.condition}"`));
    } else if (activeTab === 'consumers') {
      rows.push('Consumer Number,Name,Meter Number,Smart Meter,Sanctioned Load kW,Address');
      consumers.forEach(c => rows.push(`"${c.consumerNumber}","${c.name}","${c.meterNumber}",${c.isSmartMeter},${c.sanctionedLoadKW},"${c.address}"`));
    } else {
      rows.push('Code,Name,Voltage,Capacity MVA,Feeders,Status');
      substations.forEach(s => rows.push(`"${s.code}","${s.name}","${s.voltageClass}",${s.capacityMVA},${s.numFeeders},"${s.status}"`));
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PowerGIS_${activeTab}_export.csv`;
    a.click();
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Header & Export Actions */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">Electrical Asset Master Register</h2>
            <p className="text-xs text-slate-400">PostGIS Spatially Scoped Distribution Assets • {user.role.toUpperCase()}</p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center space-x-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-sky-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('transformers')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'transformers' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          Distribution Transformers ({transformers.length})
        </button>
        <button
          onClick={() => setActiveTab('feeders')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'feeders' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          Feeders ({feeders.length})
        </button>
        <button
          onClick={() => setActiveTab('poles')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'poles' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          Utility Poles ({poles.length})
        </button>
        <button
          onClick={() => setActiveTab('consumers')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'consumers' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          Consumers & Meters ({consumers.length})
        </button>
        <button
          onClick={() => setActiveTab('substations')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'substations' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          Substations ({substations.length})
        </button>
      </div>

      {/* Table Content */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#090f1a] text-slate-400 font-mono text-[10px] border-b border-slate-800">
            {activeTab === 'transformers' && (
              <tr>
                <th className="p-3">Asset Code</th>
                <th className="p-3">Transformer Name</th>
                <th className="p-3">Capacity</th>
                <th className="p-3">Make</th>
                <th className="p-3">Loading</th>
                <th className="p-3">Oil Level</th>
                <th className="p-3">Phase Imbalance</th>
                <th className="p-3">Status</th>
              </tr>
            )}
            {activeTab === 'feeders' && (
              <tr>
                <th className="p-3">Feeder Code</th>
                <th className="p-3">Feeder Name</th>
                <th className="p-3">Voltage</th>
                <th className="p-3">Length</th>
                <th className="p-3">Conductor Type</th>
                <th className="p-3">Peak Load</th>
                <th className="p-3">Grid State</th>
              </tr>
            )}
            {activeTab === 'poles' && (
              <tr>
                <th className="p-3">Pole Number</th>
                <th className="p-3">Code</th>
                <th className="p-3">Type</th>
                <th className="p-3">Height</th>
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
                <th className="p-3">Feeders</th>
                <th className="p-3">Commissioned</th>
                <th className="p-3">Status</th>
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-slate-800/60 font-mono">
            {activeTab === 'transformers' &&
              transformers.map(t => (
                <tr key={t.id} className="hover:bg-slate-800/30">
                  <td className="p-3 font-bold text-sky-400">{t.code}</td>
                  <td className="p-3 font-sans text-slate-200 font-semibold">{t.name}</td>
                  <td className="p-3 text-slate-300">{t.capacityKVA} kVA</td>
                  <td className="p-3 font-sans text-slate-400">{t.make}</td>
                  <td className="p-3 text-amber-300 font-bold">{t.loadPercentage}%</td>
                  <td className="p-3 text-emerald-400">{t.oilLevelPct}%</td>
                  <td className="p-3 text-slate-300">{t.phaseImbalancePct}%</td>
                  <td className="p-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400">
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}

            {activeTab === 'feeders' &&
              feeders.map(f => (
                <tr key={f.id} className="hover:bg-slate-800/30">
                  <td className="p-3 font-bold text-sky-400">{f.code}</td>
                  <td className="p-3 font-sans text-slate-200 font-semibold">{f.name}</td>
                  <td className="p-3 text-amber-300 font-bold">{f.voltageClass}</td>
                  <td className="p-3 text-slate-300">{f.lengthKm} km</td>
                  <td className="p-3 font-sans text-slate-400">{f.conductorType}</td>
                  <td className="p-3 text-slate-200">{f.peakLoadAmps} A</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      f.isEnergized ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {f.isEnergized ? 'ENERGIZED' : 'SHUTDOWN'}
                    </span>
                  </td>
                </tr>
              ))}

            {activeTab === 'poles' &&
              poles.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/30">
                  <td className="p-3 font-bold text-sky-400">{p.poleNumber}</td>
                  <td className="p-3 text-slate-400">{p.code}</td>
                  <td className="p-3 font-sans text-slate-200">{p.poleType}</td>
                  <td className="p-3 text-slate-300">{p.heightMeters} m</td>
                  <td className="p-3 text-slate-400">{p.numInsulators}</td>
                  <td className="p-3 text-amber-300">{p.hasStreetlight ? 'Yes (LED)' : 'No'}</td>
                  <td className="p-3 text-emerald-400 font-semibold">{p.condition}</td>
                </tr>
              ))}

            {activeTab === 'consumers' &&
              consumers.map(c => (
                <tr key={c.id} className="hover:bg-slate-800/30">
                  <td className="p-3 font-bold text-sky-400">{c.consumerNumber}</td>
                  <td className="p-3 font-sans text-slate-200 font-semibold">{c.name}</td>
                  <td className="p-3 text-slate-300">{c.meterNumber}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.isSmartMeter ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {c.isSmartMeter ? 'Smart Meter (AMI)' : 'Conventional'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-200">{c.sanctionedLoadKW} kW</td>
                  <td className="p-3 font-sans text-slate-400">{c.address}</td>
                </tr>
              ))}

            {activeTab === 'substations' &&
              substations.map(s => (
                <tr key={s.id} className="hover:bg-slate-800/30">
                  <td className="p-3 font-bold text-red-400">{s.code}</td>
                  <td className="p-3 font-sans text-slate-200 font-semibold">{s.name}</td>
                  <td className="p-3 text-amber-300 font-bold">{s.voltageClass}</td>
                  <td className="p-3 text-slate-200">{s.capacityMVA} MVA</td>
                  <td className="p-3 text-slate-400">{s.numFeeders} Feeders</td>
                  <td className="p-3 text-slate-400">{s.commissionDate}</td>
                  <td className="p-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

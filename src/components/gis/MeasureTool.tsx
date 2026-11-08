// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// GIS MEASUREMENT & NAVIGATION TOOLBAR (DISTANCE, AREA & GPS)
// ============================================================================

import React from 'react';
import { useGIS } from '../../context/GISContext';
import { Ruler, Maximize2, Crosshair, Trash2, Navigation } from 'lucide-react';

export const MeasureTool: React.FC = () => {
  const { measurement, setMeasurementMode, clearMeasurement } = useGIS();

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          alert(`Your Current GPS Position:\nLatitude: ${pos.coords.latitude.toFixed(6)}° N\nLongitude: ${pos.coords.longitude.toFixed(6)}° E\nAccuracy: ±${pos.coords.accuracy.toFixed(1)}m`);
        },
        err => {
          alert('GPS Geolocation unavailable: ' + err.message);
        }
      );
    }
  };

  return (
    <div className="absolute bottom-6 left-4 z-[1000] select-none flex items-center space-x-2 bg-[#0f172a]/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 shadow-2xl">
      {/* Measure Distance Button */}
      <button
        onClick={() => setMeasurementMode(measurement.mode === 'distance' ? 'none' : 'distance')}
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          measurement.mode === 'distance'
            ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
            : 'text-slate-300 hover:bg-slate-800'
        }`}
        title="Measure line distance"
      >
        <Ruler className="w-3.5 h-3.5" />
        <span>Distance</span>
      </button>

      {/* Measure Area Button */}
      <button
        onClick={() => setMeasurementMode(measurement.mode === 'area' ? 'none' : 'area')}
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          measurement.mode === 'area'
            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
            : 'text-slate-300 hover:bg-slate-800'
        }`}
        title="Measure polygon area"
      >
        <Maximize2 className="w-3.5 h-3.5" />
        <span>Area</span>
      </button>

      {/* GPS Locate Current Position */}
      <button
        onClick={handleLocateMe}
        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        title="Locate my position (GPS)"
      >
        <Crosshair className="w-4 h-4 text-sky-400" />
      </button>

      {/* Clear Measurements */}
      {measurement.mode !== 'none' && (
        <button
          onClick={clearMeasurement}
          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Clear measurement"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Measurement readout pill */}
      {measurement.mode !== 'none' && (
        <div className="px-2 py-1 rounded bg-slate-800 text-[11px] font-mono text-sky-300 border border-slate-700">
          {measurement.mode === 'distance' ? (
            <span>Dist: {measurement.totalDistanceM}m ({((measurement.totalDistanceM) / 1000).toFixed(2)}km)</span>
          ) : (
            <span>Area: {measurement.totalAreaSqM} m²</span>
          )}
        </div>
      )}
    </div>
  );
};

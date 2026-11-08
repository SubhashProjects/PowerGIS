// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// GIS MEASUREMENT & NAVIGATION TOOLBAR (DISTANCE, AREA & GPS) - MONOCHROME B&W
// ============================================================================

import React from 'react';
import { useGIS } from '../../context/GISContext';
import { Ruler, Maximize2, Crosshair, Trash2 } from 'lucide-react';

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
    <div className="absolute bottom-20 sm:bottom-6 left-4 z-[990] select-none flex flex-wrap items-center gap-1.5 bg-black/90 backdrop-blur-md border border-neutral-800 rounded-xl p-1.5 shadow-2xl max-w-[calc(100vw-2rem)]">
      {/* Measure Distance Button */}
      <button
        onClick={() => setMeasurementMode(measurement.mode === 'distance' ? 'none' : 'distance')}
        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          measurement.mode === 'distance'
            ? 'bg-white text-black font-bold shadow-md'
            : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
        }`}
        title="Measure line distance"
      >
        <Ruler className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">Dist</span>
      </button>

      {/* Measure Area Button */}
      <button
        onClick={() => setMeasurementMode(measurement.mode === 'area' ? 'none' : 'area')}
        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          measurement.mode === 'area'
            ? 'bg-white text-black font-bold shadow-md'
            : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
        }`}
        title="Measure polygon area"
      >
        <Maximize2 className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">Area</span>
      </button>

      {/* GPS Locate Current Position */}
      <button
        onClick={handleLocateMe}
        className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800 transition-colors"
        title="Locate my position (GPS)"
      >
        <Crosshair className="w-3.5 h-3.5 text-white" />
      </button>

      {/* Clear Measurements */}
      {measurement.mode !== 'none' && (
        <button
          onClick={clearMeasurement}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          title="Clear measurement"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Measurement readout pill */}
      {measurement.mode !== 'none' && (
        <div className="px-2 py-1 rounded bg-neutral-900 text-[11px] font-mono text-white border border-neutral-800 whitespace-nowrap">
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

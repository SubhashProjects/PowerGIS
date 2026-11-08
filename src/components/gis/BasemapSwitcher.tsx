// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// MULTI-BASEMAP SWITCHER CONTROL (GOOGLE MAPS, OSM & ESRI)
// ============================================================================

import React, { useState } from 'react';
import { useGIS } from '../../context/GISContext';
import { availableBasemaps } from '../../services/gisService';
import { Layers, ChevronDown, Check } from 'lucide-react';

export const BasemapSwitcher: React.FC = () => {
  const { currentBasemap, setBasemap } = useGIS();
  const [isOpen, setIsOpen] = useState(false);

  const selected = availableBasemaps.find(b => b.id === currentBasemap) || availableBasemaps[0];

  return (
    <div className="absolute top-4 right-4 z-[1000] select-none">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[#0f172a]/90 backdrop-blur-md border border-slate-700/80 text-white shadow-xl hover:bg-slate-800 transition-all text-xs font-semibold"
        >
          <Layers className="w-4 h-4 text-sky-400" />
          <span>Basemap: {selected.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-11 w-64 bg-[#0d1527]/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-2 z-50">
            <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 mb-1 border-b border-slate-800 flex justify-between">
              <span>Select Map Engine</span>
              <span className="text-sky-400">8 Providers</span>
            </div>

            <div className="space-y-1 max-h-72 overflow-y-auto">
              {availableBasemaps.map(b => (
                <button
                  key={b.id}
                  onClick={() => {
                    setBasemap(b.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    currentBasemap === b.id
                      ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-400 font-mono">
                      {b.category}
                    </span>
                    <span>{b.name}</span>
                  </div>
                  {currentBasemap === b.id && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

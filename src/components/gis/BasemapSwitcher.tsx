// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// MULTI-BASEMAP SWITCHER CONTROL - PURE WHITE THEME
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
          className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-neutral-300 text-neutral-900 shadow-md hover:bg-neutral-100 transition-all text-xs font-semibold"
        >
          <Layers className="w-4 h-4 text-neutral-800" />
          <span>Basemap: {selected.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-11 w-72 bg-white/95 backdrop-blur-md border border-neutral-200 rounded-2xl shadow-2xl p-2 z-50">
            <div className="text-[10px] uppercase font-bold text-neutral-500 px-2 py-1 mb-1 border-b border-neutral-200 flex justify-between">
              <span>Select Map Engine</span>
              <span className="text-neutral-900 font-mono font-bold">10 Providers</span>
            </div>

            <div className="space-y-1 max-h-72 overflow-y-auto">
              {availableBasemaps.map(b => (
                <button
                  key={b.id}
                  onClick={() => {
                    setBasemap(b.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    currentBasemap === b.id
                      ? 'bg-neutral-900 text-white font-bold shadow-xs'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                      currentBasemap === b.id ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                    }`}>
                      {b.category}
                    </span>
                    <span className="truncate">{b.name}</span>
                  </div>
                  {currentBasemap === b.id && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

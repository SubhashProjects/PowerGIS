// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// MULTI-BASEMAP SWITCHER CONTROL - COLORFUL THEME (GOOGLE, OSM & ESRI)
// ============================================================================

import React, { useState } from 'react';
import { useGIS } from '../../context/GISContext';
import { availableBasemaps } from '../../services/gisService';
import { getBasemapCategoryBadge } from '../../config/basemapConfig';
import { Layers, ChevronDown, Check, Globe } from 'lucide-react';

export const BasemapSwitcher: React.FC = () => {
  const { currentBasemap, setBasemap } = useGIS();
  const [isOpen, setIsOpen] = useState(false);

  const selected = availableBasemaps.find(b => b.id === currentBasemap) || availableBasemaps[0];

  return (
    <div className="absolute top-4 right-4 z-[1000] select-none">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-white border border-[#E4E4E7] text-[#09090B] shadow-sm hover:bg-zinc-50 transition-colors text-xs font-semibold cursor-pointer"
        >
          <div className="w-5 h-5 rounded-md bg-[#09090B] flex items-center justify-center text-white">
            <Layers className="w-3 h-3" />
          </div>
          <span className="font-semibold text-zinc-950">Map: {selected.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-10 w-80 bg-white border border-[#E4E4E7] rounded-md shadow-lg p-2.5 z-50 animate-fadeIn">
            <div className="text-[10px] uppercase font-bold text-zinc-500 px-2 py-1.5 mb-1.5 border-b border-zinc-100 flex justify-between items-center">
              <span className="font-mono text-zinc-700">Multi-Vendor Basemap Engines</span>
              <span className="text-zinc-800 font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-100 border border-zinc-200">
                {availableBasemaps.length} Providers
              </span>
            </div>

            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {availableBasemaps.map(b => {
                const isCurrent = currentBasemap === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setBasemap(b.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-[#09090B] text-white font-medium'
                        : 'text-zinc-800 hover:bg-zinc-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                        isCurrent
                          ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                          : getBasemapCategoryBadge(b.category).bg
                      }`}>
                        {b.category}
                      </span>
                      <span className="truncate">{b.name}</span>
                    </div>
                    {isCurrent && <Check className="w-4 h-4 text-white flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

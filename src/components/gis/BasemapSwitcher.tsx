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
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-blue-200/80 text-neutral-900 shadow-lg hover:border-blue-400 hover:shadow-blue-500/10 transition-all text-xs font-semibold cursor-pointer"
        >
          <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-2xs">
            <Layers className="w-3 h-3" />
          </div>
          <span className="font-bold text-slate-900">Map: {selected.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-11 w-80 bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl p-2.5 z-50 animate-fadeIn">
            <div className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1.5 mb-1.5 border-b border-slate-100 flex justify-between items-center">
              <span className="font-mono text-slate-700">Multi-Vendor Color Basemap Engines</span>
              <span className="text-emerald-700 font-mono font-extrabold px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200">
                {availableBasemaps.length} Color Providers
              </span>
            </div>

            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {availableBasemaps.map(b => {
                const isCurrent = currentBasemap === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setBasemap(b.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/25 ring-1 ring-blue-700'
                        : 'text-slate-800 hover:bg-slate-50 hover:text-blue-700 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                        isCurrent
                          ? 'bg-white/20 text-white border-white/30'
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

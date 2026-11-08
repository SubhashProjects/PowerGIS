// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// GIS LAYER TREE CONTROLLER & OPACITY - PURE WHITE THEME
// ============================================================================

import React, { useState } from 'react';
import { useGIS } from '../../context/GISContext';
import { Sliders, Eye, EyeOff, ChevronDown, X } from 'lucide-react';

export const LayerTree: React.FC = () => {
  const { layers, toggleLayer } = useGIS();
  const [isOpen, setIsOpen] = useState(false);

  const categories = ['Assets', 'Network', 'Customers', 'Operations'];
  const activeCount = layers.filter(l => l.visible).length;

  return (
    <div className="absolute top-4 left-4 z-[1000] select-none">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-emerald-200/80 text-slate-900 shadow-lg hover:border-emerald-400 hover:shadow-emerald-500/10 transition-all text-xs font-semibold cursor-pointer"
        >
          <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-2xs">
            <Sliders className="w-3 h-3" />
          </div>
          <span className="hidden sm:inline font-bold text-slate-900">GIS Layers</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold">
            {activeCount}/{layers.length}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-11 w-80 max-w-[calc(100vw-2rem)] bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl p-3.5 z-50 max-h-[75vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="text-emerald-700 font-extrabold font-mono">Electrical GIS Overlays</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors sm:hidden"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {categories.map(cat => {
                const catLayers = layers.filter(l => l.category === cat);
                if (catLayers.length === 0) return null;

                return (
                  <div key={cat} className="space-y-1">
                    <div className="text-[11px] font-semibold text-neutral-700 flex items-center justify-between px-1">
                      <span>{cat}</span>
                      <span className="text-[10px] text-neutral-500 font-mono font-medium">
                        {catLayers.filter(l => l.visible).length}/{catLayers.length} Active
                      </span>
                    </div>

                    <div className="space-y-1 pl-1">
                      {catLayers.map(l => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-neutral-50 border border-neutral-200 hover:border-neutral-300 text-xs transition-colors"
                        >
                          <div className="flex items-center space-x-2 flex-1 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-neutral-400"
                              style={{ backgroundColor: l.color }}
                            />
                            <span className="truncate text-neutral-800 text-[11px] font-medium">{l.name}</span>
                          </div>

                          <div className="flex items-center space-x-2 ml-2">
                            <button
                              onClick={() => toggleLayer(l.id)}
                              className="p-1 rounded text-neutral-400 hover:text-neutral-900 transition-colors"
                              title={l.visible ? 'Hide Layer' : 'Show Layer'}
                            >
                              {l.visible ? (
                                <Eye className="w-3.5 h-3.5 text-neutral-900" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

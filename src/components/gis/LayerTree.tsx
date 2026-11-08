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
          className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-neutral-300 text-neutral-900 shadow-md hover:bg-neutral-100 transition-all text-xs font-semibold"
        >
          <Sliders className="w-4 h-4 text-neutral-800" />
          <span className="hidden sm:inline">GIS Layers</span>
          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-300 font-bold">
            {activeCount}/{layers.length}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-11 w-80 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md border border-neutral-200 rounded-2xl shadow-2xl p-3 z-50 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-200 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              <span className="text-neutral-950 font-extrabold">Electrical GIS Overlays</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors sm:hidden"
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

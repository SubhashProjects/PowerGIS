// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// GIS LAYER TREE CONTROLLER & OPACITY SLIDERS
// ============================================================================

import React, { useState } from 'react';
import { useGIS } from '../../context/GISContext';
import { Layers, Eye, EyeOff, Sliders, ChevronDown, ChevronRight } from 'lucide-react';

export const LayerTree: React.FC = () => {
  const { layers, toggleLayer, setLayerOpacity } = useGIS();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = ['Assets', 'Network', 'Customers', 'Operations'];

  return (
    <div className="absolute top-4 left-4 z-[1000] select-none">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[#0f172a]/90 backdrop-blur-md border border-slate-700/80 text-white shadow-xl hover:bg-slate-800 transition-all text-xs font-semibold"
        >
          <Sliders className="w-4 h-4 text-sky-400" />
          <span>GIS Layers ({layers.filter(l => l.visible).length}/{layers.length})</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-11 w-80 bg-[#0d1527]/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-3 z-50 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Electrical GIS Overlays</span>
              <span className="text-sky-400">PostGIS Layers</span>
            </div>

            <div className="space-y-3">
              {categories.map(cat => {
                const catLayers = layers.filter(l => l.category === cat);
                if (catLayers.length === 0) return null;

                return (
                  <div key={cat} className="space-y-1">
                    <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between px-1">
                      <span>{cat}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {catLayers.filter(l => l.visible).length}/{catLayers.length} Active
                      </span>
                    </div>

                    <div className="space-y-1 pl-1">
                      {catLayers.map(l => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 text-xs transition-colors"
                        >
                          <div className="flex items-center space-x-2 flex-1 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: l.color }}
                            />
                            <span className="truncate text-slate-200 text-[11px]">{l.name}</span>
                          </div>

                          <div className="flex items-center space-x-2 ml-2">
                            <button
                              onClick={() => toggleLayer(l.id)}
                              className="text-slate-400 hover:text-white transition-colors"
                              title={l.visible ? 'Hide Layer' : 'Show Layer'}
                            >
                              {l.visible ? (
                                <Eye className="w-3.5 h-3.5 text-sky-400" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-slate-600" />
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

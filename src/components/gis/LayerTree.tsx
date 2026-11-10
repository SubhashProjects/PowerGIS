// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// GIS LAYER TREE CONTROLLER & OPACITY - PURE WHITE THEME
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useGIS } from '../../context/GISContext';
import { assetService } from '../../services/assetService';
import { dataExchangeService } from '../../services/dataExchangeService';
import { Sliders, Eye, EyeOff, ChevronDown, X, Upload, CheckCircle2, AlertCircle, Zap, Trash2 } from 'lucide-react';

export const LayerTree: React.FC = () => {
  const { layers, toggleLayer } = useGIS();
  const [isOpen, setIsOpen] = useState(false);
  const [isSimulatorActive, setIsSimulatorActive] = useState<boolean>(assetService.isSimulatorMode());
  const [uploadStatus, setUploadStatus] = useState<{ message: string; isError?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = assetService.subscribe(() => {
      setIsSimulatorActive(assetService.isSimulatorMode());
    });
    return unsub;
  }, []);

  const categories = ['Assets', 'Network', 'Customers', 'Operations'];
  const activeCount = layers.filter(l => l.visible).length;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await dataExchangeService.importSpatialFile(file);
      if (result.success) {
        // Ensure relevant asset layers are visible so uploaded features render immediately
        layers.forEach(l => {
          if (!l.visible && (l.id.includes('feeder') || l.id.includes('transformer') || l.id.includes('pole') || l.id.includes('substation'))) {
            toggleLayer(l.id);
          }
        });

        setUploadStatus({
          message: `✓ ${result.message} (${result.importedCount} assets added to map)`,
          isError: false,
        });
      } else {
        setUploadStatus({
          message: `✗ Import error: ${result.message}`,
          isError: true,
        });
      }
    } catch (err: any) {
      setUploadStatus({
        message: `✗ Error: ${err.message}`,
        isError: true,
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setUploadStatus(null), 8000);
  };

  const handleToggleSimulator = () => {
    const next = assetService.toggleSimulatorMode();
    setIsSimulatorActive(next);
  };

  const handleClearUserLayers = () => {
    if (confirm('Are you sure you want to clear all uploaded spatial layers from the map?')) {
      assetService.clearUserAssets();
      setUploadStatus({
        message: '✓ All uploaded map layers cleared.',
        isError: false,
      });
      setTimeout(() => setUploadStatus(null), 4000);
    }
  };

  return (
    <div className="absolute top-4 left-4 z-[1000] select-none">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-white border border-[#E4E4E7] text-[#09090B] shadow-sm hover:bg-zinc-50 transition-colors text-xs font-semibold cursor-pointer"
        >
          <div className="w-5 h-5 rounded-md bg-[#09090B] flex items-center justify-center text-white">
            <Sliders className="w-3 h-3" />
          </div>
          <span className="hidden sm:inline font-bold text-zinc-950">GIS Layers</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-800 border border-zinc-200 font-semibold">
            {activeCount}/{layers.length}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-10 w-80 max-w-[calc(100vw-2rem)] bg-white border border-[#E4E4E7] rounded-md shadow-lg p-3.5 z-50 max-h-[75vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <span className="text-zinc-900 font-bold font-mono">Electrical GIS Overlays</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors sm:hidden"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {uploadStatus && (
              <div
                className={`mb-2.5 p-2 rounded-md border text-[11px] font-mono leading-tight flex items-start space-x-1.5 ${
                  uploadStatus.isError
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {uploadStatus.isError ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                )}
                <span>{uploadStatus.message}</span>
              </div>
            )}

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
                          className="flex items-center justify-between p-1.5 rounded-md bg-neutral-50 border border-neutral-200 hover:border-neutral-300 text-xs transition-colors"
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

            {/* Quick Upload Map Layer Button & Simulator Toggle */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".kml,.geojson,.json,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-300" />
                <span>Upload Layer (KML, GeoJSON, CSV)</span>
              </button>
              <span className="block text-[9.5px] text-zinc-500 font-mono text-center">
                Supports Feeders (Lines), DTs & Poles (Points)
              </span>

              {/* In-Map Simulator Toggle Pill */}
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-zinc-700 flex items-center space-x-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Test Grid Dummy Data:</span>
                </span>
                <button
                  type="button"
                  onClick={handleToggleSimulator}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                    isSimulatorActive
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
                  }`}
                >
                  {isSimulatorActive ? 'SIMULATOR: ON' : 'SIMULATOR: OFF'}
                </button>
              </div>

              {/* Clear Uploaded Layers Button */}
              <button
                type="button"
                onClick={handleClearUserLayers}
                className="w-full py-1.5 px-2 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10.5px] font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-rose-600" />
                <span>Clear Uploaded Map Layers</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// GIS CONTEXT PROVIDER: BASEMAPS, OVERLAYS, MEASUREMENT & SELECTED ASSET
// ============================================================================

import React, { createContext, useContext, useState } from 'react';
import { BasemapProviderId, GISLayerState, GISOverlayLayerId, MapMeasurement } from '../types/gis';
import { initialGISLayers, regionCoordinates } from '../services/gisService';

interface GISContextType {
  currentBasemap: BasemapProviderId;
  setBasemap: (id: BasemapProviderId) => void;
  layers: GISLayerState[];
  toggleLayer: (id: GISOverlayLayerId) => void;
  setLayerOpacity: (id: GISOverlayLayerId, opacity: number) => void;
  measurement: MapMeasurement;
  setMeasurementMode: (mode: 'none' | 'distance' | 'area') => void;
  addMeasurementPoint: (pt: [number, number]) => void;
  clearMeasurement: () => void;
  activeRegion: string;
  flyToRegion: (regionId: string) => void;
  selectedAsset: any | null;
  setSelectedAsset: (asset: any | null) => void;
}

const GISContext = createContext<GISContextType | undefined>(undefined);

export const GISProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentBasemap, setBasemap] = useState<BasemapProviderId>('google_roadmap');
  const [layers, setLayers] = useState<GISLayerState[]>(initialGISLayers);
  const [activeRegion, setActiveRegion] = useState<string>('reg-pdy');
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  const [measurement, setMeasurement] = useState<MapMeasurement>({
    mode: 'none',
    points: [],
    totalDistanceM: 0,
    totalAreaSqM: 0,
  });

  const toggleLayer = (id: GISOverlayLayerId) => {
    setLayers(prev =>
      prev.map(l => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  const setLayerOpacity = (id: GISOverlayLayerId, opacity: number) => {
    setLayers(prev =>
      prev.map(l => (l.id === id ? { ...l, opacity } : l))
    );
  };

  const setMeasurementMode = (mode: 'none' | 'distance' | 'area') => {
    setMeasurement({
      mode,
      points: [],
      totalDistanceM: 0,
      totalAreaSqM: 0,
    });
  };

  const addMeasurementPoint = (pt: [number, number]) => {
    setMeasurement(prev => {
      const newPoints: [number, number][] = [...prev.points, pt];
      return {
        ...prev,
        points: newPoints,
      };
    });
  };

  const clearMeasurement = () => {
    setMeasurement({
      mode: 'none',
      points: [],
      totalDistanceM: 0,
      totalAreaSqM: 0,
    });
  };

  const flyToRegion = (regionId: string) => {
    setActiveRegion(regionId);
  };

  return (
    <GISContext.Provider
      value={{
        currentBasemap,
        setBasemap,
        layers,
        toggleLayer,
        setLayerOpacity,
        measurement,
        setMeasurementMode,
        addMeasurementPoint,
        clearMeasurement,
        activeRegion,
        flyToRegion,
        selectedAsset,
        setSelectedAsset,
      }}
    >
      {children}
    </GISContext.Provider>
  );
};

export const useGIS = () => {
  const ctx = useContext(GISContext);
  if (!ctx) throw new Error('useGIS must be used within a GISProvider');
  return ctx;
};

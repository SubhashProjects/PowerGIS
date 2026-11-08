// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// GIS CONTEXT PROVIDER: BASEMAPS, OVERLAYS, MEASUREMENT, ROTATION, THEME & SELECTED ASSET
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  bearing: number;
  setBearing: (bearing: number | ((prev: number) => number)) => void;
  rotateBy: (degrees: number) => void;
  resetBearing: () => void;
  themeMode: 'black' | 'white';
  setThemeMode: (theme: 'black' | 'white') => void;
  toggleThemeMode: () => void;
}

const GISContext = createContext<GISContextType | undefined>(undefined);

export const GISProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentBasemap, setBasemap] = useState<BasemapProviderId>('carto_dark');
  const [layers, setLayers] = useState<GISLayerState[]>(initialGISLayers);
  const [activeRegion, setActiveRegion] = useState<string>('reg-pdy');
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [bearing, setBearingState] = useState<number>(0);
  const [themeMode, setThemeModeState] = useState<'black' | 'white'>('black');

  const normalizeBearing = (deg: number): number => {
    const mod = deg % 360;
    return mod < 0 ? mod + 360 : Math.round(mod);
  };

  const setBearing = (val: number | ((prev: number) => number)) => {
    setBearingState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      return normalizeBearing(next);
    });
  };

  const rotateBy = (degrees: number) => {
    setBearing(prev => prev + degrees);
  };

  const resetBearing = () => {
    setBearingState(0);
  };

  const setThemeMode = (mode: 'black' | 'white') => {
    setThemeModeState(mode);
    if (mode === 'white') {
      setBasemap('carto_light');
      document.documentElement.classList.add('theme-white');
    } else {
      setBasemap('carto_dark');
      document.documentElement.classList.remove('theme-white');
    }
  };

  const toggleThemeMode = () => {
    setThemeMode(themeMode === 'black' ? 'white' : 'black');
  };

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
        bearing,
        setBearing,
        rotateBy,
        resetBearing,
        themeMode,
        setThemeMode,
        toggleThemeMode,
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

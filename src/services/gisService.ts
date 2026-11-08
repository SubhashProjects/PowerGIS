// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// GIS ENGINE & MULTI-BASEMAP LAYER MANAGER (GOOGLE MAPS, OSM & ESRI)
// Modular Architecture - Consumes SSOT from src/config/
// ============================================================================

import { BasemapConfig, GISLayerState } from '../types/gis';
import { BASEMAP_PROVIDERS, DEFAULT_BASEMAP_ID } from '../config/basemapConfig';
import { APP_CONFIG } from '../config/appConfig';

// Single Source of Truth export for available basemaps
export const availableBasemaps: BasemapConfig[] = BASEMAP_PROVIDERS;
export const defaultBasemapId = DEFAULT_BASEMAP_ID;

// Layer configuration
export const initialGISLayers: GISLayerState[] = [
  { id: 'substations', name: 'Substations (230kV / 110kV / 66kV / 33kV)', category: 'Assets', color: '#EF4444', visible: true, opacity: 1, count: 7 },
  { id: 'feeders_ht_22kv', name: 'HT 22kV / 33kV Feeders', category: 'Network', color: '#F59E0B', visible: true, opacity: 1, count: 2 },
  { id: 'feeders_11kv', name: '11kV Distribution Feeders', category: 'Network', color: '#38BDF8', visible: true, opacity: 1, count: 5 },
  { id: 'transformers', name: 'Distribution Transformers (DTR)', category: 'Assets', color: '#10B981', visible: true, opacity: 1, count: 4 },
  { id: 'poles_ht', name: 'HT Utility Poles (11m)', category: 'Assets', color: '#8B5CF6', visible: true, opacity: 1, count: 6 },
  { id: 'poles_lt', name: 'LT Distribution Poles (9m)', category: 'Assets', color: '#6366F1', visible: true, opacity: 1, count: 18 },
  { id: 'conductors', name: 'Overhead Conductors & Cables', category: 'Network', color: '#06B6D4', visible: true, opacity: 1, count: 12 },
  { id: 'streetlights', name: 'LED Streetlights', category: 'Assets', color: '#FBBF24', visible: true, opacity: 1, count: 24 },
  { id: 'consumers_smart', name: 'Consumers (Smart Meters)', category: 'Customers', color: '#10B981', visible: true, opacity: 1, count: 85 },
  { id: 'consumers_conventional', name: 'Consumers (Conventional Meters)', category: 'Customers', color: '#64748B', visible: true, opacity: 0.8, count: 42 },
  { id: 'fault_locations', name: 'Active Fault Pins', category: 'Operations', color: '#DC2626', visible: true, opacity: 1, count: 2 },
  { id: 'survey_staging', name: 'Contractor Pending Survey Staging', category: 'Operations', color: '#EC4899', visible: true, opacity: 1, count: 2 },
  { id: 'outage_polygons', name: 'Power Outage Affected Zones', category: 'Operations', color: '#E11D48', visible: true, opacity: 0.6, count: 1 },
];

// Region coordinates mapped from central appConfig
export const regionCoordinates: Record<string, { center: [number, number]; zoom: number }> = {
  'reg-pdy': { center: APP_CONFIG.regions['reg-pdy'].center, zoom: APP_CONFIG.regions['reg-pdy'].zoom },
  'reg-kkl': { center: APP_CONFIG.regions['reg-kkl'].center, zoom: APP_CONFIG.regions['reg-kkl'].zoom },
  'reg-mah': { center: APP_CONFIG.regions['reg-mhe'].center, zoom: APP_CONFIG.regions['reg-mhe'].zoom },
  'reg-yan': { center: APP_CONFIG.regions['reg-ynm'].center, zoom: APP_CONFIG.regions['reg-ynm'].zoom },
};

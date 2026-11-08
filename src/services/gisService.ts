// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// GIS ENGINE & MULTI-BASEMAP LAYER MANAGER (GOOGLE MAPS, OSM & ESRI)
// ============================================================================

import { BasemapConfig, GISLayerState } from '../types/gis';

export const availableBasemaps: BasemapConfig[] = [
  {
    id: 'osm_standard',
    name: 'OpenStreetMap Standard (Color)',
    category: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
    thumbnail: 'https://a.tile.openstreetmap.org/13/4093/2723.png',
  },
  {
    id: 'google_roadmap',
    name: 'Google Maps Roadmap',
    category: 'Google',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps',
    thumbnail: 'https://maps.gstatic.com/tactile/layerswitcher/default_roadmap_2x.png',
  },
  {
    id: 'google_satellite',
    name: 'Google Maps Satellite',
    category: 'Google',
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps Satellite',
    thumbnail: 'https://maps.gstatic.com/tactile/layerswitcher/satellite_2x.png',
  },
  {
    id: 'google_hybrid',
    name: 'Google Maps Hybrid',
    category: 'Google',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps Hybrid',
    thumbnail: 'https://maps.gstatic.com/tactile/layerswitcher/satellite_2x.png',
  },
  {
    id: 'google_terrain',
    name: 'Google Maps Terrain',
    category: 'Google',
    url: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps Terrain',
    thumbnail: 'https://maps.gstatic.com/tactile/layerswitcher/terrain_2x.png',
  },
  {
    id: 'osm_standard',
    name: 'OpenStreetMap Standard',
    category: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
    thumbnail: 'https://a.tile.openstreetmap.org/13/4093/2723.png',
  },
  {
    id: 'osm_hot',
    name: 'OSM Humanitarian (HOT)',
    category: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors, Humanitarian OpenStreetMap Team',
    thumbnail: 'https://a.tile.openstreetmap.fr/hot/13/4093/2723.png',
  },
  {
    id: 'esri_imagery',
    name: 'Esri World Imagery',
    category: 'Esri',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
    thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/13/4093/2723',
  },
  {
    id: 'esri_topo',
    name: 'Esri World Topographic',
    category: 'Esri',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri, DeLorme, NAVTEQ',
    thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/13/4093/2723',
  },
];

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

export const regionCoordinates: Record<string, { center: [number, number]; zoom: number }> = {
  'reg-pdy': { center: [11.9360, 79.8250], zoom: 13 },
  'reg-kkl': { center: [10.9254, 79.8380], zoom: 13 },
  'reg-mah': { center: [11.7018, 75.5342], zoom: 14 },
  'reg-yan': { center: [16.7320, 82.2175], zoom: 14 },
};

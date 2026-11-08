// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// BASEMAP CONFIGURATION & SINGLE SOURCE OF TRUTH (SSOT)
// Only vibrant, high-contrast, multi-vendor color basemaps.
// ============================================================================

import { BasemapConfig, BasemapProviderId } from '../types/gis';

export const DEFAULT_BASEMAP_ID: BasemapProviderId = 'google_roadmap';

export const BASEMAP_PROVIDERS: BasemapConfig[] = [
  {
    id: 'google_roadmap',
    name: 'Google Maps Roadmap (Full Color)',
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
    name: 'OpenStreetMap Standard (Color)',
    category: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
    thumbnail: 'https://a.tile.openstreetmap.org/13/4093/2723.png',
  },
  {
    id: 'osm_hot',
    name: 'OSM Humanitarian HOT (Color)',
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

export const getBasemapCategoryBadge = (category: string) => {
  switch (category) {
    case 'Google':
      return { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-600' };
    case 'OpenStreetMap':
      return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-600' };
    case 'Esri':
      return { bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-600' };
    default:
      return { bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-600' };
  }
};

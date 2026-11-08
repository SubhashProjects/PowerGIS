// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// DOMAIN TYPES: MULTI-BASEMAP ENGINE, LAYERS, MEASUREMENT & SPATIAL SEARCH
// ============================================================================

export type BasemapProviderId =
  | 'google_roadmap'
  | 'google_satellite'
  | 'google_hybrid'
  | 'google_terrain'
  | 'osm_standard'
  | 'osm_hot'
  | 'esri_imagery'
  | 'esri_topo';

export interface BasemapConfig {
  id: BasemapProviderId;
  name: string;
  category: 'Google' | 'OpenStreetMap' | 'Esri';
  url: string;
  subdomains?: string[];
  maxZoom: number;
  attribution: string;
  thumbnail: string;
}

export type GISOverlayLayerId =
  | 'substations'
  | 'feeders_ht_22kv'
  | 'feeders_11kv'
  | 'network_lt'
  | 'transformers'
  | 'poles_ht'
  | 'poles_lt'
  | 'poles_street'
  | 'conductors'
  | 'streetlights'
  | 'consumers_smart'
  | 'consumers_conventional'
  | 'fault_locations'
  | 'projects'
  | 'survey_staging'
  | 'outage_polygons'
  | 'section_boundaries'
  | 'division_boundaries';

export interface GISLayerState {
  id: GISOverlayLayerId;
  name: string;
  category: 'Assets' | 'Network' | 'Customers' | 'Operations' | 'Boundaries';
  color: string;
  visible: boolean;
  opacity: number;
  count: number;
}

export interface MapMeasurement {
  mode: 'none' | 'distance' | 'area';
  points: [number, number][];
  totalDistanceM: number;
  totalAreaSqM: number;
}

export interface SpatialSearchFilter {
  query: string;
  region: string;
  division: string;
  section: string;
  feeder: string;
  assetType: 'all' | 'substation' | 'feeder' | 'transformer' | 'pole' | 'consumer';
  status: string;
}

// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// APP CONFIGURATION & SINGLE SOURCE OF TRUTH (SSOT)
// Change once, reflects everywhere across the entire application.
// ============================================================================

export interface RegionalEnclave {
  id: string;
  name: string;
  code: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
  substationsCount: number;
  feedersCount: number;
  dtCount: number;
  consumersCount: number;
  description: string;
}

export const APP_CONFIG = {
  // Identity
  name: 'PowerGIS Enterprise',
  shortName: 'PowerGIS',
  version: '2.0.0-PROD',
  edition: 'Enterprise Color Edition',
  tagline: 'Utility Planning, Asset Management, SCADA & Field Operations',
  copyrightYear: 2026,

  // Territory & Grid Boundaries
  stateJurisdiction: 'Puducherry Union Territory',
  headquarters: '137, Subbiah Salai, Puducherry - 605001',
  defaultRegionId: 'reg-pdy',
  defaultCenter: [11.9360, 79.8250] as [number, number],
  defaultZoom: 13,
  minZoom: 10,
  maxZoom: 21,

  // Regional Enclaves (The 4 Non-Contiguous Coastal Enclaves)
  regions: {
    'reg-pdy': {
      id: 'reg-pdy',
      name: 'Puducherry (Urban & Rural Enclave)',
      code: 'PDY',
      center: [11.9360, 79.8250],
      zoom: 13,
      substationsCount: 8,
      feedersCount: 8,
      dtCount: 7,
      consumersCount: 125000,
      description: 'Main Territory & Primary Load Center (Marapalam, Villianur, Lawspet)',
    },
    'reg-kkl': {
      id: 'reg-kkl',
      name: 'Karaikal (Southern Coastal Enclave)',
      code: 'KKL',
      center: [10.9254, 79.8380],
      zoom: 13,
      substationsCount: 4,
      feedersCount: 4,
      dtCount: 4,
      consumersCount: 42000,
      description: 'Port & Delta Agriculture Enclave (130 km South of Puducherry)',
    },
    'reg-mhe': {
      id: 'reg-mhe',
      name: 'Mahe (Western Malabar Coast Enclave)',
      code: 'MHE',
      center: [11.7002, 75.5340],
      zoom: 14,
      substationsCount: 2,
      feedersCount: 2,
      dtCount: 2,
      consumersCount: 16000,
      description: 'Arabian Sea Coastal Enclave (600 km West, enclosed by Kerala)',
    },
    'reg-ynm': {
      id: 'reg-ynm',
      name: 'Yanam (East Godavari River Enclave)',
      code: 'YNM',
      center: [16.7330, 82.2170],
      zoom: 14,
      substationsCount: 2,
      feedersCount: 2,
      dtCount: 2,
      consumersCount: 18500,
      description: 'Godavari Delta Enclave (850 km North-East, enclosed by AP)',
    },
  } as Record<string, RegionalEnclave>,

  // Operational Timing & Watcher Cycles (Milliseconds)
  intervals: {
    clockUpdateMs: 1000,         // UTC / IST header clock
    slaCountdownMs: 10000,       // Fault SLA countdown update
    scadaTelemetryMs: 5000,      // Simulated IEC-104 SCADA point flutter
    networkPingMs: 30000,        // Zero-trust RLS connection heartbeat
  },

  // Security Policies
  security: {
    universalTestPassword: 'PowerGIS@2026',
    tokenExpiryHours: 8,
    requireInterlockConfirmation: true, // SBO remote breaker interlock
  },
} as const;

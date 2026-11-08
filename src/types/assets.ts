// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// DOMAIN TYPES: ELECTRICAL ASSETS, WARRANTIES & LIFECYCLE
// ============================================================================

export type VoltageClass = '230kV' | '110kV' | '66kV' | '33kV' | '22kV' | '11kV' | 'LT 415V';
export type AssetCondition = 'Good' | 'Fair' | 'Poor' | 'Critical';
export type AssetOperationalStatus = 'operational' | 'maintenance' | 'faulty' | 'decommissioned' | 'proposed';

export interface Substation {
  id: string;
  code: string;
  name: string;
  voltageClass: VoltageClass;
  capacityMVA: number;
  numFeeders: number;
  regionId: string;
  divisionId?: string;
  sectionId?: string;
  status: AssetOperationalStatus;
  commissionDate: string;
  coordinates: [number, number]; // [lat, lng]
}

export interface Feeder {
  id: string;
  code: string;
  name: string;
  substationId: string;
  voltageClass: VoltageClass;
  conductorType: string;
  lengthKm: number;
  peakLoadAmps: number;
  ratedCapacityAmps: number;
  regionId: string;
  divisionId?: string;
  sectionId?: string;
  isEnergized: boolean;
  status: AssetOperationalStatus;
  coordinates: [number, number][]; // LineString
}

export interface Transformer {
  id: string;
  code: string;
  name: string;
  feederId: string;
  capacityKVA: number;
  voltageRatio: string;
  make: string;
  serialNumber: string;
  installationDate: string;
  loadPercentage: number;
  oilLevelPct: number;
  hasOilLeakage: boolean;
  phaseImbalancePct: number;
  regionId: string;
  divisionId?: string;
  sectionId: string;
  jeJurisdictionId?: string;
  status: AssetOperationalStatus;
  coordinates: [number, number];
}

export interface Pole {
  id: string;
  code: string;
  poleNumber: string;
  poleType: string; // 'PSCC 9m', 'Steel Tubular 11m', 'Rail Pole'
  material: string;
  heightMeters: number;
  feederId: string;
  transformerId?: string;
  numInsulators: number;
  condition: AssetCondition;
  hasStreetlight: boolean;
  installationDate: string;
  regionId: string;
  divisionId?: string;
  sectionId: string;
  jeJurisdictionId?: string;
  status: AssetOperationalStatus;
  coordinates: [number, number];
}

export interface Conductor {
  id: string;
  code: string;
  feederId: string;
  startPoleId: string;
  endPoleId: string;
  conductorType: string;
  voltageClass: VoltageClass;
  lengthMeters: number;
  ratedCurrentAmps: number;
  condition: AssetCondition;
  coordinates: [number, number][];
}

export interface Streetlight {
  id: string;
  code: string;
  poleId: string;
  lampType: string;
  wattage: number;
  workingCondition: 'Working' | 'Defective';
  installationDate: string;
  sectionId: string;
}

export interface Consumer {
  id: string;
  consumerNumber: string;
  accountNumber: string;
  name: string;
  address: string;
  category: 'Domestic' | 'Commercial' | 'Industrial' | 'Agricultural';
  sanctionedLoadKW: number;
  poleId?: string;
  transformerId?: string;
  feederId?: string;
  meterNumber: string;
  isSmartMeter: boolean;
  meterMake: string;
  meterInstallDate: string;
  status: 'active' | 'disconnected' | 'temporary';
  regionId: string;
  divisionId?: string;
  sectionId: string;
  jeJurisdictionId?: string;
  coordinates: [number, number];
}

export interface WarrantyRecord {
  id: string;
  batchNumber?: string;
  equipmentType: 'Transformer' | 'Pole' | 'Smart Meter' | 'Conductor' | 'Streetlight';
  equipmentId: string;
  equipmentCode: string;
  manufacturer: string;
  commencementDate: string;
  expiryDate: string;
  daysToExpiry: number;
  claimStatus: 'active' | 'expiring_soon' | 'expired' | 'claimed';
}

export interface EquipmentLifecycleRecord {
  id: string;
  assetType: string;
  assetId: string;
  assetCode: string;
  installationDate: string;
  expectedLifeYears: number;
  currentAgeYears: number;
  conditionScore: number;
  replacementPriority: 'Critical' | 'High' | 'Medium' | 'Low';
  isExpired: boolean;
  sectionId: string;
}

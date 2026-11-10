// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// FAULT MANAGEMENT & SPATIAL DISTANCE ENGINE
// ============================================================================

import { Fault, FaultStatus } from '../types/operations';
import { initialFaults, initialSections } from './mockData';
import { assetService } from './assetService';
import { calculateHaversineDistance, calculateDistanceAlongFeeder } from '../lib/geoUtils';
import { authService } from './authService';

export class FaultService {
  private static instance: FaultService;
  private simulatedFaults: Fault[] = [...initialFaults];
  private userFaults: Fault[] = [];

  private constructor() {}

  public static getInstance(): FaultService {
    if (!FaultService.instance) {
      FaultService.instance = new FaultService();
    }
    return FaultService.instance;
  }

  public getFaults(includeSimulated = false): Fault[] {
    const list = (assetService.isSimulatorMode() || includeSimulated)
      ? [...this.userFaults, ...this.simulatedFaults]
      : [...this.userFaults];
    return list.filter(f => (f as any).isUserUploaded || authService.isWithinJurisdiction(f));
  }

  public getFaultById(id: string): Fault | undefined {
    return this.userFaults.find(f => f.id === id) || this.simulatedFaults.find(f => f.id === id);
  }

  public calculateFaultDistances(
    point: [number, number],
    feederId?: string,
    sectionId?: string
  ) {
    // 1. Find nearest pole
    let nearestPoleId: string | undefined;
    let nearestPoleCode: string | undefined;
    let minPoleDist = Infinity;

    const poles = assetService.getPoles().length > 0
      ? assetService.getPoles()
      : assetService.getPoles(true);

    poles.forEach(p => {
      const d = calculateHaversineDistance(point[0], point[1], p.coordinates[0], p.coordinates[1]);
      if (d < minPoleDist) {
        minPoleDist = d;
        nearestPoleId = p.id;
        nearestPoleCode = p.code;
      }
    });

    // 2. Find nearest DT
    let nearestDtId: string | undefined;
    let nearestDtCode: string | undefined;
    let minDtDist = Infinity;

    const transformers = assetService.getTransformers().length > 0
      ? assetService.getTransformers()
      : assetService.getTransformers(true);

    transformers.forEach(t => {
      const d = calculateHaversineDistance(point[0], point[1], t.coordinates[0], t.coordinates[1]);
      if (d < minDtDist) {
        minDtDist = d;
        nearestDtId = t.id;
        nearestDtCode = t.code;
      }
    });

    // 3. Calculate distance along feeder
    let distanceAlongFeederM: number | undefined;
    if (feederId) {
      const feeder = assetService.getFeederById(feederId);
      if (feeder && feeder.coordinates.length > 1) {
        const res = calculateDistanceAlongFeeder(point, feeder.coordinates);
        distanceAlongFeederM = res.distanceAlongM;
      }
    }

    // 4. Distance to section office
    let distanceToOfficeKm: number | undefined;
    const targetSection = initialSections.find(s => s.id === (sectionId || 'sec-mara'));
    if (targetSection) {
      const d = calculateHaversineDistance(point[0], point[1], targetSection.latitude, targetSection.longitude);
      distanceToOfficeKm = Math.round((d / 1000) * 10) / 10;
    }

    return {
      nearestPoleId,
      nearestPoleCode,
      distanceFromPoleM: minPoleDist !== Infinity ? Math.round(minPoleDist * 10) / 10 : undefined,
      nearestDtId,
      nearestDtCode,
      distanceFromDtM: minDtDist !== Infinity ? Math.round(minDtDist * 10) / 10 : undefined,
      distanceAlongFeederM,
      distanceFromOfficeKm: distanceToOfficeKm,
    };
  }

  public registerFault(newFaultData: Omit<Fault, 'id' | 'faultCode' | 'reportedAt' | 'distanceFromPoleM' | 'distanceFromDtM' | 'distanceAlongFeederM' | 'distanceFromOfficeKm'>): Fault {
    const calc = this.calculateFaultDistances(
      newFaultData.coordinates,
      newFaultData.feederId,
      newFaultData.sectionId
    );

    const fault: Fault = {
      ...newFaultData,
      id: `flt-${Date.now()}`,
      faultCode: `FLT-2026-${String(this.userFaults.length + this.simulatedFaults.length + 1).padStart(4, '0')}`,
      reportedAt: new Date().toISOString(),
      distanceFromPoleM: calc.distanceFromPoleM,
      distanceFromDtM: calc.distanceFromDtM,
      distanceAlongFeederM: calc.distanceAlongFeederM,
      distanceFromOfficeKm: calc.distanceFromOfficeKm,
    };
    (fault as any).isUserUploaded = true;

    this.userFaults.unshift(fault);
    return fault;
  }

  public updateFaultStatus(id: string, status: FaultStatus, assignedTo?: string): void {
    const fault = this.getFaultById(id);
    if (fault) {
      fault.status = status;
      if (assignedTo) fault.assignedTo = assignedTo;
      if (status === 'closed' || status === 'completed') {
        fault.resolvedAt = new Date().toISOString();
      }
    }
  }
}

export const faultService = FaultService.getInstance();

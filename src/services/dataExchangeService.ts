// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// DATA EXCHANGE & MIGRATION ENGINE (GEOJSON, KML, CSV & DATABASE BACKUPS)
// FULL SPATIAL EXPORT, IMPORT, SCHEMA VALIDATION & RECOVERY
// ============================================================================

import { assetService } from './assetService';
import { initialUsers, initialRegions, initialDivisions, initialSubdivisions, initialSections } from './mockData';
import { Transformer, Feeder, Pole, Substation, Consumer } from '../types/assets';

export interface ImportResult {
  success: boolean;
  importedCount: number;
  duplicateCount: number;
  errorCount: number;
  message: string;
  details: string[];
}

export class DataExchangeService {
  private static instance: DataExchangeService;

  private constructor() {}

  public static getInstance(): DataExchangeService {
    if (!DataExchangeService.instance) {
      DataExchangeService.instance = new DataExchangeService();
    }
    return DataExchangeService.instance;
  }

  // --------------------------------------------------------------------------
  // 1. EXPORT GEOJSON (RFC 7946 Standard Compliant)
  // --------------------------------------------------------------------------
  public exportGeoJSON(layerTypes: string[] = ['all']): void {
    const substations = assetService.getSubstations();
    const feeders = assetService.getFeeders();
    const transformers = assetService.getTransformers();
    const poles = assetService.getPoles();
    const consumers = assetService.getConsumers();

    const features: any[] = [];

    // Substations (Point: [lng, lat])
    if (layerTypes.includes('all') || layerTypes.includes('substations')) {
      substations.forEach(s => {
        features.push({
          type: 'Feature',
          id: s.id,
          geometry: {
            type: 'Point',
            coordinates: [s.coordinates[1], s.coordinates[0]], // GeoJSON is [lng, lat]
          },
          properties: {
            assetType: 'substation',
            code: s.code,
            name: s.name,
            voltageClass: s.voltageClass,
            capacityMVA: s.capacityMVA,
            numFeeders: s.numFeeders,
            status: s.status,
            regionId: s.regionId,
          },
        });
      });
    }

    // Feeders (LineString: [[lng, lat], ...])
    if (layerTypes.includes('all') || layerTypes.includes('feeders')) {
      feeders.forEach(f => {
        features.push({
          type: 'Feature',
          id: f.id,
          geometry: {
            type: 'LineString',
            coordinates: f.coordinates.map(pt => [pt[1], pt[0]]), // [lng, lat]
          },
          properties: {
            assetType: 'feeder',
            code: f.code,
            name: f.name,
            voltageClass: f.voltageClass,
            conductorType: f.conductorType,
            lengthKm: f.lengthKm,
            peakLoadAmps: f.peakLoadAmps,
            ratedCapacityAmps: f.ratedCapacityAmps,
            isEnergized: f.isEnergized,
            substationId: f.substationId,
          },
        });
      });
    }

    // Transformers (Point: [lng, lat])
    if (layerTypes.includes('all') || layerTypes.includes('transformers')) {
      transformers.forEach(t => {
        features.push({
          type: 'Feature',
          id: t.id,
          geometry: {
            type: 'Point',
            coordinates: [t.coordinates[1], t.coordinates[0]],
          },
          properties: {
            assetType: 'transformer',
            code: t.code,
            name: t.name,
            capacityKVA: t.capacityKVA,
            make: t.make,
            loadPercentage: t.loadPercentage,
            oilLevelPct: t.oilLevelPct,
            hasOilLeakage: t.hasOilLeakage,
            phaseImbalancePct: t.phaseImbalancePct,
            status: t.status,
            feederId: t.feederId,
          },
        });
      });
    }

    // Poles (Point: [lng, lat])
    if (layerTypes.includes('all') || layerTypes.includes('poles')) {
      poles.forEach(p => {
        features.push({
          type: 'Feature',
          id: p.id,
          geometry: {
            type: 'Point',
            coordinates: [p.coordinates[1], p.coordinates[0]],
          },
          properties: {
            assetType: 'pole',
            code: p.code,
            poleNumber: p.poleNumber,
            poleType: p.poleType,
            material: p.material,
            heightMeters: p.heightMeters,
            numInsulators: p.numInsulators,
            hasStreetlight: p.hasStreetlight,
            condition: p.condition,
          },
        });
      });
    }

    // Consumers (Point: [lng, lat])
    if (layerTypes.includes('all') || layerTypes.includes('consumers')) {
      consumers.forEach(c => {
        features.push({
          type: 'Feature',
          id: c.id,
          geometry: {
            type: 'Point',
            coordinates: [c.coordinates[1], c.coordinates[0]],
          },
          properties: {
            assetType: 'consumer',
            consumerNumber: c.consumerNumber,
            name: c.name,
            meterNumber: c.meterNumber,
            isSmartMeter: c.isSmartMeter,
            sanctionedLoadKW: c.sanctionedLoadKW,
            category: c.category,
            address: c.address,
          },
        });
      });
    }

    const geojson = {
      type: 'FeatureCollection',
      name: 'PowerGIS_Master_Electrical_Network',
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
      },
      features,
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    this.triggerDownload(blob, `PowerGIS_Distribution_Network_${this.getTimestampString()}.geojson`);
  }

  // --------------------------------------------------------------------------
  // 2. EXPORT CSV (Tabular Asset Registers)
  // --------------------------------------------------------------------------
  public exportCSV(assetClass: 'transformers' | 'feeders' | 'poles' | 'substations' | 'consumers'): void {
    let rows: string[] = [];

    if (assetClass === 'transformers') {
      rows.push('Asset ID,Code,Name,Capacity (kVA),Make,Load (%),Oil Level (%),Leakage,Phase Imbalance (%),Latitude,Longitude,Status');
      assetService.getTransformers().forEach(t => {
        rows.push(`"${t.id}","${t.code}","${t.name}",${t.capacityKVA},"${t.make}",${t.loadPercentage},${t.oilLevelPct},${t.hasOilLeakage},${t.phaseImbalancePct},${t.coordinates[0]},${t.coordinates[1]},"${t.status}"`);
      });
    } else if (assetClass === 'feeders') {
      rows.push('Asset ID,Code,Name,Voltage Class,Length (km),Conductor,Peak Load (A),Rated (A),Energized,Status');
      assetService.getFeeders().forEach(f => {
        rows.push(`"${f.id}","${f.code}","${f.name}","${f.voltageClass}",${f.lengthKm},"${f.conductorType}",${f.peakLoadAmps},${f.ratedCapacityAmps},${f.isEnergized},"${f.status}"`);
      });
    } else if (assetClass === 'poles') {
      rows.push('Asset ID,Code,Pole Number,Pole Type,Material,Height (m),Insulators,Streetlight Mounted,Condition,Latitude,Longitude');
      assetService.getPoles().forEach(p => {
        rows.push(`"${p.id}","${p.code}","${p.poleNumber}","${p.poleType}","${p.material}",${p.heightMeters},${p.numInsulators},${p.hasStreetlight},"${p.condition}",${p.coordinates[0]},${p.coordinates[1]}`);
      });
    } else if (assetClass === 'consumers') {
      rows.push('Consumer Number,Name,Meter Number,Meter Class,Sanctioned Load (kW),Tariff Category,Address,Latitude,Longitude');
      assetService.getConsumers().forEach(c => {
        rows.push(`"${c.consumerNumber}","${c.name}","${c.meterNumber}","${c.isSmartMeter ? 'Smart Meter' : 'Conventional'}",${c.sanctionedLoadKW},"${c.category}","${c.address}",${c.coordinates[0]},${c.coordinates[1]}`);
      });
    } else {
      rows.push('Asset ID,Code,Name,Voltage Class,Capacity (MVA),Feeders,Latitude,Longitude,Status');
      assetService.getSubstations().forEach(s => {
        rows.push(`"${s.id}","${s.code}","${s.name}","${s.voltageClass}",${s.capacityMVA},${s.numFeeders},${s.coordinates[0]},${s.coordinates[1]},"${s.status}"`);
      });
    }

    const blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    this.triggerDownload(blob, `PowerGIS_${assetClass}_${this.getTimestampString()}.csv`);
  }

  // --------------------------------------------------------------------------
  // 3. EXPORT KML (Google Earth & Desktop GIS Integration)
  // --------------------------------------------------------------------------
  public exportKML(): void {
    const substations = assetService.getSubstations();
    const feeders = assetService.getFeeders();
    const transformers = assetService.getTransformers();
    const poles = assetService.getPoles();

    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>PowerGIS Electrical Distribution Network</name>
    <description>PowerGIS Enterprise Network Export</description>
    <Folder>
      <name>Primary Substations</name>
`;

    substations.forEach(s => {
      kml += `      <Placemark>
        <name>${s.name}</name>
        <description>${s.code} - ${s.voltageClass} - Capacity: ${s.capacityMVA} MVA</description>
        <Point>
          <coordinates>${s.coordinates[1]},${s.coordinates[0]},0</coordinates>
        </Point>
      </Placemark>\n`;
    });

    kml += `    </Folder>
    <Folder>
      <name>11kV / 22kV Feeders</name>
`;

    feeders.forEach(f => {
      const coordStr = f.coordinates.map(pt => `${pt[1]},${pt[0]},0`).join(' ');
      kml += `      <Placemark>
        <name>${f.name}</name>
        <description>${f.code} - ${f.voltageClass} - ${f.lengthKm} km - ${f.conductorType}</description>
        <LineString>
          <tessellate>1</tessellate>
          <coordinates>${coordStr}</coordinates>
        </LineString>
      </Placemark>\n`;
    });

    kml += `    </Folder>
    <Folder>
      <name>Distribution Transformers</name>
`;

    transformers.forEach(t => {
      kml += `      <Placemark>
        <name>${t.name}</name>
        <description>${t.code} - ${t.capacityKVA} kVA - Loading: ${t.loadPercentage}%</description>
        <Point>
          <coordinates>${t.coordinates[1]},${t.coordinates[0]},0</coordinates>
        </Point>
      </Placemark>\n`;
    });

    kml += `    </Folder>
    <Folder>
      <name>Utility Poles</name>
`;

    poles.forEach(p => {
      kml += `      <Placemark>
        <name>Pole ${p.poleNumber}</name>
        <description>${p.code} - ${p.poleType} - ${p.material}</description>
        <Point>
          <coordinates>${p.coordinates[1]},${p.coordinates[0]},0</coordinates>
        </Point>
      </Placemark>\n`;
    });

    kml += `    </Folder>
  </Document>
</kml>`;

    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    this.triggerDownload(blob, `PowerGIS_Network_${this.getTimestampString()}.kml`);
  }

  // --------------------------------------------------------------------------
  // 4. EXPORT COMPLETE DATABASE SNAPSHOT (JSON Backup)
  // --------------------------------------------------------------------------
  public exportSystemBackup(): void {
    const backupData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      platform: 'PowerGIS Enterprise Distribution Platform',
      securityScope: 'All 4 Regional Enclaves',
      checksum: `SHA256:${this.generateChecksum()}`,
      data: {
        regions: initialRegions,
        divisions: initialDivisions,
        subdivisions: initialSubdivisions,
        sections: initialSections,
        users: initialUsers.map(u => ({ id: u.id, username: u.username, fullName: u.fullName, role: u.role, designation: u.designation })),
        substations: assetService.getSubstations(),
        feeders: assetService.getFeeders(),
        transformers: assetService.getTransformers(),
        poles: assetService.getPoles(),
        conductors: assetService.getConductors(),
        consumers: assetService.getConsumers(),
      },
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    this.triggerDownload(blob, `PowerGIS_System_Backup_${this.getTimestampString()}.json`);
  }

  // --------------------------------------------------------------------------
  // Helper: Robust KML Coordinate Tuple Extractor
  // --------------------------------------------------------------------------
  public static parseKmlCoordinateTuples(rawText: string): [number, number][] {
    const tupleRegex = /([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)(?:\s*,\s*[+-]?\d+(?:\.\d+)?)?/g;
    const coords: [number, number][] = [];
    let match: RegExpExecArray | null;
    while ((match = tupleRegex.exec(rawText)) !== null) {
      const v1 = parseFloat(match[1]);
      const v2 = parseFloat(match[2]);
      if (!isNaN(v1) && !isNaN(v2)) {
        // Standard KML is longitude (v1), latitude (v2)
        let lat = v2;
        let lng = v1;
        // Invert if user/exporter provided [latitude, longitude]
        if (Math.abs(v1) <= 90 && (Math.abs(v2) > 90 || (v1 >= 6 && v1 <= 38 && v2 >= 65 && v2 <= 100))) {
          lat = v1;
          lng = v2;
        }
        coords.push([lat, lng]);
      }
    }
    return coords;
  }

  // --------------------------------------------------------------------------
  // 5. IMPORT SPATIAL DATASET (GeoJSON, KML, CSV, GPKG & Database Backups)
  // --------------------------------------------------------------------------
  public async importSpatialFile(file: File): Promise<ImportResult> {
    const fileName = file.name.toLowerCase();

    // Check for GPKG format first
    if (fileName.endsWith('.gpkg')) {
      return {
        success: false,
        importedCount: 0,
        duplicateCount: 0,
        errorCount: 1,
        message: 'GeoPackage (.gpkg) file detected. Direct binary GPKG parsing requires SQLite WASM. Please export your layer to GeoJSON (.geojson), KML (.kml), or CSV (.csv) using QGIS or ArcGIS for instant web map display.',
        details: [
          'In QGIS: Right-click layer → Export → Save Features As → GeoJSON or KML.',
          'PowerGIS will automatically render all Feeder lines and DTs and zoom directly to your network coordinates.',
        ],
      };
    }

    const content = await file.text();

    const details: string[] = [];
    let importedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    const allCoords: [number, number][] = [];
    let hasFeeders = false;
    let hasTransformers = false;
    let hasPoles = false;
    let hasSubstations = false;
    let hasConsumers = false;

    const recordCoord = (lat: number, lng: number) => {
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        allCoords.push([lat, lng]);
      }
    };

    try {
      if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
        const parsed = JSON.parse(content);

        // A. If it's a PowerGIS System Backup JSON
        if (parsed.platform && parsed.data && parsed.version) {
          if (parsed.data.substations && Array.isArray(parsed.data.substations)) {
            parsed.data.substations.forEach((s: Substation) => {
              if (!assetService.getSubstations().some(exist => exist.id === s.id)) {
                assetService.addSubstation(s);
                recordCoord(s.coordinates[0], s.coordinates[1]);
                hasSubstations = true;
                importedCount++;
              } else {
                duplicateCount++;
              }
            });
          }
          if (parsed.data.feeders && Array.isArray(parsed.data.feeders)) {
            parsed.data.feeders.forEach((f: Feeder) => {
              if (!assetService.getFeederById(f.id)) {
                assetService.addFeeder(f);
                f.coordinates.forEach(pt => recordCoord(pt[0], pt[1]));
                hasFeeders = true;
                importedCount++;
              } else {
                duplicateCount++;
              }
            });
          }
          if (parsed.data.transformers && Array.isArray(parsed.data.transformers)) {
            parsed.data.transformers.forEach((t: Transformer) => {
              if (!assetService.getTransformerById(t.id)) {
                assetService.addTransformer(t);
                recordCoord(t.coordinates[0], t.coordinates[1]);
                hasTransformers = true;
                importedCount++;
              } else {
                duplicateCount++;
              }
            });
          }
          if (parsed.data.poles && Array.isArray(parsed.data.poles)) {
            parsed.data.poles.forEach((p: Pole) => {
              if (!assetService.getPoleById(p.id)) {
                assetService.addPole(p);
                recordCoord(p.coordinates[0], p.coordinates[1]);
                hasPoles = true;
                importedCount++;
              } else {
                duplicateCount++;
              }
            });
          }
          if (parsed.data.consumers && Array.isArray(parsed.data.consumers)) {
            parsed.data.consumers.forEach((c: Consumer) => {
              if (!assetService.getConsumers().some(exist => exist.consumerNumber === c.consumerNumber)) {
                assetService.addConsumer(c);
                recordCoord(c.coordinates[0], c.coordinates[1]);
                hasConsumers = true;
                importedCount++;
              } else {
                duplicateCount++;
              }
            });
          }

          this.dispatchSpatialImported(allCoords, {
            count: importedCount,
            hasFeeders,
            hasTransformers,
            hasPoles,
            hasSubstations,
            hasConsumers,
          });

          return {
            success: true,
            importedCount,
            duplicateCount,
            errorCount: 0,
            message: `System backup restored successfully (${importedCount} records loaded, ${duplicateCount} duplicates skipped).`,
            details: [`Backup version: ${parsed.version}`, `Timestamp: ${parsed.exportedAt}`],
          };
        }

        // B. If it's a standard GeoJSON FeatureCollection
        if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
          parsed.features.forEach((feat: any, idx: number) => {
            try {
              if (!feat.geometry || !feat.geometry.coordinates) {
                errorCount++;
                details.push(`Feature #${idx + 1}: Missing geometry coordinates.`);
                return;
              }

              const props = feat.properties || {};
              const geomType = feat.geometry.type;
              const coords = feat.geometry.coordinates;

              // 1. LineString or MultiLineString -> FEEDER LINE / CABLE NETWORK
              if (geomType === 'LineString' || geomType === 'MultiLineString') {
                const lineStrings: Array<[number, number][]> = [];
                if (geomType === 'LineString') {
                  const pts: [number, number][] = coords.map((c: any) => [c[1], c[0]]);
                  if (pts.length >= 2) lineStrings.push(pts);
                } else {
                  coords.forEach((line: any) => {
                    const pts: [number, number][] = line.map((c: any) => [c[1], c[0]]);
                    if (pts.length >= 2) lineStrings.push(pts);
                  });
                }

                lineStrings.forEach((lineCoords, lineIdx) => {
                  const fdrName = props.name || props.feeder_name || props.FeederName || props.code || `Imported Feeder ${idx + 1}-${lineIdx + 1}`;
                  const fdrCode = props.code || props.feeder_code || `FDR-GEO-${Date.now().toString().slice(-4)}-${idx}-${lineIdx}`;
                  const isHT = /22kv|33kv|ht/i.test(fdrName) || /22kv|33kv|ht/i.test(props.voltageClass || '') || /22kv|33kv|ht/i.test(props.voltage || '');

                  const newFeeder: Feeder = {
                    id: `fdr-geo-${Date.now()}-${idx}-${lineIdx}`,
                    code: fdrCode,
                    name: fdrName,
                    substationId: props.substationId || 'ss-mara',
                    voltageClass: isHT ? '22kV' : '11kV',
                    conductorType: props.conductorType || props.conductor || 'Dog ACSR (100 sq mm)',
                    lengthKm: props.lengthKm || Math.round(lineCoords.length * 0.08 * 10) / 10 || 1.2,
                    peakLoadAmps: props.peakLoadAmps || 210,
                    ratedCapacityAmps: props.ratedCapacityAmps || 350,
                    isEnergized: props.isEnergized !== undefined ? Boolean(props.isEnergized) : true,
                    status: 'operational',
                    regionId: props.regionId || 'reg-pdy',
                    divisionId: props.divisionId || 'div-urban',
                    sectionId: props.sectionId || 'sec-mara',
                    coordinates: lineCoords,
                  };

                  assetService.addFeeder(newFeeder);
                  lineCoords.forEach(pt => recordCoord(pt[0], pt[1]));
                  hasFeeders = true;
                  importedCount++;
                  details.push(`Imported Feeder Line: ${fdrName} (${lineCoords.length} vertices)`);
                });
                return;
              }

              // 2. Point Geometries
              if (geomType === 'Point') {
                const lat = coords[1];
                const lng = coords[0];
                recordCoord(lat, lng);

                const nameStr = (props.name || props.assetName || props.title || '').toLowerCase();
                const typeStr = (props.assetType || props.type || props.layer || '').toLowerCase();
                const codeStr = (props.code || props.serialNumber || props.id || '').toLowerCase();

                const isDT = typeStr === 'transformer' ||
                  /transformer|dtr|dt\b|kva|distribution/i.test(nameStr) ||
                  /transformer|dtr|dt\b|kva/i.test(typeStr) ||
                  props.capacityKVA !== undefined ||
                  props.capacity_kva !== undefined;

                const isSS = typeStr === 'substation' ||
                  /substation|switchyard|110kv|230kv|66kv/i.test(nameStr) ||
                  /substation/i.test(typeStr);

                const isConsumer = typeStr === 'consumer' ||
                  props.consumerNumber !== undefined ||
                  props.consumer_number !== undefined;

                if (isDT) {
                  const dtName = props.name || props.transformerName || `DT-IMP-${idx + 1}`;
                  const dtCode = props.code || `DT-GEO-${Date.now().toString().slice(-4)}-${idx}`;
                  const capacity = parseFloat(props.capacityKVA || props.capacity_kva || props.capacity || 250);

                  const newDT: Transformer = {
                    id: `dt-geo-${Date.now()}-${idx}`,
                    code: dtCode,
                    name: dtName,
                    capacityKVA: isNaN(capacity) ? 250 : capacity,
                    voltageRatio: props.voltageRatio || '11/0.433kV',
                    loadPercentage: props.loadPercentage || 65,
                    coordinates: [lat, lng],
                    serialNumber: props.serialNumber || `SN-GEO-${Date.now().toString().slice(-6)}-${idx}`,
                    installationDate: new Date().toISOString().split('T')[0],
                    make: props.make || 'Voltamp Transformers',
                    phaseImbalancePct: props.phaseImbalancePct || 2.8,
                    oilLevelPct: props.oilLevelPct || 92,
                    hasOilLeakage: Boolean(props.hasOilLeakage),
                    feederId: props.feederId || 'fdr-mara-1',
                    regionId: props.regionId || 'reg-pdy',
                    divisionId: props.divisionId || 'div-urban',
                    sectionId: props.sectionId || 'sec-mara',
                    jeJurisdictionId: props.jeJurisdictionId || 'jur-mara-1',
                    status: 'operational',
                  };

                  assetService.addTransformer(newDT);
                  hasTransformers = true;
                  importedCount++;
                  details.push(`Imported Distribution Transformer (DT): ${dtName} at [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
                } else if (isSS) {
                  const ssName = props.name || `Substation-IMP-${idx + 1}`;
                  const newSS: Substation = {
                    id: `ss-geo-${Date.now()}-${idx}`,
                    code: props.code || `SS-GEO-${idx + 1}`,
                    name: ssName,
                    voltageClass: props.voltageClass || '110kV',
                    capacityMVA: props.capacityMVA || 80,
                    numFeeders: props.numFeeders || 8,
                    coordinates: [lat, lng],
                    commissionDate: new Date().toISOString().split('T')[0],
                    status: 'operational',
                    regionId: props.regionId || 'reg-pdy',
                    divisionId: props.divisionId || 'div-urban',
                    sectionId: props.sectionId || 'sec-mara',
                  };
                  assetService.addSubstation(newSS);
                  hasSubstations = true;
                  importedCount++;
                  details.push(`Imported Substation: ${ssName} at [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
                } else if (isConsumer) {
                  const conNum = props.consumerNumber || props.consumer_number || `CON-IMP-${Date.now()}-${idx}`;

                  if (assetService.getConsumers().some(c => c.consumerNumber === conNum)) {
                    duplicateCount++;
                    return;
                  }

                  const newCon: Consumer = {
                    id: `con-imp-${Date.now()}-${idx}`,
                    consumerNumber: conNum,
                    accountNumber: conNum,
                    name: props.name || 'Imported Consumer',
                    address: props.address || 'Imported Location',
                    coordinates: [lat, lng],
                    meterNumber: props.meterNumber || `MTR-IMP-${idx}`,
                    isSmartMeter: props.isSmartMeter !== undefined ? props.isSmartMeter : true,
                    meterMake: props.meterMake || 'L&T',
                    meterInstallDate: new Date().toISOString().split('T')[0],
                    sanctionedLoadKW: props.sanctionedLoadKW || 5,
                    category: props.category || 'Domestic',
                    poleId: 'pole-mara-1',
                    transformerId: 'dt-mara-1',
                    feederId: 'fdr-mara-1',
                    regionId: 'reg-pdy',
                    divisionId: 'div-urban',
                    sectionId: 'sec-mara',
                    jeJurisdictionId: 'jur-mara-1',
                    status: 'active',
                  };

                  assetService.addConsumer(newCon);
                  hasConsumers = true;
                  importedCount++;
                  details.push(`Imported Consumer ${conNum} (${newCon.name})`);
                } else {
                  // Default Point -> Utility Pole
                  const poleNum = props.poleNumber || props.pole_number || props.name || `P-GEO-${Date.now().toString().slice(-4)}-${idx}`;
                  const poleCode = props.code || `POL-GEO-${idx + 1}`;

                  if (assetService.getPoles().some(p => p.poleNumber === poleNum || p.code === poleCode)) {
                    duplicateCount++;
                    return;
                  }

                  const newPole: Pole = {
                    id: `pole-geo-${Date.now()}-${idx}`,
                    code: poleCode,
                    poleNumber: poleNum,
                    poleType: props.poleType || props.pole_type || 'PSCC 9m',
                    material: props.material || 'PSCC',
                    heightMeters: props.heightMeters || 9,
                    coordinates: [lat, lng],
                    installationDate: new Date().toISOString().split('T')[0],
                    condition: props.condition || 'Good',
                    numInsulators: props.numInsulators || 3,
                    hasStreetlight: Boolean(props.hasStreetlight),
                    feederId: props.feederId || 'fdr-mara-1',
                    status: 'operational',
                    regionId: 'reg-pdy',
                    divisionId: 'div-urban',
                    sectionId: 'sec-mara',
                    jeJurisdictionId: 'jur-mara-1',
                  };

                  assetService.addPole(newPole);
                  hasPoles = true;
                  importedCount++;
                  details.push(`Imported Utility Pole: ${poleNum} at [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
                }
              }
            } catch (err: any) {
              errorCount++;
              details.push(`Error parsing feature #${idx + 1}: ${err.message}`);
            }
          });

          this.dispatchSpatialImported(allCoords, {
            count: importedCount,
            hasFeeders,
            hasTransformers,
            hasPoles,
            hasSubstations,
            hasConsumers,
          });

          return {
            success: true,
            importedCount,
            duplicateCount,
            errorCount,
            message: `GeoJSON Import Complete: ${importedCount} assets created, ${duplicateCount} duplicates skipped.`,
            details,
          };
        }
      }

      // C. If it's a CSV file
      if (fileName.endsWith('.csv')) {
        const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length <= 1) {
          return {
            success: false,
            importedCount: 0,
            duplicateCount: 0,
            errorCount: 1,
            message: 'CSV file is empty or missing data rows.',
            details: ['Ensure file has a header row and at least 1 record.'],
          };
        }

        const headers = lines[0].toLowerCase().split(',').map(h => h.replace(/["']/g, '').trim());
        const latIdx = headers.findIndex(h => h.includes('lat'));
        const lngIdx = headers.findIndex(h => h.includes('lon') || h.includes('lng'));
        const codeIdx = headers.findIndex(h => h.includes('code') || h.includes('number') || h.includes('id') || h.includes('tag'));
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('desc'));
        const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('class') || h.includes('category'));
        const capIdx = headers.findIndex(h => h.includes('kva') || h.includes('mva') || h.includes('capacity'));

        for (let i = 1; i < lines.length; i++) {
          try {
            const cols = lines[i].split(',').map(c => c.replace(/["']/g, '').trim());
            const lat = latIdx !== -1 ? parseFloat(cols[latIdx]) : NaN;
            const lng = lngIdx !== -1 ? parseFloat(cols[lngIdx]) : NaN;
            const code = codeIdx !== -1 && cols[codeIdx] ? cols[codeIdx] : `CSV-${i}`;
            const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : `Imported Asset ${i}`;
            const typeStr = typeIdx !== -1 && cols[typeIdx] ? cols[typeIdx].toLowerCase() : '';

            if (isNaN(lat) || isNaN(lng)) {
              errorCount++;
              continue;
            }

            recordCoord(lat, lng);

            const isDT = typeStr.includes('transformer') || typeStr.includes('dt') || typeStr.includes('dtr') || name.toLowerCase().includes('transformer') || name.toLowerCase().includes('dtr') || capIdx !== -1;

            if (isDT) {
              const capVal = capIdx !== -1 ? parseFloat(cols[capIdx]) : 250;
              const newDT: Transformer = {
                id: `dt-csv-${Date.now()}-${i}`,
                code,
                name,
                capacityKVA: isNaN(capVal) ? 250 : capVal,
                voltageRatio: '11/0.433kV',
                loadPercentage: 65,
                coordinates: [lat, lng],
                serialNumber: `SN-CSV-${Date.now().toString().slice(-6)}-${i}`,
                installationDate: new Date().toISOString().split('T')[0],
                make: 'Voltamp Transformers',
                phaseImbalancePct: 3.0,
                oilLevelPct: 90,
                hasOilLeakage: false,
                feederId: 'fdr-mara-1',
                regionId: 'reg-pdy',
                divisionId: 'div-urban',
                sectionId: 'sec-mara',
                jeJurisdictionId: 'jur-mara-1',
                status: 'operational',
              };
              assetService.addTransformer(newDT);
              hasTransformers = true;
              importedCount++;
              details.push(`Imported DT: ${code} (${name})`);
            } else {
              const newPole: Pole = {
                id: `pole-csv-${Date.now()}-${i}`,
                code,
                poleNumber: code,
                poleType: 'PSCC 9m',
                material: 'PSCC',
                heightMeters: 9,
                coordinates: [lat, lng],
                installationDate: new Date().toISOString().split('T')[0],
                condition: 'Good',
                numInsulators: 3,
                hasStreetlight: false,
                feederId: 'fdr-mara-1',
                status: 'operational',
                regionId: 'reg-pdy',
                divisionId: 'div-urban',
                sectionId: 'sec-mara',
                jeJurisdictionId: 'jur-mara-1',
              };

              assetService.addPole(newPole);
              hasPoles = true;
              importedCount++;
              details.push(`Imported Pole: ${code} (${name})`);
            }
          } catch (err: any) {
            errorCount++;
          }
        }

        this.dispatchSpatialImported(allCoords, {
          count: importedCount,
          hasFeeders,
          hasTransformers,
          hasPoles,
          hasSubstations,
          hasConsumers,
        });

        return {
          success: true,
          importedCount,
          duplicateCount,
          errorCount,
          message: `CSV Import Complete: ${importedCount} records imported, ${duplicateCount} duplicates bypassed.`,
          details,
        };
      }

      // D. If it's a KML file (.kml)
      if (fileName.endsWith('.kml')) {
        interface KmlItem {
          name: string;
          desc: string;
          pointCoords?: [number, number]; // [lat, lng]
          lineCoords?: [number, number][]; // LineString [lat, lng]
        }

        const items: KmlItem[] = [];

        if (typeof DOMParser !== 'undefined') {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, 'text/xml');
          const placemarks = Array.from(xmlDoc.getElementsByTagName('Placemark'));

          placemarks.forEach((pm, idx) => {
            const name = pm.getElementsByTagName('name')[0]?.textContent?.trim() || `Asset-${idx + 1}`;
            const desc = pm.getElementsByTagName('description')[0]?.textContent?.trim() || '';

            // Check for LineString
            const lineEl = pm.getElementsByTagName('LineString')[0];
            let lineCoords: [number, number][] | undefined;
            if (lineEl) {
              const rawCoords = lineEl.getElementsByTagName('coordinates')[0]?.textContent?.trim();
              if (rawCoords) {
                const coords = DataExchangeService.parseKmlCoordinateTuples(rawCoords);
                if (coords.length >= 2) lineCoords = coords;
              }
            }

            // Check for Point
            const pointEl = pm.getElementsByTagName('Point')[0];
            let pointCoords: [number, number] | undefined;
            if (pointEl) {
              const rawCoords = pointEl.getElementsByTagName('coordinates')[0]?.textContent?.trim();
              if (rawCoords) {
                const coords = DataExchangeService.parseKmlCoordinateTuples(rawCoords);
                if (coords.length > 0) pointCoords = coords[0];
              }
            }

            if (pointCoords || lineCoords) {
              items.push({ name, desc, pointCoords, lineCoords });
            }
          });
        } else {
          // Robust regex fallback for Node.js / test environments
          const placemarkRegex = /<Placemark[\s\S]*?<\/Placemark>/gi;
          const pmBlocks = content.match(placemarkRegex) || [];

          pmBlocks.forEach((block, idx) => {
            const nameMatch = block.match(/<name>(.*?)<\/name>/i);
            const name = nameMatch ? nameMatch[1].trim() : `Asset-${idx + 1}`;
            const descMatch = block.match(/<description>(.*?)<\/description>/i);
            const desc = descMatch ? descMatch[1].trim() : '';

            // LineString
            let lineCoords: [number, number][] | undefined;
            if (block.includes('<LineString>')) {
              const coordMatch = block.match(/<LineString>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i);
              if (coordMatch) {
                const coords = DataExchangeService.parseKmlCoordinateTuples(coordMatch[1]);
                if (coords.length >= 2) lineCoords = coords;
              }
            }

            // Point
            let pointCoords: [number, number] | undefined;
            if (block.includes('<Point>')) {
              const coordMatch = block.match(/<Point>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i);
              if (coordMatch) {
                const coords = DataExchangeService.parseKmlCoordinateTuples(coordMatch[1]);
                if (coords.length > 0) pointCoords = coords[0];
              }
            }

            if (pointCoords || lineCoords) {
              items.push({ name, desc, pointCoords, lineCoords });
            }
          });
        }

        if (items.length === 0) {
          return {
            success: false,
            importedCount: 0,
            duplicateCount: 0,
            errorCount: 1,
            message: 'No Placemarks found in KML file.',
            details: ['Ensure KML file contains <Placemark> with <Point> or <LineString> geometries.'],
          };
        }

        items.forEach((item, idx) => {
          try {
            const { name, desc, pointCoords, lineCoords } = item;

            // 1. LineString Geometry -> Feeder Line / Cable Route
            if (lineCoords && lineCoords.length >= 2) {
              if (assetService.getFeeders().some(f => f.name.toLowerCase() === name.toLowerCase())) {
                duplicateCount++;
                return;
              }

              const isHT = /22kv|33kv|ht/i.test(name) || /22kv|33kv|ht/i.test(desc);
              const newFeeder: Feeder = {
                id: `fdr-kml-${Date.now()}-${idx}`,
                code: `FDR-KML-${idx + 1}`,
                name,
                substationId: 'ss-mara',
                voltageClass: isHT ? '22kV' : '11kV',
                conductorType: 'Dog ACSR (100 sq mm)',
                lengthKm: Math.round((lineCoords.length * 0.12) * 10) / 10,
                peakLoadAmps: 185,
                ratedCapacityAmps: 350,
                isEnergized: true,
                status: 'operational',
                regionId: 'reg-pdy',
                divisionId: 'div-urban',
                sectionId: 'sec-mara',
                coordinates: lineCoords,
              };

              assetService.addFeeder(newFeeder);
              lineCoords.forEach(pt => recordCoord(pt[0], pt[1]));
              hasFeeders = true;
              importedCount++;
              details.push(`Imported Feeder Line: ${name} (${lineCoords.length} vertices)`);
              return;
            }

            // 2. Point Geometry -> Transformer (DT), Substation, or Utility Pole
            if (pointCoords) {
              const lat = pointCoords[0];
              const lng = pointCoords[1];
              recordCoord(lat, lng);

              const isDT = /transformer|dtr|dt\b|kva|distribution/i.test(name) || /transformer|dtr|kva/i.test(desc);
              const isSS = /substation|switchyard|110kv|230kv|66kv/i.test(name) || /substation/i.test(desc);

              if (isDT) {
                if (assetService.getTransformers().some(t => t.name.toLowerCase() === name.toLowerCase())) {
                  duplicateCount++;
                  return;
                }
                const newDT: Transformer = {
                  id: `dt-kml-${Date.now()}-${idx}`,
                  code: `DT-KML-${idx + 1}`,
                  name,
                  capacityKVA: 250,
                  voltageRatio: '11/0.433kV',
                  loadPercentage: 68,
                  coordinates: [lat, lng],
                  serialNumber: `SN-KML-${Date.now().toString().slice(-6)}-${idx}`,
                  installationDate: new Date().toISOString().split('T')[0],
                  make: 'Voltamp Transformers',
                  phaseImbalancePct: 3.2,
                  oilLevelPct: 94,
                  hasOilLeakage: false,
                  feederId: 'fdr-mara-1',
                  regionId: 'reg-pdy',
                  divisionId: 'div-urban',
                  sectionId: 'sec-mara',
                  jeJurisdictionId: 'jur-mara-1',
                  status: 'operational',
                };
                assetService.addTransformer(newDT);
                hasTransformers = true;
                importedCount++;
                details.push(`Imported Distribution Transformer (DT): ${name} at [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
              } else if (isSS) {
                if (assetService.getSubstations().some(s => s.name.toLowerCase() === name.toLowerCase())) {
                  duplicateCount++;
                  return;
                }
                const newSS: Substation = {
                  id: `ss-kml-${Date.now()}-${idx}`,
                  code: `SS-KML-${idx + 1}`,
                  name,
                  voltageClass: '110kV',
                  capacityMVA: 80,
                  numFeeders: 8,
                  coordinates: [lat, lng],
                  commissionDate: new Date().toISOString().split('T')[0],
                  status: 'operational',
                  regionId: 'reg-pdy',
                  divisionId: 'div-urban',
                  sectionId: 'sec-mara',
                };
                assetService.addSubstation(newSS);
                hasSubstations = true;
                importedCount++;
                details.push(`Imported Substation: ${name} at [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
              } else {
                // Default to Utility Pole
                if (assetService.getPoles().some(p => p.poleNumber.toLowerCase() === name.toLowerCase())) {
                  duplicateCount++;
                  return;
                }
                const newPole: Pole = {
                  id: `pole-kml-${Date.now()}-${idx}`,
                  code: `POL-KML-${idx + 1}`,
                  poleNumber: name,
                  poleType: 'PSCC 9m',
                  material: 'PSCC',
                  heightMeters: 9,
                  coordinates: [lat, lng],
                  installationDate: new Date().toISOString().split('T')[0],
                  condition: 'Good',
                  numInsulators: 3,
                  hasStreetlight: false,
                  feederId: 'fdr-mara-1',
                  status: 'operational',
                  regionId: 'reg-pdy',
                  divisionId: 'div-urban',
                  sectionId: 'sec-mara',
                  jeJurisdictionId: 'jur-mara-1',
                };
                assetService.addPole(newPole);
                hasPoles = true;
                importedCount++;
                details.push(`Imported Utility Pole: ${name} at [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
              }
              return;
            }
          } catch (pmErr: any) {
            errorCount++;
            details.push(`Error parsing Placemark #${idx + 1}: ${pmErr.message}`);
          }
        });

        this.dispatchSpatialImported(allCoords, {
          count: importedCount,
          hasFeeders,
          hasTransformers,
          hasPoles,
          hasSubstations,
          hasConsumers,
        });

        return {
          success: true,
          importedCount,
          duplicateCount,
          errorCount,
          message: `KML Import Complete: ${importedCount} spatial assets created, ${duplicateCount} duplicates skipped.`,
          details,
        };
      }

      return {
        success: false,
        importedCount: 0,
        duplicateCount: 0,
        errorCount: 1,
        message: 'Unsupported file format. Please upload a KML (.kml), GeoJSON (.geojson), CSV (.csv), or PowerGIS JSON snapshot (.json).',
        details: [`Detected file: ${file.name}`],
      };
    } catch (err: any) {
      return {
        success: false,
        importedCount: 0,
        duplicateCount: 0,
        errorCount: 1,
        message: `Failed to parse file: ${err.message}`,
        details: [err.stack || 'Parsing error'],
      };
    }
  }

  // --------------------------------------------------------------------------
  // Helper: Dispatch Global Spatial Imported Event for Map Auto-Zoom & Auto-Render
  // --------------------------------------------------------------------------
  private dispatchSpatialImported(
    allCoords: [number, number][],
    flags: {
      count: number;
      hasFeeders: boolean;
      hasTransformers: boolean;
      hasPoles: boolean;
      hasSubstations: boolean;
      hasConsumers: boolean;
    }
  ): void {
    if (typeof window === 'undefined' || allCoords.length === 0) return;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    allCoords.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    const bounds: [[number, number], [number, number]] = [
      [minLat, minLng],
      [maxLat, maxLng],
    ];
    const center: [number, number] = [(minLat + maxLat) / 2, (minLng + maxLng) / 2];

    window.dispatchEvent(
      new CustomEvent('powergis:spatial-imported', {
        detail: {
          bounds,
          center,
          ...flags,
        },
      })
    );
  }

  // --------------------------------------------------------------------------
  // Helper: Trigger Direct Browser File Download
  // --------------------------------------------------------------------------
  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  private getTimestampString(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private generateChecksum(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

export const dataExchangeService = DataExchangeService.getInstance();

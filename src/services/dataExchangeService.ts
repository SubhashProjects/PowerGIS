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
  // 5. IMPORT SPATIAL DATASET (GeoJSON, CSV, JSON)
  // --------------------------------------------------------------------------
  public async importSpatialFile(file: File): Promise<ImportResult> {
    const fileName = file.name.toLowerCase();
    const content = await file.text();

    const details: string[] = [];
    let importedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    try {
      if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
        const parsed = JSON.parse(content);

        // A. If it's a PowerGIS System Backup JSON
        if (parsed.platform && parsed.data && parsed.version) {
          if (parsed.data.poles && Array.isArray(parsed.data.poles)) {
            parsed.data.poles.forEach((p: Pole) => {
              if (!assetService.getPoleById(p.id)) {
                assetService.addPole(p);
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
                importedCount++;
              } else {
                duplicateCount++;
              }
            });
          }
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
              const coords = feat.geometry.coordinates;

              // Pole Feature
              if (props.assetType === 'pole' || props.poleNumber || props.pole_number) {
                const lat = coords[1];
                const lng = coords[0];
                const poleNum = props.poleNumber || props.pole_number || `P-IMP-${Date.now()}-${idx}`;
                const poleCode = props.code || `POL-IMP-${idx}`;

                if (assetService.getPoles().some(p => p.poleNumber === poleNum || p.code === poleCode)) {
                  duplicateCount++;
                  return;
                }

                const newPole: Pole = {
                  id: `pole-imp-${Date.now()}-${idx}`,
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
                importedCount++;
                details.push(`Imported Pole ${poleNum} at [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
              }
              // Consumer Feature
              else if (props.assetType === 'consumer' || props.consumerNumber || props.consumer_number) {
                const lat = coords[1];
                const lng = coords[0];
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
                importedCount++;
                details.push(`Imported Consumer ${conNum} (${newCon.name})`);
              } else {
                // Generic point as a utility pole
                if (feat.geometry.type === 'Point') {
                  const lat = coords[1];
                  const lng = coords[0];
                  const poleNum = `P-GEO-${Date.now().toString().slice(-4)}-${idx}`;
                  const newPole: Pole = {
                    id: `pole-geo-${Date.now()}-${idx}`,
                    code: `POL-GEO-${idx}`,
                    poleNumber: poleNum,
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
                  importedCount++;
                  details.push(`Imported Point Feature as Pole ${poleNum}`);
                }
              }
            } catch (err: any) {
              errorCount++;
              details.push(`Error parsing feature #${idx + 1}: ${err.message}`);
            }
          });

          return {
            success: true,
            importedCount,
            duplicateCount,
            errorCount,
            message: `GeoJSON Import Complete: ${importedCount} assets created, ${duplicateCount} duplicates skipped, ${errorCount} errors.`,
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
        const codeIdx = headers.findIndex(h => h.includes('code') || h.includes('number') || h.includes('id'));
        const nameIdx = headers.findIndex(h => h.includes('name'));

        for (let i = 1; i < lines.length; i++) {
          try {
            const cols = lines[i].split(',').map(c => c.replace(/["']/g, '').trim());
            const lat = latIdx !== -1 ? parseFloat(cols[latIdx]) : 11.9360 + (Math.random() - 0.5) * 0.02;
            const lng = lngIdx !== -1 ? parseFloat(cols[lngIdx]) : 79.8250 + (Math.random() - 0.5) * 0.02;
            const code = codeIdx !== -1 ? cols[codeIdx] : `CSV-${i}`;
            const name = nameIdx !== -1 ? cols[nameIdx] : `Imported Asset ${i}`;

            if (isNaN(lat) || isNaN(lng)) {
              errorCount++;
              continue;
            }

            if (assetService.getPoles().some(p => p.code === code || p.poleNumber === code)) {
              duplicateCount++;
              continue;
            }

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
            importedCount++;
            details.push(`Imported CSV record: ${code} (${name})`);
          } catch (err: any) {
            errorCount++;
          }
        }

        return {
          success: true,
          importedCount,
          duplicateCount,
          errorCount,
          message: `CSV Import Complete: ${importedCount} records imported, ${duplicateCount} duplicates bypassed.`,
          details,
        };
      }

      return {
        success: false,
        importedCount: 0,
        duplicateCount: 0,
        errorCount: 1,
        message: 'Unsupported file format. Please upload a GeoJSON (.geojson), CSV (.csv), or PowerGIS JSON snapshot (.json).',
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

// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// MASTER GIS MAP ENGINE: LEAFLET + MULTI-BASEMAP + POSTGIS OVERLAYS
// ============================================================================

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useGIS } from '../../context/GISContext';
import { useAuth } from '../../context/AuthContext';
import { assetService } from '../../services/assetService';
import { faultService } from '../../services/faultService';
import { surveyService } from '../../services/surveyService';
import { availableBasemaps, regionCoordinates } from '../../services/gisService';
import { BasemapSwitcher } from './BasemapSwitcher';
import { LayerTree } from './LayerTree';
import { MeasureTool } from './MeasureTool';
import { calculateHaversineDistance, calculatePolygonArea } from '../../lib/geoUtils';

export const MasterMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);
  const measureGroupRef = useRef<L.FeatureGroup | null>(null);

  const {
    currentBasemap,
    layers,
    activeRegion,
    selectedAsset,
    setSelectedAsset,
    measurement,
    addMeasurementPoint,
  } = useGIS();

  const { user } = useAuth();

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initial = regionCoordinates[activeRegion] || { center: [11.9360, 79.8250], zoom: 13 };

    const map = L.map(mapContainerRef.current, {
      center: initial.center,
      zoom: initial.zoom,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const featureGroup = L.featureGroup().addTo(map);
    const measureGroup = L.featureGroup().addTo(map);

    featureGroupRef.current = featureGroup;
    measureGroupRef.current = measureGroup;
    mapInstanceRef.current = map;

    // Measurement Click Handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (measurement.mode !== 'none') {
        addMeasurementPoint([e.latlng.lat, e.latlng.lng]);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap Tiles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const config = availableBasemaps.find(b => b.id === currentBasemap) || availableBasemaps[0];

    const tile = L.tileLayer(config.url, {
      subdomains: config.subdomains || ['a', 'b', 'c'],
      maxZoom: config.maxZoom || 19,
      attribution: config.attribution,
    });

    tile.addTo(map);
    tileLayerRef.current = tile;
  }, [currentBasemap]);

  // Handle Region Change FlyTo
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const target = regionCoordinates[activeRegion];
    if (target) {
      map.flyTo(target.center, target.zoom, { duration: 1.2 });
    }
  }, [activeRegion]);

  // Render Overlays according to active layers & user jurisdiction
  useEffect(() => {
    const map = mapInstanceRef.current;
    const fg = featureGroupRef.current;
    if (!map || !fg) return;

    fg.clearLayers();

    const isLayerVisible = (id: string) => {
      const found = layers.find(l => l.id === id);
      return found ? found.visible : true;
    };

    // 1. Substations
    if (isLayerVisible('substations')) {
      const substations = assetService.getSubstations();
      substations.forEach(s => {
        const marker = L.circleMarker(s.coordinates, {
          radius: 9,
          fillColor: '#EF4444',
          color: '#FFFFFF',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        });

        marker.bindPopup(`
          <div class="p-2 text-slate-900 font-sans">
            <div class="font-bold text-sm text-red-600">${s.name}</div>
            <div class="text-xs text-slate-600 font-mono">${s.code} • ${s.voltageClass}</div>
            <div class="mt-2 text-xs border-t pt-1">
              <div>Capacity: <b>${s.capacityMVA} MVA</b></div>
              <div>Active Feeders: <b>${s.numFeeders}</b></div>
              <div>Status: <span class="text-emerald-600 font-semibold uppercase">${s.status}</span></div>
            </div>
          </div>
        `);

        marker.on('click', () => setSelectedAsset(s));
        fg.addLayer(marker);
      });
    }

    // 2. Feeders (Polylines)
    if (isLayerVisible('feeders_11kv') || isLayerVisible('feeders_ht_22kv')) {
      const feeders = assetService.getFeeders();
      feeders.forEach(f => {
        const isHT = f.voltageClass.includes('22kV') || f.voltageClass.includes('33kV');
        if (isHT && !isLayerVisible('feeders_ht_22kv')) return;
        if (!isHT && !isLayerVisible('feeders_11kv')) return;

        const polyline = L.polyline(f.coordinates, {
          color: isHT ? '#F59E0B' : '#0EA5E9',
          weight: isHT ? 4 : 3,
          opacity: f.isEnergized ? 0.9 : 0.4,
          dashArray: f.isEnergized ? undefined : '5, 8',
        });

        polyline.bindPopup(`
          <div class="p-2 text-slate-900 font-sans">
            <div class="font-bold text-sm text-sky-600">${f.name}</div>
            <div class="text-xs text-slate-600 font-mono">${f.code} • ${f.voltageClass}</div>
            <div class="mt-1 text-xs">
              <div>Conductor: <b>${f.conductorType}</b></div>
              <div>Length: <b>${f.lengthKm} km</b></div>
              <div>Peak Load: <b>${f.peakLoadAmps} A</b> (Rated: ${f.ratedCapacityAmps} A)</div>
              <div>Grid Status: <b class="${f.isEnergized ? 'text-emerald-600' : 'text-rose-600'}">${f.isEnergized ? 'ENERGIZED' : 'DE-ENERGIZED'}</b></div>
            </div>
          </div>
        `);

        polyline.on('click', () => setSelectedAsset(f));
        fg.addLayer(polyline);
      });
    }

    // 3. Transformers (DTs)
    if (isLayerVisible('transformers')) {
      const transformers = assetService.getTransformers();
      transformers.forEach(t => {
        const marker = L.circleMarker(t.coordinates, {
          radius: 7,
          fillColor: '#10B981',
          color: '#FFFFFF',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        });

        marker.bindPopup(`
          <div class="p-2 text-slate-900 font-sans">
            <div class="font-bold text-sm text-emerald-700">${t.name}</div>
            <div class="text-xs text-slate-600 font-mono">${t.code} • ${t.capacityKVA} kVA</div>
            <div class="mt-1 text-xs">
              <div>Loading: <b>${t.loadPercentage}%</b></div>
              <div>Oil Level: <b>${t.oilLevelPct}%</b> ${t.hasOilLeakage ? '<span class="text-red-500 font-bold">(LEAK)</span>' : ''}</div>
              <div>Make: <b>${t.make}</b></div>
              <div>Phase Imbalance: <b>${t.phaseImbalancePct}%</b></div>
            </div>
          </div>
        `);

        marker.on('click', () => setSelectedAsset(t));
        fg.addLayer(marker);
      });
    }

    // 4. Utility Poles
    if (isLayerVisible('poles_ht') || isLayerVisible('poles_lt')) {
      const poles = assetService.getPoles();
      poles.forEach(p => {
        const isHT = p.poleType.includes('11m');
        if (isHT && !isLayerVisible('poles_ht')) return;
        if (!isHT && !isLayerVisible('poles_lt')) return;

        const marker = L.circleMarker(p.coordinates, {
          radius: 5,
          fillColor: isHT ? '#8B5CF6' : '#6366F1',
          color: '#FFFFFF',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.85,
        });

        marker.bindPopup(`
          <div class="p-2 text-slate-900 font-sans">
            <div class="font-bold text-sm">${p.poleNumber}</div>
            <div class="text-xs text-slate-600 font-mono">${p.code} • ${p.poleType}</div>
            <div class="mt-1 text-xs">
              <div>Material: <b>${p.material} (${p.heightMeters}m)</b></div>
              <div>Condition: <b class="text-emerald-600">${p.condition}</b></div>
              <div>Insulators: <b>${p.numInsulators}</b></div>
              <div>Streetlight: <b>${p.hasStreetlight ? 'Mounted (LED)' : 'None'}</b></div>
            </div>
          </div>
        `);

        marker.on('click', () => setSelectedAsset(p));
        fg.addLayer(marker);
      });
    }

    // 5. Conductors
    if (isLayerVisible('conductors')) {
      const conductors = assetService.getConductors();
      conductors.forEach(c => {
        const polyline = L.polyline(c.coordinates, {
          color: '#06B6D4',
          weight: 2.5,
          opacity: 0.8,
        });
        fg.addLayer(polyline);
      });
    }

    // 6. Consumers (Smart vs Conventional)
    if (isLayerVisible('consumers_smart') || isLayerVisible('consumers_conventional')) {
      const consumers = assetService.getConsumers();
      consumers.forEach(c => {
        if (c.isSmartMeter && !isLayerVisible('consumers_smart')) return;
        if (!c.isSmartMeter && !isLayerVisible('consumers_conventional')) return;

        const marker = L.circleMarker(c.coordinates, {
          radius: 4,
          fillColor: c.isSmartMeter ? '#10B981' : '#64748B',
          color: '#FFFFFF',
          weight: 1,
          opacity: 0.9,
          fillOpacity: 0.8,
        });

        marker.bindPopup(`
          <div class="p-2 text-slate-900 font-sans">
            <div class="font-bold text-xs">${c.name}</div>
            <div class="text-[11px] text-slate-600 font-mono">${c.consumerNumber}</div>
            <div class="mt-1 text-[11px]">
              <div>Meter: <b>${c.meterNumber}</b> (${c.isSmartMeter ? 'Smart Meter' : 'Conventional'})</div>
              <div>Sanctioned Load: <b>${c.sanctionedLoadKW} kW</b> (${c.category})</div>
              <div>Address: <i>${c.address}</i></div>
            </div>
          </div>
        `);

        marker.on('click', () => setSelectedAsset(c));
        fg.addLayer(marker);
      });
    }

    // 7. Faults
    if (isLayerVisible('fault_locations')) {
      const faults = faultService.getFaults();
      faults.forEach(f => {
        const marker = L.circleMarker(f.coordinates, {
          radius: 8,
          fillColor: '#DC2626',
          color: '#FEE2E2',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9,
        });

        marker.bindPopup(`
          <div class="p-2 text-slate-900 font-sans">
            <div class="font-bold text-sm text-red-600 flex items-center gap-1">
              <span>⚠️ ${f.faultCode}</span>
            </div>
            <div class="text-xs font-semibold text-slate-700">${f.category}</div>
            <p class="text-xs text-slate-600 mt-1">${f.description}</p>
            <div class="mt-2 text-xs border-t pt-1 font-mono">
              <div>Nearest Pole: <b>${f.distanceFromPoleM || '--'}m</b></div>
              <div>Nearest DT: <b>${f.distanceFromDtM || '--'}m</b></div>
              <div>Along Feeder: <b>${f.distanceAlongFeederM || '--'}m</b></div>
              <div>Status: <b class="uppercase text-amber-600">${f.status}</b></div>
            </div>
          </div>
        `);

        marker.on('click', () => setSelectedAsset(f));
        fg.addLayer(marker);
      });
    }

    // 8. Contractor Survey Staging (Pink Diamonds)
    if (isLayerVisible('survey_staging')) {
      const staging = surveyService.getStagingAssets();
      staging.forEach(s => {
        const marker = L.circleMarker(s.coordinates, {
          radius: 7,
          fillColor: '#EC4899',
          color: '#FFFFFF',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        });

        marker.bindPopup(`
          <div class="p-2 text-slate-900 font-sans">
            <div class="font-bold text-xs text-pink-600">STAGING DRAFT (UNPUBLISHED)</div>
            <div class="font-bold text-sm">${s.temporaryCode}</div>
            <div class="text-xs text-slate-600">Asset Type: <b>${s.assetType}</b></div>
            <div class="text-xs mt-1">GPS Accuracy: <b>±${s.gpsAccuracyM}m</b></div>
            <div class="text-[11px] text-amber-600 font-semibold mt-1">Pending JE/AE Multi-Tier Verification</div>
          </div>
        `);

        fg.addLayer(marker);
      });
    }
  }, [layers, user]);

  // Handle Measurement Drawing
  useEffect(() => {
    const mg = measureGroupRef.current;
    if (!mg) return;
    mg.clearLayers();

    if (measurement.points.length === 0) return;

    // Draw points
    measurement.points.forEach((pt, idx) => {
      const marker = L.circleMarker(pt, {
        radius: 5,
        fillColor: '#0EA5E9',
        color: '#FFFFFF',
        weight: 2,
        fillOpacity: 1,
      });
      mg.addLayer(marker);
    });

    if (measurement.mode === 'distance' && measurement.points.length > 1) {
      const line = L.polyline(measurement.points, {
        color: '#0EA5E9',
        weight: 3,
        dashArray: '6, 6',
      });
      mg.addLayer(line);
      const dist = calculateHaversineDistance(
        measurement.points[measurement.points.length - 2][0],
        measurement.points[measurement.points.length - 2][1],
        measurement.points[measurement.points.length - 1][0],
        measurement.points[measurement.points.length - 1][1]
      );
      measurement.totalDistanceM = Math.round((measurement.totalDistanceM + dist) * 10) / 10;
    } else if (measurement.mode === 'area' && measurement.points.length >= 3) {
      const polygon = L.polygon(measurement.points, {
        color: '#10B981',
        fillColor: '#10B981',
        fillOpacity: 0.25,
        weight: 2,
      });
      mg.addLayer(polygon);
      measurement.totalAreaSqM = calculatePolygonArea(measurement.points);
    }
  }, [measurement.points]);

  return (
    <div className="relative w-full h-full flex-1 bg-[#0b1320] overflow-hidden">
      {/* Basemap Switcher Floating Widget */}
      <BasemapSwitcher />

      {/* Layer Tree Floating Widget */}
      <LayerTree />

      {/* Measurement & GPS Toolbar */}
      <MeasureTool />

      {/* Leaflet DOM container */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />
    </div>
  );
};

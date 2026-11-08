// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// MASTER GIS MAP ENGINE: LEAFLET + MULTI-BASEMAP + ROTATION + POSTGIS OVERLAYS
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
import { MapRotationControl } from './MapRotationControl';
import { MapAttributeDrawer } from './MapAttributeDrawer';
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
    bearing,
  } = useGIS();

  const { user } = useAuth();
  const bearingRef = useRef<number>(bearing);

  useEffect(() => {
    bearingRef.current = bearing;
  }, [bearing]);

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

    // Custom zoom control in bottom-right (shifted up slightly for mobile bottom nav)
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Inverse Angular Transformation for Mouse & Touch Coordinates when Map is Rotated
    const originalMouseEventToContainerPoint = map.mouseEventToContainerPoint.bind(map);
    map.mouseEventToContainerPoint = function (e: MouseEvent) {
      const pt = originalMouseEventToContainerPoint(e);
      const currentBearing = bearingRef.current;
      if (!currentBearing || currentBearing === 0) return pt;

      const size = map.getSize();
      const cx = size.x / 2;
      const cy = size.y / 2;
      const dx = pt.x - cx;
      const dy = pt.y - cy;
      const rad = (-currentBearing * Math.PI) / 180;
      const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
      return L.point(cx + rx, cy + ry);
    };

    const featureGroup = L.featureGroup().addTo(map);
    const measureGroup = L.featureGroup().addTo(map);

    featureGroupRef.current = featureGroup;
    measureGroupRef.current = measureGroup;
    mapInstanceRef.current = map;

    // Ensure map tiles recalculate container dimensions
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

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

  // Update Map Rotation via CSS Transform on the Leaflet mapPane
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const mapPane = map.getPane('mapPane');
    if (mapPane) {
      mapPane.style.transformOrigin = 'center center';
      mapPane.style.transition = 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)';
      mapPane.style.transform = bearing === 0 ? '' : `rotate(${bearing}deg)`;
    }
  }, [bearing]);

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
      keepBuffer: 6,
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
          color: '#991B1B',
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.95,
        });

        marker.bindPopup(`
          <div class="p-2 text-neutral-900 font-sans">
            <div class="font-bold text-sm text-neutral-900 flex items-center justify-between gap-2">
              <span>${s.name}</span>
              <span class="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded font-mono shadow-xs">SUBSTATION</span>
            </div>
            <div class="text-xs text-red-700 font-mono font-semibold">${s.code} • ${s.voltageClass}</div>
            <div class="mt-2 text-xs border-t border-neutral-200 pt-1 space-y-0.5">
              <div>Capacity: <b class="text-neutral-950">${s.capacityMVA} MVA</b></div>
              <div>Active Feeders: <b>${s.numFeeders}</b></div>
              <div>Status: <span class="text-emerald-700 font-bold uppercase">${s.status}</span></div>
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
          color: isHT ? '#F59E0B' : '#0284C7',
          weight: isHT ? 4.5 : 3.5,
          opacity: f.isEnergized ? 0.95 : 0.45,
          dashArray: f.isEnergized ? undefined : '6, 6',
        });

        polyline.bindPopup(`
          <div class="p-2 text-neutral-900 font-sans">
            <div class="font-bold text-sm ${isHT ? 'text-amber-800' : 'text-blue-800'} flex items-center justify-between">
              <span>${f.name}</span>
              <span class="text-[10px] ${isHT ? 'bg-amber-600' : 'bg-blue-600'} text-white font-bold px-1.5 py-0.5 rounded font-mono">
                ${isHT ? 'HT FEEDER' : '11kV FEEDER'}
              </span>
            </div>
            <div class="text-xs text-neutral-600 font-mono">${f.code} • ${f.voltageClass}</div>
            <div class="mt-1 text-xs space-y-0.5">
              <div>Conductor: <b>${f.conductorType}</b></div>
              <div>Length: <b>${f.lengthKm} km</b></div>
              <div>Peak Load: <b>${f.peakLoadAmps} A</b> (Rated: ${f.ratedCapacityAmps} A)</div>
              <div>Grid Status: <b class="${f.isEnergized ? 'text-emerald-700 font-extrabold' : 'text-rose-600 font-bold'}">${f.isEnergized ? '⚡ ENERGIZED' : '⭕ DE-ENERGIZED'}</b></div>
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
          radius: 7.5,
          fillColor: '#10B981',
          color: '#065F46',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.95,
        });

        marker.bindPopup(`
          <div class="p-2 text-neutral-900 font-sans">
            <div class="font-bold text-sm text-neutral-900 flex items-center justify-between gap-2">
              <span>${t.name}</span>
              <span class="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded font-mono">${t.capacityKVA} kVA DTR</span>
            </div>
            <div class="text-xs text-emerald-800 font-mono font-medium">${t.code}</div>
            <div class="mt-1 text-xs space-y-0.5">
              <div>Loading: <b class="${t.loadPercentage > 85 ? 'text-amber-700 font-bold' : 'text-emerald-800'}">${t.loadPercentage}%</b></div>
              <div>Oil Level: <b>${t.oilLevelPct}%</b> ${t.hasOilLeakage ? '<span class="text-rose-600 font-bold underline">(LEAK ALERT)</span>' : ''}</div>
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
          radius: isHT ? 5.5 : 4.5,
          fillColor: isHT ? '#8B5CF6' : '#4F46E5',
          color: isHT ? '#5B21B6' : '#312E81',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.95,
        });

        marker.bindPopup(`
          <div class="p-2 text-neutral-900 font-sans">
            <div class="font-bold text-sm ${isHT ? 'text-purple-800' : 'text-indigo-800'} flex items-center justify-between gap-2">
              <span>${p.poleNumber}</span>
              <span class="text-[10px] ${isHT ? 'bg-purple-600' : 'bg-indigo-600'} text-white font-bold px-1.5 py-0.5 rounded font-mono">
                ${isHT ? 'HT 11m POLE' : 'LT 9m POLE'}
              </span>
            </div>
            <div class="text-xs text-neutral-600 font-mono">${p.code} • ${p.poleType}</div>
            <div class="mt-1 text-xs space-y-0.5">
              <div>Material: <b>${p.material} (${p.heightMeters}m)</b></div>
              <div>Condition: <b class="${p.condition === 'Good' ? 'text-emerald-700' : 'text-amber-700'}">${p.condition}</b></div>
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
          opacity: 0.9,
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
          radius: c.isSmartMeter ? 4.5 : 4,
          fillColor: c.isSmartMeter ? '#10B981' : '#F59E0B',
          color: c.isSmartMeter ? '#047857' : '#B45309',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.9,
        });

        marker.bindPopup(`
          <div class="p-2 text-neutral-900 font-sans">
            <div class="font-bold text-xs flex items-center justify-between gap-2">
              <span>${c.name}</span>
              <span class="text-[9px] ${c.isSmartMeter ? 'bg-emerald-600' : 'bg-amber-600'} text-white font-bold px-1.5 py-0.5 rounded font-mono">
                ${c.isSmartMeter ? 'SMART AMI' : 'CONVENTIONAL'}
              </span>
            </div>
            <div class="text-[11px] text-neutral-600 font-mono">${c.consumerNumber}</div>
            <div class="mt-1 text-[11px] space-y-0.5">
              <div>Meter: <b>${c.meterNumber}</b></div>
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
          radius: 8.5,
          fillColor: '#DC2626',
          color: '#7F1D1D',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.95,
        });

        marker.bindPopup(`
          <div class="p-2 text-neutral-900 font-sans">
            <div class="font-bold text-sm text-rose-800 flex items-center justify-between gap-1">
              <span>⚡ ${f.faultCode}</span>
              <span class="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded font-mono">CRITICAL FAULT</span>
            </div>
            <div class="text-xs font-semibold text-neutral-800">${f.category}</div>
            <p class="text-xs text-neutral-600 mt-1">${f.description}</p>
            <div class="mt-2 text-xs border-t border-neutral-300 pt-1 font-mono space-y-0.5">
              <div>Nearest Pole: <b>${f.distanceFromPoleM || '--'}m</b></div>
              <div>Nearest DT: <b>${f.distanceFromDtM || '--'}m</b></div>
              <div>Along Feeder: <b>${f.distanceAlongFeederM || '--'}m</b></div>
              <div>Status: <b class="uppercase text-rose-700 font-bold">${f.status}</b></div>
            </div>
          </div>
        `);

        marker.on('click', () => setSelectedAsset(f));
        fg.addLayer(marker);
      });
    }

    // 8. Contractor Survey Staging (Draft markers)
    if (isLayerVisible('survey_staging')) {
      const staging = surveyService.getStagingAssets();
      staging.forEach(s => {
        const marker = L.circleMarker(s.coordinates, {
          radius: 7,
          fillColor: '#EC4899',
          color: '#9D174D',
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.9,
        });

        marker.bindPopup(`
          <div class="p-2 text-neutral-900 font-sans">
            <div class="font-bold text-xs uppercase tracking-wider text-pink-700 flex items-center justify-between">
              <span>EPC STAGING (UNPUBLISHED)</span>
              <span class="text-[9px] bg-pink-600 text-white font-bold px-1.5 py-0.5 rounded font-mono">DRAFT</span>
            </div>
            <div class="font-bold text-sm text-neutral-950 mt-1">${s.temporaryCode}</div>
            <div class="text-xs text-neutral-600">Asset Type: <b class="text-neutral-900">${s.assetType}</b></div>
            <div class="text-xs mt-1">GPS Accuracy: <b>±${s.gpsAccuracyM}m</b></div>
            <div class="text-[11px] text-pink-700 font-semibold mt-1">Pending Multi-Tier JE/AE Verification</div>
          </div>
        `);

        fg.addLayer(marker);
      });
    }

    // 9. Outage Zones (Affected Polygons)
    if (isLayerVisible('outage_polygons')) {
      const polygon = L.polygon([
        [11.9230, 79.8160],
        [11.9260, 79.8170],
        [11.9250, 79.8210],
        [11.9210, 79.8200]
      ], {
        color: '#E11D48',
        weight: 2,
        fillColor: '#E11D48',
        fillOpacity: 0.22,
        dashArray: '5, 5',
      });
      polygon.bindPopup(`
        <div class="p-2 text-neutral-900 font-sans">
          <div class="font-bold text-sm text-rose-700 flex items-center justify-between">
            <span>OUTAGE INCIDENT ZONE</span>
            <span class="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded font-mono">OUTAGE</span>
          </div>
          <div class="text-xs text-neutral-600 mt-1">Feeder: <b>FDR-MARA-01 (Boulevard 11kV)</b></div>
          <div class="text-xs text-neutral-600">Affected Consumers: <b>420</b> • Duration: <b>28 mins</b></div>
        </div>
      `);
      fg.addLayer(polygon);
    }
  }, [layers, user]);

  // Handle Measurement Drawing
  useEffect(() => {
    const mg = measureGroupRef.current;
    if (!mg) return;
    mg.clearLayers();

    if (measurement.points.length === 0) return;

    // Draw points
    measurement.points.forEach(pt => {
      const marker = L.circleMarker(pt, {
        radius: 5,
        fillColor: '#0f172a',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
      });
      mg.addLayer(marker);
    });

    if (measurement.mode === 'distance' && measurement.points.length > 1) {
      const line = L.polyline(measurement.points, {
        color: '#0f172a',
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
        color: '#0f172a',
        fillColor: '#0f172a',
        fillOpacity: 0.15,
        weight: 2,
      });
      mg.addLayer(polygon);
      measurement.totalAreaSqM = calculatePolygonArea(measurement.points);
    }
  }, [measurement.points]);

  // Handle Selected Asset FlyTo & Centering
  useEffect(() => {
    if (!selectedAsset || !mapInstanceRef.current) return;
    const coords = selectedAsset.coordinates || (selectedAsset.latitude && selectedAsset.longitude ? [selectedAsset.latitude, selectedAsset.longitude] : null);
    if (coords && Array.isArray(coords) && coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      mapInstanceRef.current.flyTo(coords as [number, number], 17, { duration: 1.0 });
    }
  }, [selectedAsset]);

  return (
    <div className="relative w-full h-full flex-1 bg-neutral-100 overflow-hidden select-none">
      {/* Basemap Switcher Floating Widget */}
      <BasemapSwitcher />

      {/* Map Rotation & Compass Floating Widget */}
      <MapRotationControl />

      {/* Layer Tree Floating Widget */}
      <LayerTree />

      {/* Measurement & GPS Toolbar */}
      <MeasureTool />

      {/* Synchronized Bottom Attribute Drawer (Section 6.4) */}
      <MapAttributeDrawer onSelectAsset={setSelectedAsset} selectedAsset={selectedAsset} />

      {/* Leaflet DOM container */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />
    </div>
  );
};

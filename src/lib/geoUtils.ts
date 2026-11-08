// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// GEOSPATIAL UTILITIES: HAVERSINE, PROJECTIONS, AREA & NETWORK DISTANCES
// ============================================================================

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates great-circle straight-line distance between two points in meters using Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c * 10) / 10;
}

/**
 * Calculates total polyline length in meters
 */
export function calculatePolylineLength(points: [number, number][]): number {
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    length += calculateHaversineDistance(
      points[i][0], points[i][1],
      points[i + 1][0], points[i + 1][1]
    );
  }
  return Math.round(length * 10) / 10;
}

/**
 * Calculates geodesic polygon area in square meters using spherical excess
 */
export function calculatePolygonArea(coordinates: [number, number][]): number {
  if (coordinates.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    const p1 = coordinates[i];
    const p2 = coordinates[j];
    total += toRad(p2[1] - p1[1]) * (2 + Math.sin(toRad(p1[0])) + Math.sin(toRad(p2[0])));
  }
  const area = Math.abs((total * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2);
  return Math.round(area * 10) / 10;
}

/**
 * Calculates distance along a feeder polyline from start to nearest point projection
 */
export function calculateDistanceAlongFeeder(
  targetPoint: [number, number],
  feederPoints: [number, number][]
): { distanceAlongM: number; straightLineOffsetM: number } {
  if (feederPoints.length < 2) return { distanceAlongM: 0, straightLineOffsetM: 0 };

  let closestSegmentIdx = 0;
  let minOffset = Infinity;
  let accumulatedDistance = 0;
  let bestDistanceAlong = 0;

  for (let i = 0; i < feederPoints.length - 1; i++) {
    const p1 = feederPoints[i];
    const p2 = feederPoints[i + 1];
    const segLen = calculateHaversineDistance(p1[0], p1[1], p2[0], p2[1]);

    // Midpoint approximation for segment offset
    const midLat = (p1[0] + p2[0]) / 2;
    const midLng = (p1[1] + p2[1]) / 2;
    const distToMid = calculateHaversineDistance(targetPoint[0], targetPoint[1], midLat, midLng);

    if (distToMid < minOffset) {
      minOffset = distToMid;
      closestSegmentIdx = i;
      bestDistanceAlong = accumulatedDistance + (segLen / 2);
    }
    accumulatedDistance += segLen;
  }

  return {
    distanceAlongM: Math.round(bestDistanceAlong),
    straightLineOffsetM: Math.round(minOffset)
  };
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`;
}

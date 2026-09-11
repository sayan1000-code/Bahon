import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr'
);

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1 ? ~(result >> 1) : (result >> 1));
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1 ? ~(result >> 1) : (result >> 1));
    points.push([Math.round(lat / 1e5 * 1e6) / 1e6, Math.round(lng / 1e5 * 1e6) / 1e6]);
  }
  return points;
}

function polylineDistanceMeters(pts: [number, number][]): number {
  let d = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dLat = (pts[i + 1][0] - pts[i][0]) * 111139;
    const dLng = (pts[i + 1][1] - pts[i][1]) * 111139 * Math.cos((pts[i][0] * Math.PI) / 180);
    d += Math.hypot(dLat, dLng);
  }
  return d;
}

// Count sharp turns (>60 degrees) along polyline
function countSharpTurns(pts: [number, number][], minAngleDeg = 60): number {
  let count = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];

    const v1 = [(p1[0] - p0[0]) * 111139, (p1[1] - p0[1]) * 111139 * Math.cos(p1[0] * Math.PI / 180)];
    const v2 = [(p2[0] - p1[0]) * 111139, (p2[1] - p1[1]) * 111139 * Math.cos(p1[0] * Math.PI / 180)];

    const len1 = Math.hypot(v1[0], v1[1]);
    const len2 = Math.hypot(v2[0], v2[1]);
    if (len1 < 10 || len2 < 10) continue; // ignore micro jitter

    const dot = v1[0] * v2[0] + v1[1] * v2[1];
    const cosAngle = Math.max(-1, Math.min(1, dot / (len1 * len2)));
    const turnAngle = Math.acos(cosAngle) * (180 / Math.PI);
    if (turnAngle >= minAngleDeg) {
      count++;
    }
  }
  return count;
}

async function run() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  const { data: route } = await supabase.from('routes').select('*').eq('route_number', 'EB-12').single();
  const originalGeom: [number, number][] = route.road_geometry || [];
  const origDist = polylineDistanceMeters(originalGeom);
  const origTurns = countSharpTurns(originalGeom);

  console.log(`Original EB-12:`);
  console.log(`- Points: ${originalGeom.length}`);
  console.log(`- Distance: ${(origDist / 1000).toFixed(2)} km`);
  console.log(`- Sharp turns (>60°): ${origTurns}`);

  // Test snapped waypoints
  const snappedWaypoints = [
    { name: 'Airport Gate 1', lat: 22.642124, lng: 88.43448 },
    { name: 'Kaikhali', lat: 22.634343, lng: 88.434725 },
    { name: 'Haldiram', lat: 22.627705, lng: 88.433556 },
    { name: 'Baguiati', lat: 22.612035, lng: 88.428799 },
    { name: 'Ultadanga', lat: 22.585537, lng: 88.397194 },
    { name: 'Kankurgachi', lat: 22.583708, lng: 88.391563 },
    { name: 'Maniktala', lat: 22.585394, lng: 88.369433 },
    { name: 'Girish Park', lat: 22.587202, lng: 88.362866 },
    { name: 'Burrabazar', lat: 22.58071, lng: 88.35077 },
    { name: 'Howrah Station', lat: 22.583599, lng: 88.343724 },
  ];

  const origin = { location: { latLng: { latitude: snappedWaypoints[0].lat, longitude: snappedWaypoints[0].lng } } };
  const destination = { location: { latLng: { latitude: snappedWaypoints[snappedWaypoints.length - 1].lat, longitude: snappedWaypoints[snappedWaypoints.length - 1].lng } } };
  const intermediates = snappedWaypoints.slice(1, -1).map(w => ({
    location: { latLng: { latitude: w.lat, longitude: w.lng } },
    via: true
  }));

  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.polyline.encodedPolyline,routes.distanceMeters',
    },
    body: JSON.stringify({
      origin,
      destination,
      intermediates,
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
      polylineQuality: 'HIGH_QUALITY'
    })
  });

  const data = await res.json();
  const enc = data.routes?.[0]?.polyline?.encodedPolyline;
  if (!enc) {
    console.error('Google Routes API returned error:', data);
    return;
  }

  const newGeom = decodePolyline(enc);
  const newDist = polylineDistanceMeters(newGeom);
  const newTurns = countSharpTurns(newGeom);

  console.log(`\nNew Arterial-Snapped EB-12:`);
  console.log(`- Points: ${newGeom.length}`);
  console.log(`- Distance: ${(newDist / 1000).toFixed(2)} km (Change: ${((newDist - origDist) / 1000).toFixed(2)} km)`);
  console.log(`- Sharp turns (>60°): ${newTurns} (Reduced from ${origTurns})`);
}

run().catch(console.error);

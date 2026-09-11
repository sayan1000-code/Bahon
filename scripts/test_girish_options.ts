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

function countSharpTurns(pts: [number, number][], minAngleDeg = 75): number {
  let count = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];

    const v1 = [(p1[0] - p0[0]) * 111139, (p1[1] - p0[1]) * 111139 * Math.cos(p1[0] * Math.PI / 180)];
    const v2 = [(p2[0] - p1[0]) * 111139, (p2[1] - p1[1]) * 111139 * Math.cos(p1[0] * Math.PI / 180)];

    const len1 = Math.hypot(v1[0], v1[1]);
    const len2 = Math.hypot(v2[0], v2[1]);
    if (len1 < 10 || len2 < 10) continue;

    const dot = v1[0] * v2[0] + v1[1] * v2[1];
    const cosAngle = Math.max(-1, Math.min(1, dot / (len1 * len2)));
    const turnAngle = Math.acos(cosAngle) * (180 / Math.PI);
    if (turnAngle >= minAngleDeg) {
      count++;
    }
  }
  return count;
}

function detectLoop(pts: [number, number][]): boolean {
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 10; j < Math.min(i + 80, pts.length); j++) {
      const d = Math.hypot(
        (pts[i][0] - pts[j][0]) * 111139,
        (pts[i][1] - pts[j][1]) * 111139 * Math.cos(pts[i][0] * Math.PI / 180)
      );
      if (d < 50) return true;
    }
  }
  return false;
}

async function testGirishRoutingOptions() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  
  // Route 15 stops
  // Paikpara -> Ultadanga -> Kankurgachi -> Maniktala -> Girish Park -> Burrabazar -> Howrah Station
  const baseStops = [
    { name: 'Paikpara', lat: 22.610521, lng: 88.38421 },
    { name: 'Ultadanga', lat: 22.585537, lng: 88.397194 },
    { name: 'Kankurgachi', lat: 22.583708, lng: 88.391563 },
    { name: 'Maniktala', lat: 22.585394, lng: 88.369433 },
    { name: 'Girish Park (Original)', lat: 22.587608, lng: 88.361142 },
    { name: 'Burrabazar', lat: 22.58071, lng: 88.35077 },
    { name: 'Howrah Station', lat: 22.583599, lng: 88.343724 },
  ];

  // Option 1: Original Girish Park pin
  console.log('--- Testing Option 1: Original Girish Park Pin ---');
  await routeAndEvaluate(baseStops, apiKey);

  // Option 2: Confident Main-Road Snap: Girish Park Metro / Chittaranjan Ave & Vivekananda Rd crossing (22.58547, 88.36015)
  console.log('\n--- Testing Option 2: Confident Main-Road Corrected Pin (Vivekananda Rd & CR Ave) ---');
  const correctedStops = [...baseStops];
  correctedStops[4] = { name: 'Girish Park (Corrected CR Ave / Vivekananda Rd)', lat: 22.58547, lng: 88.36015 };
  await routeAndEvaluate(correctedStops, apiKey);

  // Option 3: Skip Girish Park from routing waypoints
  console.log('\n--- Testing Option 3: Skip Girish Park from Routing Waypoints ---');
  const skippedStops = baseStops.filter((_, idx) => idx !== 4);
  await routeAndEvaluate(skippedStops, apiKey);
}

async function routeAndEvaluate(stops: Array<{ name: string; lat: number; lng: number }>) {
  const coordParam = stops.map(s => `${s.lng.toFixed(6)},${s.lat.toFixed(6)}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordParam}?overview=full&geometries=geojson&continue_straight=true`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'KolkataTransitTracker/1.0 (transit@bustracker.local)' }
  });

  if (!res.ok) {
    console.error(`OSRM error: ${res.status}`);
    return;
  }

  const data = await res.json();
  const rawCoords = data.routes?.[0]?.geometry?.coordinates;
  if (!rawCoords) {
    console.error('No geometry in OSRM response:', data);
    return;
  }

  const pts: [number, number][] = rawCoords.map(([lng, lat]: [number, number]) => [lat, lng]);
  const dist = polylineDistanceMeters(pts);
  const girishBox = pts.filter(p => p[0] >= 22.580 && p[0] <= 22.595 && p[1] >= 88.350 && p[1] <= 88.375);
  const hasLoop = detectLoop(girishBox);
  const sharpTurns = countSharpTurns(girishBox);

  console.log(`Total Points: ${pts.length}, Total Distance: ${(dist / 1000).toFixed(2)} km`);
  console.log(`Girish Park Section: ${girishBox.length} pts, Sharp Turns: ${sharpTurns}, Boxy Loop Detected: ${hasLoop}`);
}

testGirishRoutingOptions().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { processCorridorStops } from '../src/services/corridorSnappingService';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr'
);

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

async function refetchRoute15() {
  const { data: route } = await supabase.from('routes').select('*').eq('route_number', '15').single();
  const { data: allStops } = await supabase.from('stops').select('*');
  const stopsMap = new Map((allStops || []).map(s => [s.id, s]));

  const rawStops = (route.stop_sequence || []).map((id: string) => stopsMap.get(id)).filter(Boolean);

  console.log(`Route 15: ${rawStops.length} stops.`);
  for (const s of rawStops) {
    console.log(`  - ${s.id}: "${s.name}" (${s.lat}, ${s.lng})`);
  }

  const { routingWaypoints, detourFlags } = processCorridorStops('15', route.id, rawStops.map((s: any) => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    road_corridor: s.road_corridor
  })));

  console.log(`\nRouting waypoints count: ${routingWaypoints.length}`);
  for (const w of routingWaypoints) {
    console.log(`  - ${w.name}: (${w.snappedLat}, ${w.snappedLng}) on ${w.snappedRoadName}`);
  }

  const coordParam = routingWaypoints.map(w => `${w.snappedLng.toFixed(6)},${w.snappedLat.toFixed(6)}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordParam}?overview=full&geometries=geojson&continue_straight=true`;

  const res = await fetch(url);
  const data = await res.json();
  const rawCoords = data.routes[0].geometry.coordinates;
  const geom: [number, number][] = rawCoords.map(([lng, lat]: [number, number]) => [lat, lng]);

  const totalDist = polylineDistanceMeters(geom);
  const girishBox = geom.filter(p => p[0] >= 22.580 && p[0] <= 22.595 && p[1] >= 88.350 && p[1] <= 88.375);
  const loop = detectLoop(girishBox);
  const turns = countSharpTurns(girishBox);

  console.log(`\n=== Refetched Route 15 Geometry Results ===`);
  console.log(`Total Points: ${geom.length}`);
  console.log(`Total Length: ${(totalDist / 1000).toFixed(2)} km (Original was 16.51 km)`);
  console.log(`Girish Park Section Points: ${girishBox.length}`);
  console.log(`Sharp Turns around Girish Park: ${turns}`);
  console.log(`Boxy Loop Detected: ${loop ? '❌ YES (STILL LOOPING)' : '✅ NO (LOOP ELIMINATED!)'}`);

  if (!loop) {
    const { error } = await supabase.from('routes').update({ road_geometry: geom }).eq('id', route.id);
    if (!error) {
      console.log('✅ Successfully updated Route 15 road_geometry in Supabase!');
    } else {
      console.error('Failed to update Route 15 in Supabase:', error.message);
    }
  }
}

refetchRoute15().catch(console.error);

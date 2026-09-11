import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { STOPS } from '../src/data/transitData';
import { processCorridorStops } from '../src/services/corridorSnappingService';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function fetchOsrmGeometry(coords: Array<{ lat: number; lng: number }>): Promise<[number, number][]> {
  const coordParam = coords.map((c) => `${c.lng.toFixed(6)},${c.lat.toFixed(6)}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordParam}?overview=full&geometries=geojson&continue_straight=true`;

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'KolkataTransitTracker/1.0 (transit@bustracker.local)' },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
      const json = await res.json();
      if (!json.routes?.[0]?.geometry?.coordinates) throw new Error('No coordinates returned');
      return json.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
    } catch (err: any) {
      if (attempt === 4) throw err;
      await sleep(1500 * attempt);
    }
  }
  return [];
}

async function run() {
  console.log('=== Updating Girish Park Corridor Routes with Confident Snapping & Loop Elimination ===\n');

  const { data: allRoutes } = await supabase.from('routes').select('*');
  const { data: allStops } = await supabase.from('stops').select('*');
  const stopsMap = new Map(allStops?.map((s: any) => [s.id, s]));

  const girishRoutes = (allRoutes || []).filter((r: any) =>
    (r.stop_sequence || []).some((s: string) => s.includes('girish'))
  );

  console.log(`Found ${girishRoutes.length} routes with Girish Park in sequence.\n`);

  for (let i = 0; i < girishRoutes.length; i++) {
    const route = girishRoutes[i];
    const rNum = route.route_number || route.id;
    const seq = route.stop_sequence || [];
    const stopPoints = seq
      .map((sId: string) => stopsMap.get(sId) || STOPS.find((item) => item.id === sId))
      .filter((s: any) => s && s.lat != null && s.lng != null && !isNaN(Number(s.lat)) && !isNaN(Number(s.lng)))
      .map((s: any) => ({
        id: s.id,
        name: s.name,
        lat: Number(s.lat),
        lng: Number(s.lng),
        road_corridor: s.road_corridor,
      }));

    const origGeom = route.road_geometry || [];
    const origDist = origGeom.length >= 2 ? polylineDistanceMeters(origGeom) / 1000 : 0;
    const origGirishBox = origGeom.filter((p: any) => p[0] >= 22.580 && p[0] <= 22.595 && p[1] >= 88.358 && p[1] <= 88.366);
    const origLoop = detectLoop(origGirishBox);
    const origTurns = countSharpTurns(origGirishBox);

    const { routingWaypoints, detourFlags } = processCorridorStops(rNum, route.id, stopPoints);

    const coords = routingWaypoints.map((w) => ({ lat: w.snappedLat, lng: w.snappedLng }));
    const newGeom = await fetchOsrmGeometry(coords);

    if (newGeom.length >= 2) {
      const newDist = polylineDistanceMeters(newGeom) / 1000;
      const newGirishBox = newGeom.filter((p: any) => p[0] >= 22.580 && p[0] <= 22.595 && p[1] >= 88.358 && p[1] <= 88.366);
      const newLoop = detectLoop(newGirishBox);
      const newTurns = countSharpTurns(newGirishBox);

      const { error: uErr } = await supabase
        .from('routes')
        .update({ road_geometry: newGeom })
        .eq('id', route.id);

      const statusIcon = !newLoop ? '✅' : '⚠️';
      console.log(
        `[${i + 1}/${girishRoutes.length}] ${statusIcon} Route ${rNum.padEnd(8)}: ` +
          `pts: ${origGeom.length} -> ${newGeom.length}, dist: ${origDist.toFixed(2)} km -> ${newDist.toFixed(2)} km, ` +
          `Girish box turns: ${origTurns} -> ${newTurns}, Loop: ${origLoop ? 'YES' : 'NO'} -> ${newLoop ? 'YES' : 'NO'}`
      );
    } else {
      console.error(`[${i + 1}/${girishRoutes.length}] ❌ Failed to fetch geometry for Route ${rNum}`);
    }

    await sleep(800);
  }

  console.log('\n🏁 All Girish Park routes updated successfully!');
}

run().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import { getRoadNameForCoordinate, STOPS } from '../src/data/transitData';
import { calculateCrossTrackDistance } from '../src/services/corridorSnappingService';
import { computeDistanceMeters } from '../src/services/osrmRouteService';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function analyze() {
  const { data: routes, error: rErr } = await supabase.from('routes').select('*');
  const { data: stops, error: sErr } = await supabase.from('stops').select('*');

  if (!routes || !stops) {
    console.error('Failed to load routes/stops:', rErr || sErr);
    return;
  }

  const stopsMap = new Map(stops.map((s: any) => [s.id, s]));

  console.log(`Loaded ${routes.length} routes and ${stops.length} stops.`);

  // We want to identify stops whose coordinates sit inside a branch/alley/side road off the corridor
  // Track stops that move > 30m
  const stopCorrections = new Map<string, {
    stopId: string;
    stopName: string;
    originalLat: number;
    originalLng: number;
    correctedLat: number;
    correctedLng: number;
    shiftMeters: number;
    corridor: string;
    routeNumbers: string[];
    routesCount: number;
  }>();

  for (const route of routes) {
    const seq = route.stop_sequence || [];
    const routeStops = seq
      .map((id: string) => stopsMap.get(id))
      .filter((s: any) => s && s.lat != null && s.lng != null);

    for (let i = 1; i < routeStops.length - 1; i++) {
      const prev = routeStops[i - 1];
      const curr = routeStops[i];
      const next = routeStops[i + 1];

      const corridorPrev = getRoadNameForCoordinate(prev.lat, prev.lng);
      const corridorCurr = getRoadNameForCoordinate(curr.lat, curr.lng);
      const corridorNext = getRoadNameForCoordinate(next.lat, next.lng);

      const { perpDistanceMeters, alongTrackMeters, segmentLengthMeters, projectedPoint } =
        calculateCrossTrackDistance([curr.lat, curr.lng], [prev.lat, prev.lng], [next.lat, next.lng]);

      const directDist = computeDistanceMeters([prev.lat, prev.lng], [next.lat, next.lng]);
      const pathDist =
        computeDistanceMeters([prev.lat, prev.lng], [curr.lat, curr.lng]) +
        computeDistanceMeters([curr.lat, curr.lng], [next.lat, next.lng]);
      const extraTravel = pathDist - directDist;

      // Check if stop is inside side road / alley (perp distance >= 25m up to ~600m)
      // and projects cleanly along track between prev and next
      if (
        alongTrackMeters > 0 &&
        alongTrackMeters < segmentLengthMeters &&
        (perpDistanceMeters >= 25 || extraTravel >= 25)
      ) {
        // Only if corridor is consistent or projected point is within reasonable distance
        const shift = computeDistanceMeters([curr.lat, curr.lng], projectedPoint);
        if (shift >= 30 && shift < 650) {
          const existing = stopCorrections.get(curr.id);
          const rNum = route.route_number || route.id;
          if (!existing) {
            stopCorrections.set(curr.id, {
              stopId: curr.id,
              stopName: curr.name,
              originalLat: curr.lat,
              originalLng: curr.lng,
              correctedLat: projectedPoint[0],
              correctedLng: projectedPoint[1],
              shiftMeters: Math.round(shift),
              corridor: corridorCurr,
              routeNumbers: [rNum],
              routesCount: 1,
            });
          } else {
            if (!existing.routeNumbers.includes(rNum)) {
              existing.routeNumbers.push(rNum);
              existing.routesCount++;
            }
            // If another route gives a more centered projection, we can average or keep the closest
            if (shift < existing.shiftMeters) {
              existing.correctedLat = projectedPoint[0];
              existing.correctedLng = projectedPoint[1];
              existing.shiftMeters = Math.round(shift);
            }
          }
        }
      }
    }
  }

  const sortedCorrections = Array.from(stopCorrections.values()).sort((a, b) => b.shiftMeters - a.shiftMeters);

  console.log(`\nFound ${sortedCorrections.length} stops that move >30m onto their main corridor road:`);
  sortedCorrections.forEach((c, idx) => {
    console.log(
      `${idx + 1}. [${c.stopName}] (${c.stopId}) | Corridor: ${c.corridor}\n` +
      `   Shift: ${c.shiftMeters}m | (${c.originalLat.toFixed(5)}, ${c.originalLng.toFixed(5)}) -> (${c.correctedLat.toFixed(5)}, ${c.correctedLng.toFixed(5)})\n` +
      `   Used by ${c.routesCount} routes: ${c.routeNumbers.slice(0, 5).join(', ')}${c.routeNumbers.length > 5 ? '...' : ''}`
    );
  });
}

analyze().catch(console.error);

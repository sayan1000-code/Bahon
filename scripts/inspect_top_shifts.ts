import { createClient } from '@supabase/supabase-js';
import { getRoadNameForCoordinate } from '../src/data/transitData';
import { calculateCrossTrackDistance } from '../src/services/corridorSnappingService';
import { computeDistanceMeters } from '../src/services/osrmRouteService';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectTop() {
  const { data: routes } = await supabase.from('routes').select('*');
  const { data: stops } = await supabase.from('stops').select('*');
  const stopsMap = new Map(stops.map((s: any) => [s.id, s]));

  const stopCorrections = new Map<string, any>();

  for (const route of routes) {
    const seq = route.stop_sequence || [];
    const routeStops = seq
      .map((id: string) => stopsMap.get(id))
      .filter((s: any) => s && s.lat != null && s.lng != null);

    for (let i = 1; i < routeStops.length - 1; i++) {
      const prev = routeStops[i - 1];
      const curr = routeStops[i];
      const next = routeStops[i + 1];

      const { perpDistanceMeters, alongTrackMeters, segmentLengthMeters, projectedPoint } =
        calculateCrossTrackDistance([curr.lat, curr.lng], [prev.lat, prev.lng], [next.lat, next.lng]);

      if (alongTrackMeters > 0 && alongTrackMeters < segmentLengthMeters) {
        const shift = computeDistanceMeters([curr.lat, curr.lng], projectedPoint);
        // We only consider realistic branch/alley/side-road offsets (30m to 500m)
        // where prev and next are on the corridor (< 3km apart)
        if (shift >= 30 && shift <= 450 && segmentLengthMeters < 3500) {
          const existing = stopCorrections.get(curr.id);
          const rNum = route.route_number || route.id;
          if (!existing || shift < existing.shiftMeters) {
            stopCorrections.set(curr.id, {
              stopId: curr.id,
              stopName: curr.name,
              originalLat: curr.lat,
              originalLng: curr.lng,
              correctedLat: projectedPoint[0],
              correctedLng: projectedPoint[1],
              shiftMeters: Math.round(shift),
              corridor: getRoadNameForCoordinate(curr.lat, curr.lng),
              routeNum: rNum,
            });
          }
        }
      }
    }
  }

  const list = Array.from(stopCorrections.values()).sort((a, b) => b.shiftMeters - a.shiftMeters);
  console.log(`Total off-corridor stops with 30m-450m shift: ${list.length}`);
  console.log('\nTop 30 Stops shifted off branch/alley roads:');
  list.slice(0, 30).forEach((s, idx) => {
    console.log(
      `${idx + 1}. [${s.stopName}] (${s.stopId}) on Route ${s.routeNum} | Corridor: ${s.corridor}` +
      `\n   Shift: ${s.shiftMeters}m | [${s.originalLat.toFixed(5)}, ${s.originalLng.toFixed(5)}] -> [${s.correctedLat.toFixed(5)}, ${s.correctedLng.toFixed(5)}]`
    );
  });
}

inspectTop().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import { getRoadNameForCoordinate } from '../src/data/transitData';
import { calculateCrossTrackDistance } from '../src/services/corridorSnappingService';
import { computeDistanceMeters } from '../src/services/osrmRouteService';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface CorrectedStopRecord {
  stopId: string;
  stopName: string;
  corridor: string;
  originalLat: number;
  originalLng: number;
  correctedLat: number;
  correctedLng: number;
  shiftMeters: number;
  routeNumbers: string[];
}

async function findStopCorrections() {
  const { data: routes, error: rErr } = await supabase.from('routes').select('*');
  const { data: stops, error: sErr } = await supabase.from('stops').select('*');

  if (!routes || !stops) {
    throw new Error(`Database fetch failed: ${rErr?.message || sErr?.message}`);
  }

  const stopsMap = new Map(stops.map((s: any) => [s.id, s]));
  const correctionsMap = new Map<string, CorrectedStopRecord>();

  for (const route of routes) {
    const seq: string[] = route.stop_sequence || [];
    const routeStops = seq
      .map((id) => stopsMap.get(id))
      .filter((s: any) => s && s.lat != null && s.lng != null);

    const rNum = route.route_number || route.id;

    for (let i = 1; i < routeStops.length - 1; i++) {
      const prev = routeStops[i - 1];
      const curr = routeStops[i];
      const next = routeStops[i + 1];

      // Corridor identification
      const corridorCurr = getRoadNameForCoordinate(curr.lat, curr.lng);

      const { perpDistanceMeters, alongTrackMeters, segmentLengthMeters, projectedPoint } =
        calculateCrossTrackDistance([curr.lat, curr.lng], [prev.lat, prev.lng], [next.lat, next.lng]);

      // Only evaluate if stop projects cleanly between adjacent stops on the segment
      if (
        alongTrackMeters > 0 &&
        alongTrackMeters < segmentLengthMeters &&
        segmentLengthMeters < 3500 // Adjacent stops along corridor are typically < 3.5km apart
      ) {
        const shift = computeDistanceMeters([curr.lat, curr.lng], projectedPoint);

        // Target stops sitting in side roads/alleys: 30m to 450m off corridor centerline
        if (shift >= 30 && shift <= 450) {
          const existing = correctionsMap.get(curr.id);
          if (!existing) {
            correctionsMap.set(curr.id, {
              stopId: curr.id,
              stopName: curr.name || curr.id,
              corridor: corridorCurr,
              originalLat: curr.lat,
              originalLng: curr.lng,
              correctedLat: Number(projectedPoint[0].toFixed(6)),
              correctedLng: Number(projectedPoint[1].toFixed(6)),
              shiftMeters: Math.round(shift),
              routeNumbers: [rNum],
            });
          } else {
            if (!existing.routeNumbers.includes(rNum)) {
              existing.routeNumbers.push(rNum);
            }
            // If another route provides a tighter corridor projection along the arterial line, pick best
            if (shift < existing.shiftMeters) {
              existing.correctedLat = Number(projectedPoint[0].toFixed(6));
              existing.correctedLng = Number(projectedPoint[1].toFixed(6));
              existing.shiftMeters = Math.round(shift);
            }
          }
        }
      }
    }
  }

  const list = Array.from(correctionsMap.values()).sort((a, b) => b.shiftMeters - a.shiftMeters);
  return { list, stopsMap };
}

async function main() {
  console.log('=== Step 1: Identifying stops off branch/alley roads (>30m off corridor) ===');
  const { list, stopsMap } = await findStopCorrections();

  console.log(`Total stops identified for corridor arterial snapping (>30m shift): ${list.length}`);

  console.log('\nTop 20 Corrected Stops (Sample):');
  console.table(
    list.slice(0, 20).map((s, idx) => ({
      '#': idx + 1,
      'Stop Name': s.stopName,
      'Stop ID': s.stopId,
      Corridor: s.corridor,
      'Original Coords': `[${s.originalLat.toFixed(5)}, ${s.originalLng.toFixed(5)}]`,
      'Corrected Coords': `[${s.correctedLat.toFixed(5)}, ${s.correctedLng.toFixed(5)}]`,
      'Shift (m)': `${s.shiftMeters}m`,
      Routes: s.routeNumbers.slice(0, 3).join(', ') + (s.routeNumbers.length > 3 ? '...' : ''),
    }))
  );

  const shouldApply = process.argv.includes('--apply');
  if (!shouldApply) {
    console.log('\nDry run complete. Pass --apply to persist these 254 stop coordinate updates to Supabase.');
    return;
  }

  console.log(`\nApplying updates for ${list.length} stops to Supabase stops table...`);
  let updatedCount = 0;
  let errCount = 0;

  for (const s of list) {
    const { error } = await supabase
      .from('stops')
      .update({
        lat: s.correctedLat,
        lng: s.correctedLng,
      })
      .eq('id', s.stopId);

    if (error) {
      console.error(`Failed to update stop ${s.stopId}:`, error.message);
      errCount++;
    } else {
      updatedCount++;
    }
  }

  console.log(`\n✓ Successfully updated ${updatedCount} stops in Supabase stops table (${errCount} errors).`);

  // Write spot-check log
  const fs = await import('fs');
  fs.writeFileSync(
    './scripts/corridor_stops_spot_check.json',
    JSON.stringify(list, null, 2),
    'utf-8'
  );
  console.log('✓ Wrote full spot-check log to scripts/corridor_stops_spot_check.json');
}

main().catch(console.error);


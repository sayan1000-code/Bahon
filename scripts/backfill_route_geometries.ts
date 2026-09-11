import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { STOPS } from '../src/data/transitData';
import { processCorridorStops } from '../src/services/corridorSnappingService';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr';

// CLI arg or env var for Google Maps API Key
const argKeyMatch = process.argv.find((arg) => arg.startsWith('--key='));
const GOOGLE_MAPS_API_KEY =
  (argKeyMatch ? argKeyMatch.split('=')[1] : null) ||
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.VITE_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GEMINI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Standard Google Encoded Polyline algorithm decoder.
 * Returns [latitude, longitude][] coordinates.
 */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([
      Math.round((lat / 1e5) * 1e6) / 1e6,
      Math.round((lng / 1e5) * 1e6) / 1e6,
    ]);
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

function countSharpTurns(pts: [number, number][], minAngleDeg = 60): number {
  let count = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];

    const v1 = [(p1[0] - p0[0]) * 111139, (p1[1] - p0[1]) * 111139 * Math.cos((p1[0] * Math.PI) / 180)];
    const v2 = [(p2[0] - p1[0]) * 111139, (p2[1] - p1[1]) * 111139 * Math.cos((p1[0] * Math.PI) / 180)];

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

/**
 * Calls Google Routes API v2 computeRoutes for a slice of stops.
 * Uses via: true on intermediates to smoothly pass through main road corridors without detours.
 */
async function computeGoogleRoutesSegment(
  stops: Array<{ lat: number; lng: number; heading?: number; isVia?: boolean }>,
  apiKey: string
): Promise<[number, number][]> {
  if (stops.length < 2) return [];

  const origin = {
    location: {
      latLng: {
        latitude: stops[0].lat,
        longitude: stops[0].lng,
      },
      heading: stops[0].heading ? Math.round(stops[0].heading) : undefined,
    },
  };

  const destination = {
    location: {
      latLng: {
        latitude: stops[stops.length - 1].lat,
        longitude: stops[stops.length - 1].lng,
      },
    },
  };

  const rawIntermediates = stops.slice(1, -1);
  const intermediates = rawIntermediates.map((s) => ({
    location: {
      latLng: {
        latitude: s.lat,
        longitude: s.lng,
      },
      heading: s.heading ? Math.round(s.heading) : undefined,
    },
    via: true, // Smooth arterial pass-through: avoids U-turns or forced entry into side alleys
  }));

  const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin,
          destination,
          intermediates: intermediates.length > 0 ? intermediates : undefined,
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_UNAWARE',
          polylineQuality: 'HIGH_QUALITY',
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (res.status === 429) {
        throw new Error('Google Routes API Daily Quota Exceeded (429)');
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Google Routes API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const encoded = data.routes?.[0]?.polyline?.encodedPolyline;
      if (!encoded) {
        throw new Error('No encoded polyline returned from Google Routes API');
      }

      return decodePolyline(encoded);
    } catch (err: any) {
      if (attempt === 5) throw err;
      await sleep(attempt * 2000);
    }
  }

  return [];
}

/**
 * Fallback to OSRM driving profile with continue_straight=true and radiuses
 */
async function fetchOsrmRouteGeometry(
  coords: Array<{ lat: number; lng: number }>,
  radiusesParam?: string
): Promise<[number, number][]> {
  const coordParam = coords.map((c) => `${c.lng.toFixed(6)},${c.lat.toFixed(6)}`).join(';');
  const radParam = radiusesParam ? `&radiuses=${radiusesParam}` : '&radiuses=' + coords.map(() => '25').join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordParam}?overview=full&geometries=geojson&continue_straight=true${radParam}`;

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'KolkataTransitTracker/1.0 (transit@bustracker.local)' },
        signal: AbortSignal.timeout(12000),
      });

      if (res.status === 429) {
        const wait = [3000, 6000, 10000][attempt - 1] || 10000;
        console.warn(`   [OSRM 429] Rate limited. Waiting ${wait}ms...`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);

      const json = await res.json();
      if (json.code !== 'Ok' || !json.routes?.[0]?.geometry?.coordinates) {
        throw new Error(`OSRM route failed: ${json.code}`);
      }

      return json.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
    } catch (err: any) {
      if (attempt === 4) throw err;
      await sleep(2000);
    }
  }
  return [];
}

async function fetchRouteGeometryWithFallback(
  route: any,
  stopsMap: Map<string, any>,
  apiKey: string
): Promise<[number, number][]> {
  const stopSequence: string[] = route.stop_sequence || [];
  const rawCoords = stopSequence
    .map((sId: string) => {
      let s = stopsMap.get(sId);
      if (!s) {
        s = STOPS.find((item) => item.id === sId);
      }
      return s;
    })
    .filter((s: any) => s && s.lat != null && s.lng != null && !isNaN(Number(s.lat)) && !isNaN(Number(s.lng)))
    .map((s: any) => ({
      id: s.id,
      name: s.name,
      lat: Number(s.lat),
      lng: Number(s.lng),
      road_corridor: s.road_corridor,
    }));

  if (rawCoords.length < 2) {
    console.warn(`Route ${route.id} (${route.route_number}) has fewer than 2 valid stop coordinates.`);
    return rawCoords.map((c) => [c.lat, c.lng]);
  }

  // Deduplicate consecutive coordinates within ~5 meters
  const dedupedCoords: typeof rawCoords = [];
  for (const c of rawCoords) {
    if (dedupedCoords.length === 0) {
      dedupedCoords.push(c);
    } else {
      const prev = dedupedCoords[dedupedCoords.length - 1];
      const d = Math.hypot(c.lat - prev.lat, c.lng - prev.lng);
      if (d > 0.00005) {
        dedupedCoords.push(c);
      }
    }
  }

  if (dedupedCoords.length < 2) {
    return rawCoords.map((c) => [c.lat, c.lng]);
  }

  // Apply arterial corridor snapping & dense cluster simplification
  const { routingWaypoints, detourFlags, radiusesParam } = processCorridorStops(
    route.route_number || route.id,
    route.id,
    dedupedCoords
  );

  if (detourFlags.length > 0) {
    console.log(
      `   [Arterial Snapped] ${detourFlags.length} stop(s) snapped from residential pins to arterial centerlines: ` +
        detourFlags.slice(0, 3).map((d) => `"${d.stopName}" (${d.detourMeters}m off ${d.corridorName})`).join(', ') +
        (detourFlags.length > 3 ? ` ...+${detourFlags.length - 3} more` : '')
    );
  }

  const coords = routingWaypoints.map((w) => ({
    lat: w.snappedLat,
    lng: w.snappedLng,
    heading: w.heading,
    isVia: w.isVia,
  }));

  // Try Google Routes API first if apiKey available
  if (apiKey) {
    try {
      const MAX_WAYPOINTS = 27;
      if (coords.length <= MAX_WAYPOINTS) {
        const googleGeom = await computeGoogleRoutesSegment(coords, apiKey);
        if (googleGeom && googleGeom.length >= 2) return googleGeom;
      } else {
        const stitched: [number, number][] = [];
        let startIndex = 0;
        let googleOk = true;

        while (startIndex < coords.length - 1) {
          const endIndex = Math.min(startIndex + (MAX_WAYPOINTS - 1), coords.length - 1);
          const chunkStops = coords.slice(startIndex, endIndex + 1);
          const segmentPoints = await computeGoogleRoutesSegment(chunkStops, apiKey);

          if (!segmentPoints || segmentPoints.length < 2) {
            googleOk = false;
            break;
          }

          if (stitched.length > 0) {
            stitched.push(...segmentPoints.slice(1));
          } else {
            stitched.push(...segmentPoints);
          }

          startIndex = endIndex;
          if (startIndex < coords.length - 1) await sleep(250);
        }

        if (googleOk && stitched.length >= 2) return stitched;
      }
    } catch (gErr: any) {
      console.warn(`   [Google Routes API fallback to OSRM]: ${gErr.message}`);
    }
  }

  // Option B: Fallback to Corridor-Snapped OSRM
  console.log(`   [Using Arterial-Snapped OSRM Fallback for Route ${route.route_number || route.id}]...`);
  await sleep(1500);
  return fetchOsrmRouteGeometry(coords, radiusesParam);
}

export interface RouteChangeMetric {
  routeNumber: string;
  routeId: string;
  stopCount: number;
  origPoints: number;
  newPoints: number;
  origDistKm: number;
  newDistKm: number;
  distChangeKm: number;
  distChangePercent: number;
  origTurns: number;
  newTurns: number;
  turnsEliminated: number;
  isSignificant: boolean;
}

async function main() {
  console.log('====================================================');
  console.log('🚌 Arterial-Snapped Google Routes Backfill Tool');
  console.log('====================================================');

  if (!GOOGLE_MAPS_API_KEY) {
    console.error('\n❌ ERROR: No Google Maps API key provided.');
    console.error('Please configure GOOGLE_MAPS_API_KEY in your .env file or pass via --key=<YOUR_KEY>');
    process.exit(1);
  }

  console.log('Querying Supabase for routes and stops...');
  const { data: allRoutes, error: rErr } = await supabase
    .from('routes')
    .select('id, route_number, stop_sequence, road_geometry')
    .order('route_number', { ascending: true });

  const { data: allStops, error: sErr } = await supabase
    .from('stops')
    .select('*');

  if (rErr || sErr || !allRoutes || !allStops) {
    console.error('Database query failed:', rErr || sErr);
    process.exit(1);
  }

  const stopsMap = new Map(allStops.map((s) => [s.id, s]));
  const totalRoutes = allRoutes.length;

  // Filter routes that are missing valid road_geometry (or pass --force-all to rerun everything)
  const forceAll = process.argv.includes('--force-all');
  const targetRoutesArg = process.argv.find((a) => a.startsWith('--routes='));
  const targetRoutesList = targetRoutesArg
    ? targetRoutesArg.split('=')[1].split(',').map((s) => s.trim().toUpperCase())
    : null;

  let routesToProcess = forceAll
    ? allRoutes
    : allRoutes.filter((r) => !Array.isArray(r.road_geometry) || r.road_geometry.length < 2);

  if (targetRoutesList && targetRoutesList.length > 0) {
    routesToProcess = allRoutes.filter((r) =>
      targetRoutesList.includes((r.route_number || r.id).trim().toUpperCase())
    );
  }

  console.log(`\nTotal routes in database: ${totalRoutes}`);
  console.log(`Routes to process in this run: ${routesToProcess.length} (forceAll: ${forceAll})`);

  const metrics: RouteChangeMetric[] = [];
  const DELAY_BETWEEN_ROUTES_MS = 1000;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < routesToProcess.length; i++) {
    const route = routesToProcess[i];
    const routeNum = route.route_number || route.id;
    const stopCount = route.stop_sequence?.length || 0;

    const originalGeom: [number, number][] = Array.isArray(route.road_geometry) ? route.road_geometry : [];
    const origDistKm = originalGeom.length >= 2 ? polylineDistanceMeters(originalGeom) / 1000 : 0;
    const origTurns = originalGeom.length >= 2 ? countSharpTurns(originalGeom) : 0;

    try {
      const geom = await fetchRouteGeometryWithFallback(route, stopsMap, GOOGLE_MAPS_API_KEY);

      if (!geom || geom.length < 2) {
        throw new Error('Empty geometry returned');
      }

      const newDistKm = polylineDistanceMeters(geom) / 1000;
      const newTurns = countSharpTurns(geom);
      const distChangeKm = newDistKm - origDistKm;
      const distChangePercent = origDistKm > 0 ? ((newDistKm - origDistKm) / origDistKm) * 100 : 0;
      const turnsEliminated = origTurns - newTurns;

      // Update Supabase immediately per route
      const { error: updateErr } = await supabase
        .from('routes')
        .update({ road_geometry: geom })
        .eq('id', route.id);

      if (updateErr) {
        console.error(`[${i + 1}/${routesToProcess.length}] ❌ Supabase update failed for Route ${routeNum}:`, updateErr.message);
        errorCount++;
      } else {
        successCount++;
        const isSignificant = Math.abs(distChangeKm) >= 0.3 || turnsEliminated >= 3;
        metrics.push({
          routeNumber: routeNum,
          routeId: route.id,
          stopCount,
          origPoints: originalGeom.length,
          newPoints: geom.length,
          origDistKm: Math.round(origDistKm * 100) / 100,
          newDistKm: Math.round(newDistKm * 100) / 100,
          distChangeKm: Math.round(distChangeKm * 100) / 100,
          distChangePercent: Math.round(distChangePercent * 10) / 10,
          origTurns,
          newTurns,
          turnsEliminated,
          isSignificant,
        });

        console.log(
          `[${i + 1}/${routesToProcess.length}] ✓ Route ${routeNum} (${stopCount} stops) -> ${geom.length} pts, ` +
            `${newDistKm.toFixed(2)} km (Δ: ${distChangeKm >= 0 ? '+' : ''}${distChangeKm.toFixed(2)} km, ` +
            `turns: ${origTurns} -> ${newTurns}${isSignificant ? ' 🌟 SIGNIFICANT IMPROVEMENT' : ''})`
        );
      }

      if ((i + 1) % 25 === 0 || i + 1 === routesToProcess.length) {
        console.log(`\n>>> PROGRESS: [${i + 1}/${routesToProcess.length}] processed (${successCount} succeeded, ${errorCount} failed) <<<\n`);
      }
    } catch (err: any) {
      errorCount++;
      console.error(`[${i + 1}/${routesToProcess.length}] ❌ Error on Route ${routeNum}:`, err.message);
    }

    if (i < routesToProcess.length - 1) {
      await sleep(DELAY_BETWEEN_ROUTES_MS);
    }
  }

  // Save metrics report
  const reportPath = path.resolve('scripts/arterial_snapping_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2));

  console.log('\n====================================================');
  console.log('🏁 ARTERIAL SNAPPING RUN COMPLETE');
  console.log('====================================================');
  console.log(`Total Routes Processed: ${routesToProcess.length}`);
  console.log(`Successful Updates: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  const significantRoutes = metrics.filter((m) => m.isSignificant);
  console.log(`\nRoutes with Significant Detour / Turn Improvements (${significantRoutes.length}):`);
  console.log('----------------------------------------------------');
  for (const sr of significantRoutes) {
    console.log(
      `- Route ${sr.routeNumber.padEnd(8)}: ${sr.origDistKm.toFixed(2)} km -> ${sr.newDistKm.toFixed(2)} km ` +
        `(${sr.distChangeKm >= 0 ? '+' : ''}${sr.distChangeKm.toFixed(2)} km, ${sr.distChangePercent}%), ` +
        `sharp turns reduced from ${sr.origTurns} to ${sr.newTurns} (-${sr.turnsEliminated} turns)`
    );
  }

  // Final database verification
  const { data: finalRoutes } = await supabase.from('routes').select('id, road_geometry');
  const finalWithGeom = (finalRoutes || []).filter(
    (r) => Array.isArray(r.road_geometry) && r.road_geometry.length >= 2
  ).length;
  console.log(`\nFinal Supabase Status: ${finalWithGeom}/${finalRoutes?.length || 0} routes with valid geometry.`);
}

main().catch((err) => {
  console.error('Fatal error running backfill script:', err);
  process.exit(1);
});

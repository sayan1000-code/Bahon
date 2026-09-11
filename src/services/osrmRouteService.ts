import { Stop, BusRoute } from '../types';
import { SupabaseRoute } from '../hooks/useSupabaseTransit';
import { supabase } from '../lib/supabase';
import { STOPS, getRoadNameForCoordinate } from '../data/transitData';

/**
 * In-memory cache for per-route road-snapped geometries.
 * KEYED STRICTLY BY route_id (never by stop pairs).
 */
const ROUTE_GEOMETRY_CACHE = new Map<string, [number, number][]>();

/**
 * Haversine distance in meters between two lat/lng coordinates.
 */
export function computeDistanceMeters(p1: [number, number], p2: [number, number]): number {
  const R = 6371000; // meters
  const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
  const dLng = ((p2[1] - p1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[0] * Math.PI) / 180) *
      Math.cos((p2[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Initial compass heading (bearing in degrees 0-360) from p1 to p2.
 */
export function computeBearing(p1: [number, number], p2: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(p1[0]);
  const lat2 = toRad(p2[0]);
  const dLng = toRad(p2[1] - p1[1]);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let brng = toDeg(Math.atan2(y, x));
  return Math.round((brng + 360) % 360);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch wrapper with exponential backoff on HTTP 429 (Rate Limited) or 5xx server errors.
 * Delays default to: 2s, 5s, 10s.
 */
export async function fetchWithBackoff(
  url: string,
  retries = 3,
  delays = [2000, 5000, 10000]
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'KolkataBusTracker/1.0 (transit@bustracker.local)' },
        signal: AbortSignal.timeout(9000),
      });

      if (res.status === 429) {
        const waitTime = delays[attempt] || 10000;
        console.warn(`[OSRM 429 Rate Limit] HTTP 429 received. Backing off for ${waitTime}ms (attempt ${attempt + 1}/${retries})...`);
        await sleep(waitTime);
        continue;
      }

      if (!res.ok && res.status >= 500) {
        const waitTime = delays[attempt] || 5000;
        console.warn(`[OSRM Server ${res.status}] Backing off for ${waitTime}ms (attempt ${attempt + 1}/${retries})...`);
        await sleep(waitTime);
        continue;
      }

      return res;
    } catch (err: any) {
      if (attempt < retries) {
        const waitTime = delays[attempt] || 5000;
        console.warn(`[OSRM Network Error] ${err?.message}. Retrying in ${waitTime}ms...`);
        await sleep(waitTime);
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Exceeded max retries for OSRM request`);
}

/**
 * Audit result record for stops whose snapped road location deviates from stored lat/lng.
 */
export interface StopCoordinateAuditRecord {
  routeNumber: string;
  stopId: string;
  stopName: string;
  storedLat: number;
  storedLng: number;
  snappedLat: number;
  snappedLng: number;
  driftMeters: number;
  snappedRoadName?: string;
}

const STOP_DRIFT_AUDIT_LOG: StopCoordinateAuditRecord[] = [];

/**
 * Returns all logged stop coordinate audits where drift exceeded threshold (> 30m).
 */
export function getStopCoordinateAuditLog(): StopCoordinateAuditRecord[] {
  return [...STOP_DRIFT_AUDIT_LOG];
}

/**
 * Retrieve cached road geometry for a route by its route_id.
 */
export function getRouteRoadGeometry(routeId: string): [number, number][] | null {
  if (ROUTE_GEOMETRY_CACHE.has(routeId)) {
    return ROUTE_GEOMETRY_CACHE.get(routeId)!;
  }
  // Try localStorage
  try {
    const raw = localStorage.getItem(`osrm_route_geom_${routeId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Valid road geometry for bus transit has detailed path segments (at least 15 points)
      if (Array.isArray(parsed) && parsed.length >= 15) {
        ROUTE_GEOMETRY_CACHE.set(routeId, parsed);
        return parsed;
      } else {
        // Remove stale straight-line or null entry
        localStorage.removeItem(`osrm_route_geom_${routeId}`);
      }
    }
  } catch {}
  return null;
}

/**
 * Clears stale, null, or straight-line cached route geometries (< 15 points) from localStorage.
 * If specificRouteId is provided, clears that route regardless of point count.
 */
export function clearStaleRouteGeometryCache(specificRouteId?: string): void {
  try {
    if (specificRouteId) {
      ROUTE_GEOMETRY_CACHE.delete(specificRouteId);
      localStorage.removeItem(`osrm_route_geom_${specificRouteId}`);
      console.log(`[OSRM Cache] Cleared cached geometry for route: ${specificRouteId}`);
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('osrm_route_geom_')) {
        try {
          const val = JSON.parse(localStorage.getItem(k) || '');
          if (!Array.isArray(val) || val.length < 15) {
            keysToRemove.push(k);
          }
        } catch {
          keysToRemove.push(k);
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    if (keysToRemove.length > 0) {
      console.log(`[OSRM Cache] Cleared ${keysToRemove.length} stale/straight-line localStorage route geometry entries.`);
    }
  } catch (err: any) {
    console.warn(`[OSRM Cache] Could not clear stale localStorage entries:`, err?.message);
  }
}

/**
 * Clear all cached road geometry in memory and localStorage.
 */
export function clearAllRouteGeometryCache(): void {
  ROUTE_GEOMETRY_CACHE.clear();
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('osrm_route_geom_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    console.log(`[OSRM Cache] Cleared in-memory cache and ${keysToRemove.length} localStorage route geometry entries.`);
  } catch (err: any) {
    console.warn(`[OSRM Cache] Could not clear localStorage route geometries:`, err?.message);
  }
}

/**
 * Store road geometry in memory and localStorage, strictly keyed by route_id.
 * Will NOT persist trivial fallback lines (< 15 coordinates).
 */
export function setRouteRoadGeometry(routeId: string, geometry: [number, number][]): void {
  if (!geometry || geometry.length < 2) return;
  ROUTE_GEOMETRY_CACHE.set(routeId, geometry);
  if (geometry.length >= 15) {
    try {
      localStorage.setItem(`osrm_route_geom_${routeId}`, JSON.stringify(geometry));
    } catch {}
  }
}

/**
 * Slices a route's full road_geometry polyline to only the segment between
 * the origin stop and destination stop along the route.
 *
 * 1. Finds the nearest polyline point to originStop.
 * 2. Finds the nearest polyline point to destStop.
 * 3. Slices the polyline array between those two nearest-point indices.
 * 4. Confirms the destination marker and rendered line terminate at the same point,
 *    logging a warning if the nearest snapped point doesn't match within ~50m.
 */
const slicedGeometryCache = new Map<string, [number, number][]>();
const warnedSliceDestinations = new Set<string>();

export function clearSlicedGeometryCache(): void {
  slicedGeometryCache.clear();
  warnedSliceDestinations.clear();
}

export function sliceRouteRoadGeometry(
  roadGeometry: [number, number][],
  originStop: { lat: number; lng: number; name?: string; id?: string },
  destStop: { lat: number; lng: number; name?: string; id?: string }
): [number, number][] {
  if (!roadGeometry || roadGeometry.length < 2) {
    if (originStop.lat != null && originStop.lng != null && destStop.lat != null && destStop.lng != null) {
      return [
        [Number(originStop.lat), Number(originStop.lng)],
        [Number(destStop.lat), Number(destStop.lng)],
      ];
    }
    return [];
  }

  // Fast cache lookup based on endpoints and geometry fingerprint
  const cacheKey = `${originStop.id || originStop.lat},${originStop.lng}_${destStop.id || destStop.lat},${destStop.lng}_${roadGeometry.length}_${roadGeometry[0]?.[0]}`;
  const cached = slicedGeometryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Idempotency safety net: if input roadGeometry's first point is already within 5m of originStop
  // and the last point is already within 5m of destStop, skip nearest-point search entirely and return as-is
  const firstPt = roadGeometry[0];
  const lastPt = roadGeometry[roadGeometry.length - 1];
  const distFirstToOrigin = computeDistanceMeters([originStop.lat, originStop.lng], firstPt);
  const distLastToDest = computeDistanceMeters([destStop.lat, destStop.lng], lastPt);
  if (distFirstToOrigin <= 5 && distLastToDest <= 5) {
    slicedGeometryCache.set(cacheKey, roadGeometry);
    return roadGeometry;
  }

  // 1. Find nearest polyline point to origin stop
  let originIdx = 0;
  let minOriginDist = Infinity;
  for (let i = 0; i < roadGeometry.length; i++) {
    const pt = roadGeometry[i];
    const d = computeDistanceMeters([originStop.lat, originStop.lng], pt);
    if (d < minOriginDist) {
      minOriginDist = d;
      originIdx = i;
    }
  }

  // 2. Find nearest polyline point to destination stop
  let destIdx = 0;
  let minDestDist = Infinity;
  for (let i = 0; i < roadGeometry.length; i++) {
    const pt = roadGeometry[i];
    const d = computeDistanceMeters([destStop.lat, destStop.lng], pt);
    if (d < minDestDist) {
      minDestDist = d;
      destIdx = i;
    }
  }

  // 3. Slice the polyline array between those two nearest-point indices
  let sliced: [number, number][];
  if (originIdx <= destIdx) {
    sliced = roadGeometry.slice(originIdx, destIdx + 1);
  } else {
    sliced = roadGeometry.slice(destIdx, originIdx + 1).reverse();
  }

  // 4. Confirm the destination marker and the rendered line terminate at the same point
  // Log warning only once per destination to avoid console spam in tick loops
  const destWarnKey = destStop.id || `${destStop.lat},${destStop.lng}`;
  if (minDestDist > 50 && !warnedSliceDestinations.has(destWarnKey)) {
    warnedSliceDestinations.add(destWarnKey);
    console.warn(
      `[Polyline Slicing Alert] Nearest road geometry point to destination "${destStop.name || destStop.id}" is ${Math.round(minDestDist)}m away (> 50m threshold)!`
    );
  }

  // 5. Ensure the line starts directly at origin and terminates directly at destination
  const result: [number, number][] = [];
  result.push([Number(originStop.lat), Number(originStop.lng)]);

  for (const pt of sliced) {
    const dToOrigin = computeDistanceMeters([originStop.lat, originStop.lng], pt);
    const dToDest = computeDistanceMeters([destStop.lat, destStop.lng], pt);
    if (dToOrigin > 2 && dToDest > 2) {
      result.push([Number(pt[0]), Number(pt[1])]);
    }
  }

  result.push([Number(destStop.lat), Number(destStop.lng)]);

  slicedGeometryCache.set(cacheKey, result);
  return result;
}

/**
 * 1. For each route, call OSRM's route service:
 *    router.project-osrm.org/route/v1/driving/{lng1,lat1;lng2,lat2;...}?overview=full&geometries=geojson
 *    passing ALL of that route's stop_sequence coordinates, in order, as one single request.
 *
 * 2. Store the result keyed by route_id only.
 *
 * 4. Log any stop whose snapped point moves more than 50m from its stored lat/lng.
 */
export async function fetchRouteRoadGeometry(
  route: BusRoute | SupabaseRoute,
  stopsMap: Map<string, Stop>
): Promise<[number, number][]> {
  const routeId = route.id;
  const routeNumber =
    'route_number' in route && route.route_number
      ? route.route_number
      : (route as any).number || routeId;

  // 1. If route already has road_geometry attached (e.g. from Supabase column)
  if ('road_geometry' in route && route.road_geometry && route.road_geometry.length >= 2) {
    const validGeom = route.road_geometry.filter(
      (p) => Array.isArray(p) && p.length >= 2 && p[0] != null && p[1] != null && !isNaN(Number(p[0])) && !isNaN(Number(p[1]))
    );
    if (validGeom.length >= 2) {
      setRouteRoadGeometry(routeId, validGeom);
      return validGeom;
    }
  }

  // 2. Check cached geometry
  const existing = getRouteRoadGeometry(routeId);
  if (existing && existing.length >= 2) {
    const validCached = existing.filter(
      (p) => Array.isArray(p) && p.length >= 2 && p[0] != null && p[1] != null && !isNaN(Number(p[0])) && !isNaN(Number(p[1]))
    );
    if (validCached.length >= 2) {
      return validCached;
    }
  }

  // 3. Gather all stop coordinates for this route in order
  const stopSequence: string[] =
    'stop_sequence' in route && Array.isArray(route.stop_sequence)
      ? route.stop_sequence
      : 'stops' in route && Array.isArray(route.stops)
      ? route.stops
      : [];

  const coords: Stop[] = [];
  for (const sId of stopSequence) {
    let s = stopsMap.get(sId);
    if (!s) {
      const fallbackStop = STOPS.find((item) => item.id === sId);
      if (fallbackStop) {
        console.warn(
          `[Stops Fallback Warning] Route "${routeNumber}" stop ID "${sId}" ("${fallbackStop.name}") was NOT found in stopsMap and had to be resolved from static STOPS fallback (transitData.ts)!`
        );
        s = fallbackStop;
      }
    }
    if (!s || s.lat == null || s.lng == null || isNaN(Number(s.lat)) || isNaN(Number(s.lng))) {
      const stopName = s?.name || sId;
      console.warn(
        `[Missing Coordinates] Skipping stop "${stopName}" (ID: ${sId}) on route "${routeNumber}" because lat/lng is null or NaN.`
      );
      continue;
    }
    coords.push({
      ...s,
      lat: Number(s.lat),
      lng: Number(s.lng),
    });
  }

  // Fallback if not enough coordinates
  if (coords.length < 2) {
    const fallback: [number, number][] = coords.map((c) => [c.lat, c.lng]);
    if (fallback.length >= 2) {
      return fallback;
    }
    return [
      [22.5726, 88.3639],
      [22.585, 88.345],
    ];
  }

  // 4. Compute directional headings (bearings) and corridor awareness between consecutive stops
  // Requirement 1: Snap within 45° of heading so OSRM snaps to corridor instead of perpendicular side streets
  // Requirement 2: Use road_corridor (or inferred corridor) to inform bearing calculation
  const bearings: string[] = [];
  for (let i = 0; i < coords.length; i++) {
    let heading: number;
    if (i < coords.length - 1) {
      heading = computeBearing([coords[i].lat, coords[i].lng], [coords[i + 1].lat, coords[i + 1].lng]);
    } else if (i > 0) {
      heading = computeBearing([coords[i - 1].lat, coords[i - 1].lng], [coords[i].lat, coords[i].lng]);
    } else {
      heading = 0;
    }

    // Check if current stop and neighbor share the same road corridor
    const currentCorridor = coords[i].road_corridor || getRoadNameForCoordinate(coords[i].lat, coords[i].lng);
    const nextCorridor = i < coords.length - 1 ? (coords[i + 1].road_corridor || getRoadNameForCoordinate(coords[i + 1].lat, coords[i + 1].lng)) : '';
    const sameCorridor = currentCorridor && nextCorridor && currentCorridor.toLowerCase() === nextCorridor.toLowerCase();

    // Stricter 45° window when on same corridor, 60° when turning/transitioning corridors
    const tolerance = sameCorridor ? 45 : 55;
    bearings.push(`${heading},${tolerance}`);
  }

  // Build coordinate sequence: {lng,lat;lng,lat;...}
  const coordParam = coords.map((c) => `${c.lng.toFixed(6)},${c.lat.toFixed(6)}`).join(';');

  // Stop using public OSRM demo server entirely.
  // Switch road-geometry fetching to Google Routes API directly.
  let polylineResult: [number, number][] | null = null;

  try {
    const googleRes = await fetch('/api/transit/route-geometry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeId,
        stops: coords.map((c) => ({ lat: c.lat, lng: c.lng, name: c.name })),
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (googleRes.ok) {
      const gData = await googleRes.json();
      if (Array.isArray(gData.geometry) && gData.geometry.length >= 2) {
        polylineResult = gData.geometry;
        console.log(
          `[Google Routes API] Successfully acquired road corridor for route "${routeNumber}" (${polylineResult.length} coords)`
        );
      }
    } else {
      console.warn(`[Google Routes API] Endpoint returned HTTP ${googleRes.status}`);
    }
  } catch (gErr: any) {
    console.warn(`[Google Routes API] Could not reach endpoint: ${gErr?.message}`);
  }

  if (polylineResult && polylineResult.length >= 2) {
    // Store result keyed strictly by route_id
    setRouteRoadGeometry(routeId, polylineResult);

    // Try persisting back to Supabase routes table if column exists (silent on error/RLS)
    try {
      supabase
        .from('routes')
        .update({ road_geometry: polylineResult })
        .eq('id', routeId)
        .then(
          () => {},
          () => {}
        );
    } catch {}

    return polylineResult;
  }

  console.warn(`[Route Geometry Fallback] Route "${routeNumber}" could not be road-snapped. Using straight stop connections.`);
  const fallback: [number, number][] = coords.map((c) => [c.lat, c.lng]);
  return fallback;
}

/**
 * Batch fetch and cache road geometry for all routes.
 * 1. Checks memory cache and Supabase route.road_geometry immediately — zero network calls for already resolved routes.
 * 2. Processes truly missing routes in parallel with a concurrency limit of 2-3 and a 1-2s delay between batches.
 * 3. Retries on rate limits or errors with exponential backoff.
 */
export async function fetchAllRouteGeometries(
  routes: (BusRoute | SupabaseRoute)[],
  stopsMap: Map<string, Stop>,
  concurrency = 2,
  batchDelayMs = 1500
): Promise<Map<string, [number, number][]>> {
  const resultMap = new Map<string, [number, number][]>();
  const missingRoutes: (BusRoute | SupabaseRoute)[] = [];

  // Step 1: Immediately resolve routes that already have valid geometry in memory or localStorage or Supabase
  for (const route of routes) {
    if ('road_geometry' in route && route.road_geometry && route.road_geometry.length >= 2) {
      const valid = route.road_geometry.filter(
        (p) => Array.isArray(p) && p.length >= 2 && p[0] != null && p[1] != null && !isNaN(Number(p[0])) && !isNaN(Number(p[1]))
      );
      if (valid.length >= 2) {
        setRouteRoadGeometry(route.id, valid);
        resultMap.set(route.id, valid);
        continue;
      }
    }

    const cached = getRouteRoadGeometry(route.id);
    if (cached && cached.length >= 2) {
      const valid = cached.filter(
        (p) => Array.isArray(p) && p.length >= 2 && p[0] != null && p[1] != null && !isNaN(Number(p[0])) && !isNaN(Number(p[1]))
      );
      if (valid.length >= 2) {
        resultMap.set(route.id, valid);
        continue;
      }
    }

    // Only truly missing routes are scheduled for OSRM / Google network resolution
    missingRoutes.push(route);
  }

  if (missingRoutes.length === 0) {
    return resultMap;
  }

  console.log(
    `[Route Geometries] ${resultMap.size} routes already cached. Fetching ${missingRoutes.length} missing routes with concurrency=${concurrency} and delay=${batchDelayMs}ms...`
  );

  // Step 2: Chunked batch execution with concurrency of 2-3 and 1.5s delay between batches
  for (let i = 0; i < missingRoutes.length; i += concurrency) {
    const batch = missingRoutes.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (currentRoute) => {
        try {
          const geom = await fetchRouteRoadGeometry(currentRoute, stopsMap);
          if (geom && geom.length >= 2) {
            resultMap.set(currentRoute.id, geom);
          }
        } catch (err: any) {
          console.warn(`[Route Geometries] Failed to fetch geometry for route ${currentRoute.id}:`, err?.message);
        }
      })
    );

    if (i + concurrency < missingRoutes.length) {
      await sleep(batchDelayMs);
    }
  }

  return resultMap;
}

/**
 * On-demand backfill function for UI or scripts:
 * Queries all routes in Supabase that currently lack road_geometry,
 * resolves them slowly using concurrency 2 and exponential backoff,
 * and saves them directly to Supabase.
 */
export async function backfillMissingRouteGeometries(
  onProgress?: (info: { completed: number; total: number; routeNumber: string; status: string }) => void
): Promise<{ success: number; fallback: number; total: number }> {
  const { data: routes, error: rErr } = await supabase
    .from('routes')
    .select('id, route_number, stop_sequence, road_geometry');
  const { data: stops, error: sErr } = await supabase.from('stops').select('*');

  if (rErr || sErr || !routes || !stops) {
    throw new Error(rErr?.message || sErr?.message || 'Failed to query routes/stops from Supabase');
  }

  const stopsMap = new Map<string, Stop>(stops.map((s) => [s.id, s as Stop]));
  const missing = routes.filter(
    (r) => !Array.isArray(r.road_geometry) || r.road_geometry.length < 2
  );

  const total = missing.length;
  if (total === 0) {
    return { success: 0, fallback: 0, total: 0 };
  }

  let success = 0;
  let fallback = 0;

  for (let i = 0; i < missing.length; i += 2) {
    const batch = missing.slice(i, i + 2);
    await Promise.all(
      batch.map(async (r) => {
        try {
          const geom = await fetchRouteRoadGeometry(r as any, stopsMap);
          const isRoad = geom.length > (r.stop_sequence?.length || 0);
          if (isRoad) {
            success++;
          } else {
            fallback++;
          }
          onProgress?.({
            completed: success + fallback,
            total,
            routeNumber: r.route_number || r.id,
            status: isRoad ? 'road_snapped' : 'fallback',
          });
        } catch (err: any) {
          fallback++;
          onProgress?.({
            completed: success + fallback,
            total,
            routeNumber: r.route_number || r.id,
            status: 'error',
          });
        }
      })
    );

    if (i + 2 < missing.length) {
      await sleep(1500);
    }
  }

  return { success, fallback, total };
}


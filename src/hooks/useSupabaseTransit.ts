import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Stop, BusRoute, BusType, PersistentBus } from '../types';
import { computeCumulativeDistances, interpolatePositionAlongLoop } from '../data/persistentFleet';
import { getRoadNameForCoordinate } from '../data/transitData';
import {
  getRouteRoadGeometry,
  setRouteRoadGeometry,
  clearStaleRouteGeometryCache,
  fetchAllRouteGeometries,
} from '../services/osrmRouteService';

export interface SupabaseStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  road_corridor?: string;
}

export interface SupabaseRoute {
  id: string;
  route_number: string;
  stop_sequence: string[];
  one_way_minutes: number | null;
  turnaround_minutes: number | null;
  headway_minutes: number | null;
  fleet_size: number | null;
  base_fare: number | null;
  fare_per_stop: number | null;
  road_geometry?: [number, number][] | null;
}

export interface SupabaseTripInstance {
  id: string;
  route_id: string;
  bus_slot: number;
  departure_at: string;
}

// Color palette mapping for Supabase routes
const ROUTE_COLORS: Record<string, { color: string; bgBadge: string; textBadge: string; type: BusType }> = {
  'S-23A': { color: '#2563eb', bgBadge: 'bg-blue-600', textBadge: 'text-white', type: 'AC Express' },
  '11A': { color: '#059669', bgBadge: 'bg-emerald-600', textBadge: 'text-white', type: 'Regular' },
  '12N': { color: '#d97706', bgBadge: 'bg-amber-600', textBadge: 'text-white', type: 'Regular' },
  '14A': { color: '#7c3aed', bgBadge: 'bg-purple-600', textBadge: 'text-white', type: 'AC Express' },
  '15': { color: '#dc2626', bgBadge: 'bg-red-600', textBadge: 'text-white', type: 'Regular' },
  '3': { color: '#0891b2', bgBadge: 'bg-cyan-600', textBadge: 'text-white', type: 'Regular' },
  '33': { color: '#4f46e5', bgBadge: 'bg-indigo-600', textBadge: 'text-white', type: 'Regular' },
  '5-N': { color: '#ea580c', bgBadge: 'bg-orange-600', textBadge: 'text-white', type: 'Regular' },
  '6-N': { color: '#16a34a', bgBadge: 'bg-green-600', textBadge: 'text-white', type: 'Regular' },
  '7A': { color: '#db2777', bgBadge: 'bg-pink-600', textBadge: 'text-white', type: 'Electric' },
  'S-12': { color: '#2563eb', bgBadge: 'bg-blue-600', textBadge: 'text-white', type: 'AC Express' },
  '24B': { color: '#059669', bgBadge: 'bg-emerald-600', textBadge: 'text-white', type: 'Regular' },
  'AC39': { color: '#7c3aed', bgBadge: 'bg-purple-600', textBadge: 'text-white', type: 'AC Express' },
  'L238': { color: '#ea580c', bgBadge: 'bg-orange-600', textBadge: 'text-white', type: 'Regular' },
};

export function toTransitStop(s: SupabaseStop): Stop {
  if (s.lat == null || s.lng == null || isNaN(Number(s.lat)) || isNaN(Number(s.lng))) {
    console.warn(`[Missing Coordinates] Stop "${s.name}" (${s.id}) has null/NaN coordinates [lat: ${s.lat}, lng: ${s.lng}].`);
  }
  const code = (s.name || s.id)
    .split(/[\s_-]+/)
    .map((w) => w[0]?.toUpperCase() || '')
    .slice(0, 3)
    .join('');

  // Use existing road_corridor from database or infer from coordinate / name
  const roadCorridor = s.road_corridor || getRoadNameForCoordinate(Number(s.lat) || 0, Number(s.lng) || 0);

  return {
    id: s.id,
    name: s.name,
    code: code ? `${code}-01` : 'STP-01',
    platform: `${s.name} Platform`,
    lat: s.lat != null ? Number(s.lat) : (NaN as any),
    lng: s.lng != null ? Number(s.lng) : (NaN as any),
    description: `Transit stop at ${s.name}, Kolkata`,
    road_corridor: roadCorridor,
  };
}

export function toTransitRoute(r: SupabaseRoute): BusRoute {
  const styling = ROUTE_COLORS[r.route_number] || {
    color: '#2563eb',
    bgBadge: 'bg-blue-600',
    textBadge: 'text-white',
    type: 'Regular' as BusType,
  };

  return {
    id: r.id,
    number: r.route_number,
    name: `${r.route_number} City Transit`,
    type: styling.type,
    color: styling.color,
    bgBadge: styling.bgBadge,
    textBadge: styling.textBadge,
    stops: r.stop_sequence || [],
    baseFare: r.base_fare ?? 10,
    farePerStop: r.fare_per_stop ?? 3,
    road_geometry: r.road_geometry || undefined,
  };
}

/**
 * 3. Fetch all stops from Supabase
 */
export async function fetchSupabaseStops(): Promise<Stop[]> {
  const { data: stops, error } = await supabase.from('stops').select('*');
  if (error || !stops) {
    console.warn('Error reading stops from Supabase:', error);
    return [];
  }
  return stops.map(toTransitStop);
}

/**
 * 3. Fetch all routes from Supabase
 */
export async function fetchSupabaseRoutes(): Promise<BusRoute[]> {
  const { data: routes, error } = await supabase.from('routes').select('*');
  if (error || !routes) {
    console.warn('Error reading routes from Supabase:', error);
    return [];
  }
  return routes.map(toTransitRoute);
}

/**
 * 4. Add a function to fetch today's trip_instances for a route:
 *    const { data: trips } = await supabase.from('trip_instances').select('*').eq('route_id', routeId)
 */
export async function fetchTodayTripInstances(routeId: string): Promise<SupabaseTripInstance[]> {
  const { data: trips, error } = await supabase
    .from('trip_instances')
    .select('*')
    .eq('route_id', routeId);
  if (error || !trips) {
    console.warn(`Error reading trip_instances for route ${routeId} from Supabase:`, error);
    return [];
  }
  return trips as SupabaseTripInstance[];
}

/**
 * Fetch all trip instances across all routes from Supabase
 */
export async function fetchAllTripInstances(): Promise<SupabaseTripInstance[]> {
  const { data: trips, error } = await supabase.from('trip_instances').select('*');
  if (error || !trips) {
    console.warn('Error reading all trip_instances from Supabase:', error);
    return [];
  }
  return trips as SupabaseTripInstance[];
}

/**
 * 5. Deterministic bus-position function:
 * Instead of reading departureTime from the old dispatchSchedule/Firestore source,
 * read departure_at from each trip_instance.
 * Keep the same math:
/**
 * Safely parse departure time whether it's an ISO timestamp string,
 * a time string like "08:30:00", or a timestamp number.
 */
function parseDepartureTime(departureAt: string | number | undefined, now: number): number {
  if (!departureAt) return now;
  if (typeof departureAt === 'number') return departureAt;

  // 1. Try direct ISO / date parse
  const direct = new Date(departureAt).getTime();
  if (!isNaN(direct)) return direct;

  // 2. Try time-of-day format like "08:30:00" or "08:30"
  if (typeof departureAt === 'string') {
    const parts = departureAt.trim().split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const s = parts[2] ? parseInt(parts[2], 10) : 0;
      if (!isNaN(h) && !isNaN(m)) {
        const d = new Date(now);
        d.setHours(h, m, s, 0);
        return d.getTime();
      }
    }
  }

  return now;
}

export interface SupabaseBusLivePosition {
  id?: string;
  trip_id: string;
  route_id?: string;
  bus_slot?: number;
  lat: number;
  lng: number;
  speed_kmh?: number | null;
  heading?: number | null;
  reported_at?: string;
}

/**
 * 1. Live GPS Position lookup:
 * Queries bus_live_position for this trip_id, most recent reported_at.
 * If a row exists AND reported_at is within the last 60 seconds, returns the row.
 * Otherwise returns null.
 */
export async function fetchLatestBusLivePosition(
  tripId: string,
  maxAgeSeconds = 60
): Promise<SupabaseBusLivePosition | null> {
  try {
    const { data, error } = await supabase
      .from('bus_live_position')
      .select('*')
      .eq('trip_id', tripId)
      .order('reported_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const latest = data[0] as SupabaseBusLivePosition;
    if (!latest.reported_at) return null;

    const reportedTime = new Date(latest.reported_at).getTime();
    const ageSeconds = (Date.now() - reportedTime) / 1000;
    if (ageSeconds >= 0 && ageSeconds <= maxAgeSeconds) {
      return latest;
    }
    return null;
  } catch (err) {
    console.warn(`[getBusPosition] Error querying live GPS for trip ${tripId}:`, err);
    return null;
  }
}

/**
 * 2. Deterministic position function (Looped Round-Trip Model)
 *
 * Given a trip instance and its route, calculates continuous live bus position
 * looping back and forth between the route's terminals all day.
 *
 * Model:
 *   roundTripMinutes = 2 * one_way_minutes + 2 * turnaround_minutes
 *   cyclePosition = ((elapsed % roundTrip) + roundTrip) % roundTrip
 */
export function calculateDeterministicBusPosition(
  trip: SupabaseTripInstance,
  route: SupabaseRoute | BusRoute,
  stopsMap: Map<string, Stop>,
  now: number = Date.now()
): PersistentBus | null {
  const depTimeStr = trip.departure_at || (trip as any).departure_time || (trip as any).departureAt;
  const depTime = parseDepartureTime(depTimeStr, now);
  const rawOneWay =
    'one_way_minutes' in route && route.one_way_minutes != null
      ? route.one_way_minutes
      : 60;
  const one_way_minutes = rawOneWay > 0 ? rawOneWay : 60;

  const rawTurnaround =
    'turnaround_minutes' in route && route.turnaround_minutes != null
      ? route.turnaround_minutes
      : 10;
  const turnaround_minutes = rawTurnaround > 0 ? rawTurnaround : 10;

  // 1. Round-trip duration: 2 * one_way_minutes + 2 * turnaround_minutes
  const roundTripMinutes = 2 * one_way_minutes + 2 * turnaround_minutes;

  // 2. Elapsed time & cycle position wrapping continuously forever
  const elapsedMinutes = (now - depTime) / 60000;
  const cyclePosition = ((elapsedMinutes % roundTripMinutes) + roundTripMinutes) % roundTripMinutes;

  const stopSequence: string[] =
    'stop_sequence' in route && Array.isArray(route.stop_sequence)
      ? route.stop_sequence
      : 'stops' in route && Array.isArray(route.stops)
      ? route.stops
      : [];

  if (stopSequence.length === 0) return null;

  const maxStopIdx = stopSequence.length - 1;

  // 3. Determine direction, progress, and stopIndex within cycle
  let direction: 'outbound' | 'inbound' | 'turnaround_at_destination' | 'turnaround_at_origin';
  let progress: number;
  let stopIndex: number;
  let isDwelling = false;

  if (cyclePosition <= one_way_minutes) {
    direction = 'outbound';
    progress = cyclePosition / one_way_minutes;
    stopIndex = progress * maxStopIdx; // forward through stop_sequence
  } else if (cyclePosition <= one_way_minutes + turnaround_minutes) {
    direction = 'turnaround_at_destination';
    progress = 1; // parked at last stop
    stopIndex = maxStopIdx;
    isDwelling = true;
  } else if (cyclePosition <= 2 * one_way_minutes + turnaround_minutes) {
    direction = 'inbound';
    progress = (cyclePosition - one_way_minutes - turnaround_minutes) / one_way_minutes;
    stopIndex = (1 - progress) * maxStopIdx; // reverse through stop_sequence
  } else {
    direction = 'turnaround_at_origin';
    progress = 0; // parked at first stop
    stopIndex = 0;
    isDwelling = true;
  }

  // 4. Project continuous bus position along the per-route road_geometry polyline
  const roadGeom =
    ('road_geometry' in route && route.road_geometry && route.road_geometry.length >= 2)
      ? route.road_geometry
      : getRouteRoadGeometry(route.id);

  let path: [number, number][];
  if (roadGeom && roadGeom.length >= 2) {
    path = roadGeom.filter(
      (p) => Array.isArray(p) && p.length >= 2 && p[0] != null && p[1] != null && !isNaN(Number(p[0])) && !isNaN(Number(p[1]))
    );
  } else {
    // Fallback: straight lines connecting stops in stopSequence directly (never shared segments)
    path = [];
    const routeNum = ('route_number' in route ? route.route_number : (route as any).number) || route.id;
    for (let i = 0; i < stopSequence.length; i++) {
      const sId = stopSequence[i];
      const stop = stopsMap.get(sId);
      if (!stop || stop.lat == null || stop.lng == null || isNaN(Number(stop.lat)) || isNaN(Number(stop.lng))) {
        const stopName = stop?.name || sId;
        console.warn(
          `[Missing Coordinates] Skipping stop "${stopName}" (ID: ${sId}) on route "${routeNum}" in straight-line polyline because lat/lng is null or NaN.`
        );
        continue;
      }
      path.push([Number(stop.lat), Number(stop.lng)]);
    }
    if (path.length < 2) {
      path = [
        [22.5726, 88.3639],
        [22.585, 88.345],
      ];
    }
  }

  const cumDists = computeCumulativeDistances(path);
  const totalDist = cumDists[cumDists.length - 1] || 1;

  // Fraction along the route polyline from 0.0 to 1.0
  const fraction =
    direction === 'outbound' || direction === 'turnaround_at_destination'
      ? progress
      : 1 - progress;

  const targetDist = Math.max(0, Math.min(totalDist, fraction * totalDist));
  const safeTargetDist = isNaN(targetDist) ? 0 : targetDist;

  const { position, bearing: forwardBearing } = interpolatePositionAlongLoop(path, cumDists, safeTargetDist);
  const safePosition: [number, number] =
    isNaN(position[0]) || isNaN(position[1])
      ? [stopsMap.get(stopSequence[0])?.lat || 22.5726, stopsMap.get(stopSequence[0])?.lng || 88.3639]
      : position;

  // Inbound travels opposite along the road polyline
  const bearing = direction === 'inbound' ? (forwardBearing + 180) % 360 : forwardBearing;

  // Determine last passed stop and next stop based on direction
  let lastPassedStopId: string;
  let nextStopId: string;

  if (direction === 'outbound') {
    const passedIdx = Math.min(maxStopIdx, Math.floor(stopIndex));
    const nextIdx = Math.min(maxStopIdx, passedIdx + 1);
    lastPassedStopId = stopSequence[passedIdx] || stopSequence[0];
    nextStopId = stopSequence[nextIdx] || stopSequence[maxStopIdx];
  } else if (direction === 'turnaround_at_destination') {
    lastPassedStopId = stopSequence[maxStopIdx] || stopSequence[0];
    nextStopId = stopSequence[Math.max(0, maxStopIdx - 1)] || stopSequence[maxStopIdx];
  } else if (direction === 'inbound') {
    const passedIdx = Math.min(maxStopIdx, Math.ceil(stopIndex));
    const nextIdx = Math.max(0, Math.floor(stopIndex));
    lastPassedStopId = stopSequence[passedIdx] || stopSequence[maxStopIdx];
    nextStopId = stopSequence[nextIdx] || stopSequence[0];
  } else {
    lastPassedStopId = stopSequence[0];
    nextStopId = stopSequence[Math.min(1, maxStopIdx)] || stopSequence[0];
  }

  const routeNum =
    'route_number' in route && route.route_number
      ? route.route_number
      : (route as any).number || 'BUS';
  const routeId = route.id;
  const busSlot = trip.bus_slot ?? 0;
  const plateSuffix = String(busSlot + 1).padStart(2, '0');
  const licensePlate = `WB-04-S-${routeNum.replace(/[^A-Z0-9]/gi, '').slice(0, 3)}-${plateSuffix}`;

  const CROWD_LEVELS: ('Low' | 'Moderate' | 'Crowded')[] = ['Low', 'Moderate', 'Crowded'];
  const crowdLevel = CROWD_LEVELS[busSlot % CROWD_LEVELS.length];

  const color = 'color' in route && route.color ? route.color : '#2563eb';
  const type: BusType = 'type' in route && route.type ? (route.type as BusType) : 'Regular';
  const routeName = 'name' in route && route.name ? route.name : `Route ${routeNum}`;

  return {
    id: `supabase-bus-${trip.id || `${routeId}-${busSlot}`}`,
    licensePlate,
    routeId,
    routeNumber: routeNum,
    routeName,
    routeColor: color,
    type,
    speedKmh: isDwelling ? 0 : 32 + (busSlot % 3) * 2,
    crowdLevel,
    currentPos: safePosition,
    bearing,
    currentRoadName: getRoadNameForCoordinate(safePosition[0], safePosition[1]),
    direction,
    currentDistanceMeters: safeTargetDist,
    totalLoopDistanceMeters: totalDist,
    loopProgress: cyclePosition / roundTripMinutes,
    nextStopId,
    lastPassedStopId,
    isDwelling,
  };
}

/**
 * 2B. getBusPosition(trip, route, stopsMap, now, livePosition?):
 * - If livePosition is passed OR queried from bus_live_position for this trip_id, most recent reported_at:
 * - If a row exists AND reported_at is within the last 60 seconds, use that lat/lng/heading directly (real GPS mode).
 * - Otherwise, fall back to the existing calculateDeterministicBusPosition() logic unchanged.
 */
export async function getBusPosition(
  trip: SupabaseTripInstance,
  route: SupabaseRoute | BusRoute,
  stopsMap: Map<string, Stop>,
  now: number = Date.now(),
  cachedLivePos?: SupabaseBusLivePosition | null
): Promise<PersistentBus | null> {
  const deterministicBus = calculateDeterministicBusPosition(trip, route, stopsMap, now);
  if (!deterministicBus) return null;

  // 1. Check cached or fetch latest live position for this trip
  const live =
    cachedLivePos !== undefined
      ? cachedLivePos
      : await fetchLatestBusLivePosition(trip.id, 60);

  // 2. If row exists and within 60s, override coordinates, heading, and speed
  if (live && live.lat != null && live.lng != null && !isNaN(Number(live.lat)) && !isNaN(Number(live.lng))) {
    const lat = Number(live.lat);
    const lng = Number(live.lng);
    const reportedTime = live.reported_at ? new Date(live.reported_at).getTime() : now;
    const ageSec = (now - reportedTime) / 1000;

    if (ageSec >= 0 && ageSec <= 60) {
      return {
        ...deterministicBus,
        currentPos: [lat, lng],
        bearing: live.heading != null && !isNaN(Number(live.heading)) ? Number(live.heading) : deterministicBus.bearing,
        speedKmh: live.speed_kmh != null && !isNaN(Number(live.speed_kmh)) ? Number(live.speed_kmh) : deterministicBus.speedKmh,
        currentRoadName: getRoadNameForCoordinate(lat, lng),
        isLiveGps: true,
        reportedAt: live.reported_at,
      };
    }
  }

  // Fall back to the existing calculateDeterministicBusPosition() logic unchanged
  return deterministicBus;
}

/**
 * Synchronous variant of getBusPosition using a pre-fetched Map of latest live positions
 */
export function getBusPositionSync(
  trip: SupabaseTripInstance,
  route: SupabaseRoute | BusRoute,
  stopsMap: Map<string, Stop>,
  now: number = Date.now(),
  livePositionsMap?: Map<string, SupabaseBusLivePosition>
): PersistentBus | null {
  const deterministicBus = calculateDeterministicBusPosition(trip, route, stopsMap, now);
  if (!deterministicBus) return null;

  const live = livePositionsMap?.get(trip.id);
  if (live && live.lat != null && live.lng != null && !isNaN(Number(live.lat)) && !isNaN(Number(live.lng))) {
    const reportedTime = live.reported_at ? new Date(live.reported_at).getTime() : now;
    const ageSec = (now - reportedTime) / 1000;
    if (ageSec >= 0 && ageSec <= 60) {
      const lat = Number(live.lat);
      const lng = Number(live.lng);
      return {
        ...deterministicBus,
        currentPos: [lat, lng],
        bearing: live.heading != null && !isNaN(Number(live.heading)) ? Number(live.heading) : deterministicBus.bearing,
        speedKmh: live.speed_kmh != null && !isNaN(Number(live.speed_kmh)) ? Number(live.speed_kmh) : deterministicBus.speedKmh,
        currentRoadName: getRoadNameForCoordinate(lat, lng),
        isLiveGps: true,
        reportedAt: live.reported_at,
      };
    }
  }

  return deterministicBus;
}

/**
 * 3. React hook useSupabaseTransit
 * Replaces every Firestore read of stops/routes with Supabase queries.
 */
export function useSupabaseTransit() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [rawRoutes, setRawRoutes] = useState<SupabaseRoute[]>([]);
  const [trips, setTrips] = useState<SupabaseTripInstance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const stopsMap = useMemo(() => new Map(stops.map((s) => [s.id, s])), [stops]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    attemptedRouteIdsRef.current.clear();
    try {
      const [stopsRes, routesRes, tripsRes] = await Promise.all([
        supabase.from('stops').select('*'),
        supabase.from('routes').select('*'),
        supabase.from('trip_instances').select('*'),
      ]);

      if (stopsRes.error) console.error('Supabase stops error:', stopsRes.error);
      if (routesRes.error) console.error('Supabase routes error:', routesRes.error);
      if (tripsRes.error) console.error('Supabase trips error:', tripsRes.error);

      if (stopsRes.data) {
        setStops(stopsRes.data.map(toTransitStop));
      }
      if (routesRes.data) {
        setRawRoutes(routesRes.data as SupabaseRoute[]);
        const mappedRoutes = (routesRes.data as SupabaseRoute[]).map(toTransitRoute);
        setRoutes(mappedRoutes);

        // Clear any stale null / straight-line localStorage entries
        clearStaleRouteGeometryCache();

        // Seed cache directly with authentic Supabase road_geometry
        let syncedCount = 0;
        for (const r of mappedRoutes) {
          if (r.road_geometry && r.road_geometry.length >= 2) {
            setRouteRoadGeometry(r.id, r.road_geometry);
            if (r.number && r.number !== r.id) {
              setRouteRoadGeometry(r.number, r.road_geometry);
            }
            syncedCount++;
          }
        }
        const r7A = mappedRoutes.find((r) => r.number === '7A' || r.id === '7A');
        console.log(
          `[useSupabaseTransit] Synced road_geometry for ${syncedCount}/${mappedRoutes.length} routes from Supabase. Route 7A coordinates count: ${r7A?.road_geometry?.length || 0}`
        );
      }
      if (tripsRes.data) {
        setTrips(tripsRes.data as SupabaseTripInstance[]);
      }
    } catch (err: any) {
      console.error('Error loading Supabase transit data:', err);
      setError(err?.message || 'Failed to load transit data from Supabase');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const [geomVersion, setGeomVersion] = useState<number>(0);

  // Requirement 5: Loading guard tracking already-attempted or resolved route IDs
  // Prevents routes that failed or resolved once this session from being re-fetched on every re-render
  const attemptedRouteIdsRef = useRef<Set<string>>(new Set());

  // Requirement 4: Stable route-list identity (joined route IDs) and stops.length instead of unstable stopsMap object reference
  const stableRoutesKey = useMemo(() => routes.map((r) => r.id).sort().join(','), [routes]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Once stops and routes are loaded, fetch per-route road-snapped geometry
  useEffect(() => {
    if (routes.length === 0 || stops.length === 0) return;

    // Filter routes that have not yet been attempted this session and lack road_geometry
    const unattemptedRoutes = routes.filter((r) => {
      if (attemptedRouteIdsRef.current.has(r.id)) return false;
      if (r.road_geometry && r.road_geometry.length >= 2) {
        attemptedRouteIdsRef.current.add(r.id);
        return false;
      }
      return true;
    });

    if (unattemptedRoutes.length === 0) {
      return;
    }

    // Mark as attempted so duplicate runs cannot trigger concurrently
    unattemptedRoutes.forEach((r) => attemptedRouteIdsRef.current.add(r.id));

    // Fetch missing geometries concurrently with rate-limiting (concurrency = 2, delay = 1500ms)
    fetchAllRouteGeometries(unattemptedRoutes, stopsMap, 2).then((geoms) => {
      if (geoms.size > 0) {
        // Requirement 3: Batch the resulting setRoutes update into ONE single state update
        setRoutes((prevRoutes) =>
          prevRoutes.map((r) => {
            const newGeom = geoms.get(r.id);
            return newGeom ? { ...r, road_geometry: newGeom } : r;
          })
        );
        setGeomVersion((v) => v + 1);
      }
    });
  }, [stableRoutesKey, stops.length]); // Requirement 4: depends on stableRoutesKey and stops.length, NOT stopsMap

  // Compute live deterministic fleet for all trip instances
  const deterministicFleet = useMemo<PersistentBus[]>(() => {
    if (routes.length === 0) return [];

    // Index routes by all possible identifiers (UUID, string ID, route number)
    const routesMap = new Map<string, SupabaseRoute | BusRoute>();
    for (const r of rawRoutes) {
      routesMap.set(r.id, r);
      routesMap.set(String(r.id), r);
      if (r.route_number) {
        routesMap.set(r.route_number, r);
        routesMap.set(r.route_number.toLowerCase(), r);
      }
    }
    for (const r of routes) {
      if (!routesMap.has(r.id)) routesMap.set(r.id, r);
      if (!routesMap.has(String(r.id))) routesMap.set(String(r.id), r);
      if (r.number && !routesMap.has(r.number)) {
        routesMap.set(r.number, r);
        routesMap.set(r.number.toLowerCase(), r);
      }
    }

    const buses: PersistentBus[] = [];
    const now = Date.now();

    // Use trips from Supabase if available; if empty, generate continuous running slots for each route
    const effectiveTrips: SupabaseTripInstance[] =
      trips.length > 0
        ? trips
        : routes.flatMap((r) => [
            { id: `slot-${r.id}-0`, route_id: r.id, bus_slot: 0, departure_at: new Date(now - 10 * 60000).toISOString() },
            { id: `slot-${r.id}-1`, route_id: r.id, bus_slot: 1, departure_at: new Date(now - 25 * 60000).toISOString() },
            { id: `slot-${r.id}-2`, route_id: r.id, bus_slot: 2, departure_at: new Date(now - 40 * 60000).toISOString() },
            { id: `slot-${r.id}-3`, route_id: r.id, bus_slot: 3, departure_at: new Date(now - 55 * 60000).toISOString() },
          ]);

    for (const trip of effectiveTrips) {
      const route =
        routesMap.get(trip.route_id) ||
        routesMap.get(String(trip.route_id)) ||
        routesMap.get(trip.route_id?.toLowerCase?.() ?? '');
      if (route) {
        const bus = calculateDeterministicBusPosition(trip, route, stopsMap, now);
        if (bus) buses.push(bus);
      }
    }
    return buses;
  }, [trips, routes, rawRoutes, stopsMap, geomVersion]);

  return {
    stops,
    routes,
    rawRoutes,
    trips,
    stopsMap,
    deterministicFleet,
    isLoading,
    error,
    refreshTransitData: loadData,
    fetchTodayTripInstances,
    calculateDeterministicBusPosition: (
      trip: SupabaseTripInstance,
      route: SupabaseRoute | BusRoute,
      now?: number
    ) => calculateDeterministicBusPosition(trip, route, stopsMap, now),
    getBusPosition: (
      trip: SupabaseTripInstance,
      route: SupabaseRoute | BusRoute,
      now?: number,
      cachedLivePos?: SupabaseBusLivePosition | null
    ) => getBusPosition(trip, route, stopsMap, now, cachedLivePos),
    getBusPositionSync: (
      trip: SupabaseTripInstance,
      route: SupabaseRoute | BusRoute,
      now?: number,
      livePositionsMap?: Map<string, SupabaseBusLivePosition>
    ) => getBusPositionSync(trip, route, stopsMap, now, livePositionsMap),
  };
}

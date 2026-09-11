import { Stop, BusRoute, PersistentRoute, PersistentBus, MatchedBusInfo, JourneyQueryResult, SimulationPhase } from '../types';
import { STOPS, BUS_ROUTES, getRoadNameForCoordinate } from './transitData';
import { getRouteRoadGeometry, sliceRouteRoadGeometry } from '../services/osrmRouteService';
import { getAllUnderlyingStopIds, getCanonicalDisplayName } from './canonicalStops';

// Helper to compute equirectangular distance between two lat/lng points in meters
export function computeDistanceMeters(p1: [number, number], p2: [number, number]): number {
  const dLat = (p2[0] - p1[0]) * 111139;
  const avgLatRad = ((p1[0] + p2[0]) / 2) * (Math.PI / 180);
  const dLng = (p2[1] - p1[1]) * 111139 * Math.cos(avgLatRad);
  return Math.hypot(dLat, dLng);
}

// Compute cumulative distances along an ordered array of coordinates
export function computeCumulativeDistances(path: [number, number][]): number[] {
  const cum: number[] = [0];
  for (let i = 0; i < path.length - 1; i++) {
    const dist = computeDistanceMeters(path[i], path[i + 1]);
    cum.push(cum[i] + dist);
  }
  return cum;
}

// Smoothly interpolate position and bearing along a loop polyline (MovingMarker style)
export function interpolatePositionAlongLoop(
  path: [number, number][],
  cumDists: number[],
  distMeters: number
): { position: [number, number]; bearing: number } {
  const totalLength = cumDists[cumDists.length - 1];
  if (totalLength <= 0 || path.length < 2) {
    return { position: path[0] || [22.5726, 88.3639], bearing: 0 };
  }

  // Wrap around seamlessly
  const clampedDist = ((distMeters % totalLength) + totalLength) % totalLength;

  // Binary search for segment
  let low = 0;
  let high = cumDists.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (cumDists[mid] <= clampedDist) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const idx = Math.max(0, Math.min(high, path.length - 2));

  const p1 = path[idx];
  const p2 = path[idx + 1] || p1;
  const segDist = Math.max(0.001, cumDists[idx + 1] - cumDists[idx]);
  const segT = Math.max(0, Math.min(1, (clampedDist - cumDists[idx]) / segDist));

  const lat = p1[0] + (p2[0] - p1[0]) * segT;
  const lng = p1[1] + (p2[1] - p1[1]) * segT;

  const dLat = (p2[0] - p1[0]) * 111139;
  const dLng = (p2[1] - p1[1]) * 111139 * Math.cos(((p1[0] + p2[0]) / 2) * (Math.PI / 180));
  const bearing = (Math.atan2(dLng, dLat) * 180) / Math.PI;

  return {
    position: [lat, lng],
    bearing: (bearing + 360) % 360,
  };
}

// Helper to build a persistent closed-loop route from an ordered list of stop IDs
export function buildPersistentRouteFromStops(
  config: {
    id: string;
    number: string;
    name: string;
    type: 'Regular' | 'AC Express' | 'Electric';
    color: string;
    bgBadge: string;
    textBadge: string;
    stops: string[];
    baseFare: number;
    farePerStop: number;
    road_geometry?: [number, number][];
  },
  availableStops: Stop[] = STOPS
): PersistentRoute {
  const outboundStopIds = config.stops;
  const inboundStopIds = [...config.stops].reverse();
  const stopsLookup = new Map(availableStops.map((s) => [s.id, s]));

  // Retrieve per-route road geometry (prioritize config.road_geometry from Supabase, then memory/localStorage cache)
  const roadGeom =
    (config.road_geometry && config.road_geometry.length >= 2)
      ? config.road_geometry
      : (getRouteRoadGeometry(config.id) || (config.number ? getRouteRoadGeometry(config.number) : null));
  let outboundPath: [number, number][] = [];

  if (roadGeom && roadGeom.length >= 2) {
    outboundPath = roadGeom.filter(
      (p) => Array.isArray(p) && p.length >= 2 && p[0] != null && p[1] != null && !isNaN(Number(p[0])) && !isNaN(Number(p[1]))
    );
  } else {
    for (const sId of outboundStopIds) {
      const stop = stopsLookup.get(sId) || STOPS.find((s) => s.id === sId);
      if (!stop || stop.lat == null || stop.lng == null || isNaN(Number(stop.lat)) || isNaN(Number(stop.lng))) {
        const stopName = stop?.name || sId;
        console.warn(
          `[Missing Coordinates] Skipping stop "${stopName}" (ID: ${sId}) on route "${config.number || config.id}" in straight-line polyline because lat/lng is null or NaN.`
        );
        continue;
      }
      outboundPath.push([Number(stop.lat), Number(stop.lng)]);
    }
    if (outboundPath.length < 2) {
      outboundPath = [[22.5726, 88.3639], [22.585, 88.345]];
    }
  }

  const inboundPath = [...outboundPath].reverse();
  const fullLoopPath = [...outboundPath, ...inboundPath.slice(1)];
  const cumDistances = computeCumulativeDistances(fullLoopPath);
  const totalLoopDistanceMeters = cumDistances[cumDistances.length - 1] || 1;

  const stopDistances: Record<string, { outboundDist?: number; inboundDist?: number }> = {};
  const outCum = computeCumulativeDistances(outboundPath);
  const outTotal = outCum[outCum.length - 1] || 1;

  outboundStopIds.forEach((sId) => {
    const stop = stopsLookup.get(sId) || STOPS.find((s) => s.id === sId);
    if (!stop || stop.lat == null || stop.lng == null || isNaN(Number(stop.lat)) || isNaN(Number(stop.lng))) return;
    let closestDist = 0;
    let minDiff = Infinity;
    for (let i = 0; i < outboundPath.length; i++) {
      const d = Math.hypot(outboundPath[i][0] - Number(stop.lat), outboundPath[i][1] - Number(stop.lng));
      if (d < minDiff) {
        minDiff = d;
        closestDist = outCum[i];
      }
    }
    stopDistances[sId] = { ...(stopDistances[sId] || {}), outboundDist: closestDist };
  });

  inboundStopIds.forEach((sId) => {
    const outD = stopDistances[sId]?.outboundDist ?? 0;
    const inD = outTotal + (outTotal - outD);
    stopDistances[sId] = { ...(stopDistances[sId] || {}), inboundDist: inD };
  });

  return {
    ...config,
    road_geometry: roadGeom && roadGeom.length >= 2 ? roadGeom : undefined,
    outboundStopIds,
    inboundStopIds,
    outboundPath,
    inboundPath,
    fullLoopPath,
    cumDistances,
    totalLoopDistanceMeters,
    stopDistances,
  };
}


export const PERSISTENT_ROUTES: PersistentRoute[] = BUS_ROUTES.map((route) =>
  buildPersistentRouteFromStops({
    id: route.id,
    number: route.number,
    name: route.name,
    type: route.type,
    color: route.color,
    bgBadge: route.bgBadge,
    textBadge: route.textBadge,
    stops: route.stops,
    baseFare: route.baseFare,
    farePerStop: route.farePerStop,
    road_geometry: route.road_geometry,
  })
);

export const PERSISTENT_ROUTES_MAP = new Map<string, PersistentRoute>(
  PERSISTENT_ROUTES.map((r) => [r.id, r])
);

export function buildPersistentRoutes(
  routes: BusRoute[],
  stops: Stop[] = STOPS
): { routes: PersistentRoute[]; routesMap: Map<string, PersistentRoute> } {
  const pRoutes = routes.map((route) =>
    buildPersistentRouteFromStops(
      {
        id: route.id,
        number: route.number,
        name: route.name,
        type: route.type,
        color: route.color,
        bgBadge: route.bgBadge,
        textBadge: route.textBadge,
        stops: route.stops,
        baseFare: route.baseFare,
        farePerStop: route.farePerStop,
        road_geometry: route.road_geometry,
      },
      stops
    )
  );
  const routesMap = new Map<string, PersistentRoute>();
  pRoutes.forEach((r) => {
    routesMap.set(r.id, r);
    routesMap.set(String(r.id), r);
    if (r.number) {
      routesMap.set(r.number, r);
      routesMap.set(r.number.toLowerCase(), r);
    }
  });
  return { routes: pRoutes, routesMap };
}

// Initial fleet definitions (Requirement: at least 10 buses for each route so wait is ~5 mins or less)
interface InitialBusConfig {
  id: string;
  licensePlate: string;
  routeId: string;
  speedKmh: number;
  crowdLevel: 'Low' | 'Moderate' | 'Crowded';
  initialProgressFraction: number; // 0.0 - 1.0 along loop
}

const CROWD_LEVELS: ('Low' | 'Moderate' | 'Crowded')[] = ['Low', 'Moderate', 'Moderate', 'Crowded'];


function generateBusesForRoute(
  routeId: string,
  routeNumber: string,
  busCount: number,
  platePrefix: string,
  baseSpeed = 32
): InitialBusConfig[] {
  const configs: InitialBusConfig[] = [];
  const step = 1.0 / busCount;
  for (let i = 1; i <= busCount; i++) {
    const fraction = Number((((i - 1) * step + 0.03) % 1.0).toFixed(4));
    const plateNum = String(i).padStart(2, '0');
    configs.push({
      id: `bus-${routeNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}-${i}`,
      licensePlate: `${platePrefix}-${plateNum}`,
      routeId,
      speedKmh: baseSpeed + ((i % 3) - 1) * 2,
      crowdLevel: CROWD_LEVELS[i % CROWD_LEVELS.length],
      initialProgressFraction: fraction,
    });
  }
  return configs;
}

const INITIAL_BUS_CONFIGS: InitialBusConfig[] = BUS_ROUTES.flatMap((route, rIdx) => {
  // Prefix based on route number / type
  const prefix = route.type === 'AC Express' ? 'WB-19-AC' : 'WB-02-B';
  const platePrefix = `${prefix}-${route.number.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}`;
  // 8 buses per route as specified
  return generateBusesForRoute(route.id, route.number, 8, platePrefix, 32 + (rIdx % 4));
});

export function createInitialFleet(): PersistentBus[] {
  return INITIAL_BUS_CONFIGS.map((cfg) => {
    const route = PERSISTENT_ROUTES_MAP.get(cfg.routeId);
    if (!route) {
      throw new Error(`Route not found for bus ${cfg.id}: ${cfg.routeId}`);
    }

    const currentDistanceMeters = cfg.initialProgressFraction * route.totalLoopDistanceMeters;
    const { position, bearing } = interpolatePositionAlongLoop(
      route.fullLoopPath,
      route.cumDistances,
      currentDistanceMeters
    );

    const halfDist = route.stopDistances[route.outboundStopIds[route.outboundStopIds.length - 1]]?.outboundDist || (route.totalLoopDistanceMeters / 2);
    const direction: 'outbound' | 'inbound' = currentDistanceMeters <= halfDist ? 'outbound' : 'inbound';
    const currentRoadName = getRoadNameForCoordinate(position[0], position[1]);

    return {
      id: cfg.id,
      licensePlate: cfg.licensePlate,
      routeId: route.id,
      routeNumber: route.number,
      routeName: route.name,
      routeColor: route.color,
      type: route.type,
      speedKmh: cfg.speedKmh,
      crowdLevel: cfg.crowdLevel,
      currentPos: position,
      bearing,
      currentRoadName,
      direction,
      currentDistanceMeters,
      totalLoopDistanceMeters: route.totalLoopDistanceMeters,
      loopProgress: cfg.initialProgressFraction,
      nextStopId: route.outboundStopIds[1] || route.stops[0],
      lastPassedStopId: route.outboundStopIds[0] || route.stops[0],
      isDwelling: false,
    };
  });
}

/**
 * Real-world corridor congestion factor for Kolkata transit network:
 * Slower on high-density core corridors, faster on open highways/bypasses,
 * with peak-hour adjustments (9:00-11:30 AM & 5:00-8:30 PM).
 */
export function getCorridorCongestionFactor(roadName: string, hour = new Date().getHours()): number {
  const r = (roadName || '').toLowerCase();
  const isMorningPeak = hour >= 9 && hour <= 11;
  const isEveningPeak = hour >= 17 && hour <= 20;
  const isPeak = isMorningPeak || isEveningPeak;
  const peakMult = isPeak ? 0.78 : 1.0;

  // Ultra-dense bottlenecks & river crossings (~14-18 km/h)
  if (/howrah bridge|rabindra setu|strand|burrabazar|mg road|mahatma gandhi/i.test(r)) {
    return Math.max(0.42, 0.52 * peakMult);
  }
  // Central Kolkata urban corridors (~18-22 km/h)
  if (/central avenue|chittaranjan|lenin sarani|sealdah|maniktala|apc road|cit road/i.test(r)) {
    return Math.max(0.48, 0.62 * peakMult);
  }
  // Heavy arterial junctions (~22-26 km/h)
  if (/ajc bose|park street|exide|park circus|rabindra sadan|moulali/i.test(r)) {
    return Math.max(0.55, 0.70 * peakMult);
  }
  // Suburban / southern arterials (~25-30 km/h)
  if (/diamond harbour|behala|taratala|bt road|barrackpore trunk|shyambazar/i.test(r)) {
    return Math.max(0.62, 0.78 * peakMult);
  }
  // Major Bypasses (~35-42 km/h)
  if (/eastern metropolitan|e\.?m\.? bypass/i.test(r)) {
    return Math.min(1.15, 1.02 * (isPeak ? 0.88 : 1.08));
  }
  // High-speed expressways & wide satellite corridors (~42-52 km/h)
  if (/vip road|kazi nazrul|belghoria|jessore|new town|major arterial|mar|biswa bangla|kona expressway/i.test(r)) {
    return Math.min(1.30, 1.18 * (isPeak ? 0.92 : 1.22));
  }

  return isPeak ? 0.82 : 0.96;
}

// Advances a bus along its loop by deltaSeconds with congestion-adjusted speed and stop dwell logic
export function advanceBusAlongLoop(
  bus: PersistentBus,
  route: PersistentRoute,
  deltaSeconds: number,
  simSpeedMultiplier = 1
): PersistentBus {
  // If bus is dwelling at stop platform for boarding/alighting
  if (bus.isDwelling && (bus.dwellRemainingSeconds ?? 0) > 0) {
    const remaining = (bus.dwellRemainingSeconds ?? 0) - deltaSeconds * simSpeedMultiplier;
    if (remaining > 0) {
      return {
        ...bus,
        isDwelling: true,
        dwellRemainingSeconds: remaining,
      };
    }
    // Dwell finished! Resume moving forward along the route intended
    bus = {
      ...bus,
      isDwelling: false,
      dwellRemainingSeconds: 0,
    };
  }

  // Speed adjusted by corridor congestion and peak hours
  const congestionFactor = getCorridorCongestionFactor(bus.currentRoadName);
  const effectiveSpeedKmh = Math.max(14, Math.round(bus.speedKmh * congestionFactor));

  // Speed in meters/sec (with 3.5x visual sim pace so buses visibly glide along streets in real time)
  const visualScale = 3.5;
  const speedMps = ((effectiveSpeedKmh * 1000) / 3600) * simSpeedMultiplier * visualScale;
  const distanceAdvance = speedMps * deltaSeconds;

  const prevDistance = bus.currentDistanceMeters;
  const newDistance = (prevDistance + distanceAdvance) % route.totalLoopDistanceMeters;

  const halfDist =
    route.stopDistances[route.outboundStopIds[route.outboundStopIds.length - 1]]?.outboundDist ||
    route.totalLoopDistanceMeters / 2;

  const direction: 'outbound' | 'inbound' = newDistance <= halfDist ? 'outbound' : 'inbound';
  const activeStops = direction === 'outbound' ? route.outboundStopIds : route.inboundStopIds;

  // Intermediate Stop Dwell: Trigger a 16s pause when bus arrives at an intermediate stop platform
  for (let i = 0; i < activeStops.length; i++) {
    const sId = activeStops[i];
    const sDist = direction === 'outbound' ? route.stopDistances[sId]?.outboundDist : route.stopDistances[sId]?.inboundDist;
    if (sDist !== undefined) {
      const justReached = prevDistance < sDist && newDistance >= sDist;
      const wrappedReached = prevDistance > newDistance && (prevDistance < sDist || newDistance >= sDist);
      if ((justReached || wrappedReached) && bus.lastDwelledStopId !== sId) {
        const { position: stopPos, bearing: stopBearing } = interpolatePositionAlongLoop(
          route.fullLoopPath,
          route.cumDistances,
          sDist
        );
        const stopRoad = getRoadNameForCoordinate(stopPos[0], stopPos[1]);
        return {
          ...bus,
          currentPos: stopPos,
          bearing: stopBearing,
          currentRoadName: stopRoad,
          direction,
          currentDistanceMeters: sDist,
          loopProgress: sDist / route.totalLoopDistanceMeters,
          isDwelling: true,
          dwellRemainingSeconds: 16,
          lastDwelledStopId: sId,
          lastPassedStopId: sId,
          nextStopId: activeStops[Math.min(activeStops.length - 1, i + 1)] || sId,
        };
      }
    }
  }

  const { position, bearing } = interpolatePositionAlongLoop(
    route.fullLoopPath,
    route.cumDistances,
    newDistance
  );

  const currentRoadName = getRoadNameForCoordinate(position[0], position[1]);

  // Determine next stop along current direction
  let nextStopId = activeStops[activeStops.length - 1];
  let lastPassedStopId = activeStops[0];

  for (let i = 0; i < activeStops.length; i++) {
    const sId = activeStops[i];
    const sDist = direction === 'outbound' ? route.stopDistances[sId]?.outboundDist : route.stopDistances[sId]?.inboundDist;
    if (sDist !== undefined) {
      if (newDistance < sDist) {
        nextStopId = sId;
        lastPassedStopId = activeStops[Math.max(0, i - 1)];
        break;
      }
    }
  }

  return {
    ...bus,
    currentPos: position,
    bearing,
    currentRoadName,
    direction,
    currentDistanceMeters: newDistance,
    loopProgress: newDistance / route.totalLoopDistanceMeters,
    nextStopId,
    lastPassedStopId,
  };
}

// Cache indexes for ultra-fast journey queries without freezing the UI thread
let cachedRoutesRef: PersistentRoute[] | null = null;
let routesByStopIndex = new Map<string, PersistentRoute[]>();

export function getRoutesByStopIndex(routes: PersistentRoute[] = PERSISTENT_ROUTES): Map<string, PersistentRoute[]> {
  if (cachedRoutesRef === routes && routesByStopIndex.size > 0) {
    return routesByStopIndex;
  }
  cachedRoutesRef = routes;
  const index = new Map<string, PersistentRoute[]>();
  for (const r of routes) {
    const stopIds = new Set([...(r.outboundStopIds || []), ...(r.inboundStopIds || [])]);
    for (const sId of stopIds) {
      let list = index.get(sId);
      if (!list) {
        list = [];
        index.set(sId, list);
      }
      list.push(r);
    }
  }
  routesByStopIndex = index;
  return index;
}

let cachedStopsRef: Stop[] | null = null;
let stopsMapIndex = new Map<string, Stop>();

export function getStopsMapIndex(stops: Stop[] = STOPS): Map<string, Stop> {
  if (cachedStopsRef === stops && stopsMapIndex.size > 0) {
    return stopsMapIndex;
  }
  cachedStopsRef = stops;
  const map = new Map<string, Stop>();
  for (const s of STOPS) {
    map.set(s.id, s);
  }
  if (stops && stops.length > 0) {
    for (const s of stops) {
      map.set(s.id, s);
    }
  }
  stopsMapIndex = map;
  return map;
}

export function groupBusesByRoute(fleet: PersistentBus[]): Map<string, PersistentBus[]> {
  const map = new Map<string, PersistentBus[]>();
  for (const b of fleet) {
    let list = map.get(b.routeId);
    if (!list) {
      list = [];
      map.set(b.routeId, list);
    }
    list.push(b);
    if (b.routeNumber && b.routeNumber !== b.routeId) {
      let nList = map.get(b.routeNumber);
      if (!nList) {
        nList = [];
        map.set(b.routeNumber, nList);
      }
      nList.push(b);
    }
  }
  return map;
}

// Internal helper to find direct matching buses for a single leg between two stops
function findDirectLegMatches(
  startStopId: string,
  destStopId: string,
  fleet: PersistentBus[],
  startStop: Stop,
  destStop: Stop,
  preferredBusId?: string | null,
  routes: PersistentRoute[] = PERSISTENT_ROUTES,
  stops: Stop[] = STOPS,
  includeGeometry: boolean = true,
  busesByRouteMap?: Map<string, PersistentBus[]>
): MatchedBusInfo[] {
  const matchedBuses: MatchedBusInfo[] = [];
  const targetDestIds = getAllUnderlyingStopIds(destStopId, stops);
  const targetDestSet = new Set(targetDestIds);
  const stopsMap = getStopsMapIndex(stops);

  for (const route of routes) {
    // Check outbound: find earliest stop downstream of startStopId matching any candidate destination
    const outStartIdx = route.outboundStopIds.indexOf(startStopId);
    let outDestIdx = -1;
    let outMatchedDestId = '';
    if (outStartIdx !== -1) {
      for (let i = outStartIdx + 1; i < route.outboundStopIds.length; i++) {
        if (targetDestSet.has(route.outboundStopIds[i])) {
          outDestIdx = i;
          outMatchedDestId = route.outboundStopIds[i];
          break;
        }
      }
    }
    const matchesOutbound = outStartIdx !== -1 && outDestIdx !== -1;

    // Check inbound: find earliest stop downstream of startStopId matching any candidate destination
    const inStartIdx = route.inboundStopIds.indexOf(startStopId);
    let inDestIdx = -1;
    let inMatchedDestId = '';
    if (inStartIdx !== -1) {
      for (let i = inStartIdx + 1; i < route.inboundStopIds.length; i++) {
        if (targetDestSet.has(route.inboundStopIds[i])) {
          inDestIdx = i;
          inMatchedDestId = route.inboundStopIds[i];
          break;
        }
      }
    }
    const matchesInbound = inStartIdx !== -1 && inDestIdx !== -1;

    if (!matchesOutbound && !matchesInbound) continue;

    // HARD CHECK: Both origin and a valid destination in targetDestIds must exist in the route
    const allRouteStopIds = route.outboundStopIds || route.stops || [];
    const hasOrigin = allRouteStopIds.includes(startStopId) || route.inboundStopIds?.includes(startStopId);
    const hasDest = targetDestIds.some(
      (id) => allRouteStopIds.includes(id) || route.inboundStopIds?.includes(id)
    );
    if (!hasOrigin || !hasDest) {
      continue;
    }

    const matchedDirections: Array<{
      direction: 'outbound' | 'inbound';
      startIdx: number;
      destIdx: number;
      matchedDestId: string;
    }> = [];
    if (matchesOutbound) {
      matchedDirections.push({
        direction: 'outbound',
        startIdx: outStartIdx,
        destIdx: outDestIdx,
        matchedDestId: outMatchedDestId,
      });
    }
    if (matchesInbound) {
      matchedDirections.push({
        direction: 'inbound',
        startIdx: inStartIdx,
        destIdx: inDestIdx,
        matchedDestId: inMatchedDestId,
      });
    }

    const routeBuses = busesByRouteMap
      ? (busesByRouteMap.get(route.id) || busesByRouteMap.get(String(route.id)) || busesByRouteMap.get(route.number) || [])
      : fleet.filter(
          (b) => b.routeId === route.id || String(b.routeId) === String(route.id) || b.routeNumber === route.number
        );

    if (routeBuses.length === 0) continue;

    for (const matchDir of matchedDirections) {
      const isOutbound = matchDir.direction === 'outbound';
      const actualDestId = matchDir.matchedDestId;
      const actualDestStop =
        stopsMap.get(actualDestId) ||
        destStop;

      const startDist = isOutbound
        ? route.stopDistances[startStopId]?.outboundDist ?? 0
        : route.stopDistances[startStopId]?.inboundDist ?? 0;
      const destDist = isOutbound
        ? route.stopDistances[actualDestId]?.outboundDist ?? route.totalLoopDistanceMeters
        : route.stopDistances[actualDestId]?.inboundDist ?? route.totalLoopDistanceMeters;

      const stopsSpan = matchDir.destIdx - matchDir.startIdx;
      const fare = route.baseFare + Math.max(0, stopsSpan - 1) * route.farePerStop;
      const distanceStartToDestMeters = Math.max(1000, Math.abs(destDist - startDist));

      // Extract path slice from start stop to destination stop along the route using road_geometry
      // When includeGeometry is false (e.g. during candidate search), skip expensive geometry calculation!
      let pathFromStartToDest: [number, number][] = [];
      if (includeGeometry) {
        const baseRoadGeom: [number, number][] =
          (route.road_geometry && route.road_geometry.length >= 2)
            ? route.road_geometry
            : (getRouteRoadGeometry(route.id) ||
               (route.number ? getRouteRoadGeometry(route.number) : null) ||
               (route.outboundPath && route.outboundPath.length >= 2 ? route.outboundPath : []));

        pathFromStartToDest = sliceRouteRoadGeometry(
          baseRoadGeom,
          startStop,
          actualDestStop
        );
      }

      for (const bus of routeBuses) {
        const isSameDirection =
          bus.direction === matchDir.direction ||
          (matchDir.direction === 'outbound' && bus.direction === 'turnaround_at_origin') ||
          (matchDir.direction === 'inbound' && bus.direction === 'turnaround_at_destination');
        const busDist = bus.currentDistanceMeters;
        const busSpeedKmh = bus.speedKmh || 32;

        let tripPhase: SimulationPhase = 'approaching';
        let distanceToStart = 0;
        let etaToStartMinutes = 0;
        let distanceToDestMeters = 0;
        let etaToDestMinutes = 0;
        let hasPassedStartStop = false;
        let isPastDest = false;
        let statusNote = '';

        if (isSameDirection) {
          if (busDist < startDist - 40) {
            // Approaching start stop platform
            tripPhase = 'approaching';
            distanceToStart = startDist - busDist;
            etaToStartMinutes = Math.max(0.2, Math.round(((distanceToStart / 1000) / busSpeedKmh) * 60 * 10) / 10);
            distanceToDestMeters = destDist - busDist;
            etaToDestMinutes = Math.max(1, Math.round(((distanceToDestMeters / 1000) / busSpeedKmh) * 60));
            hasPassedStartStop = false;
            statusNote =
              etaToStartMinutes <= 1.0
                ? `Arriving at ${startStop.name} now (< 1 min)`
                : `Approaching ${startStop.name} (ETA ~${Math.round(etaToStartMinutes)} min)`;
          } else if (busDist <= startDist + 40 || (bus.isDwelling && Math.abs(busDist - startDist) <= 90)) {
            // At the bus stop platform - Boarding now!
            tripPhase = 'boarding';
            distanceToStart = 0;
            etaToStartMinutes = 0;
            distanceToDestMeters = Math.max(500, destDist - busDist);
            etaToDestMinutes = Math.max(1, Math.round(((distanceToDestMeters / 1000) / busSpeedKmh) * 60));
            hasPassedStartStop = false;
            statusNote = `Bus at ${startStop.name} platform — Boarding now!`;
          } else if (busDist < destDist - 40) {
            // Cruising on the intended route after reaching the bus stop!
            tripPhase = 'in_transit';
            hasPassedStartStop = true;
            distanceToStart = 0;
            etaToStartMinutes = 0;
            distanceToDestMeters = Math.max(0, destDist - busDist);
            etaToDestMinutes = Math.max(0.5, Math.round(((distanceToDestMeters / 1000) / busSpeedKmh) * 60 * 10) / 10);
            statusNote = bus.isDwelling
              ? `Station stop • Exchanging passengers (${bus.currentRoadName})`
              : `En route to ${actualDestStop.name} • On ${bus.currentRoadName}`;
          } else if (busDist <= destDist + 60 || (preferredBusId && bus.id === preferredBusId && (busDist >= destDist - 40 || isPastDest))) {
            // Arrived at destination stop!
            tripPhase = 'arrived_dest';
            hasPassedStartStop = true;
            distanceToStart = 0;
            etaToStartMinutes = 0;
            distanceToDestMeters = 0;
            etaToDestMinutes = 0;
            statusNote = `Arrived at destination (${actualDestStop.name})! Trip complete.`;
          } else {
            // Completed trip, continuing on loop
            tripPhase = 'approaching';
            hasPassedStartStop = true;
            isPastDest = true;
            distanceToStart = (startDist - busDist + route.totalLoopDistanceMeters) % route.totalLoopDistanceMeters;
            etaToStartMinutes = Math.max(1, Math.round(((distanceToStart / 1000) / busSpeedKmh) * 60 * 10) / 10);
            distanceToDestMeters = (destDist - busDist + route.totalLoopDistanceMeters) % route.totalLoopDistanceMeters;
            etaToDestMinutes = Math.max(2, Math.round(((distanceToDestMeters / 1000) / busSpeedKmh) * 60));
            statusNote = `Passed ${actualDestStop.name}; returning in ~${Math.round(etaToStartMinutes)} min after loop`;
          }
        } else {
          // Opposite loop direction
          tripPhase = 'approaching';
          hasPassedStartStop = true;
          isPastDest = true;
          distanceToStart = (startDist - busDist + route.totalLoopDistanceMeters) % route.totalLoopDistanceMeters;
          etaToStartMinutes = Math.max(1, Math.round(((distanceToStart / 1000) / busSpeedKmh) * 60 * 10) / 10);
          distanceToDestMeters = (destDist - busDist + route.totalLoopDistanceMeters) % route.totalLoopDistanceMeters;
          etaToDestMinutes = Math.max(2, Math.round(((distanceToDestMeters / 1000) / busSpeedKmh) * 60));
          statusNote = `Operating on reverse loop; returns in ~${Math.round(etaToStartMinutes)} min`;
        }

        const activeStops = isOutbound ? route.outboundStopIds : route.inboundStopIds;
        const currentStopIdx = activeStops.indexOf(bus.nextStopId);
        const stopsRemainingToStart = Math.max(0, matchDir.startIdx - currentStopIdx);
        const stopsRemainingToDest = Math.max(0, matchDir.destIdx - currentStopIdx);

        const intermediateStops = includeGeometry
          ? activeStops
              .slice(matchDir.startIdx + 1, matchDir.destIdx)
              .map((id) => stopsMap.get(id))
              .filter((s): s is Stop => Boolean(s))
          : [];

        matchedBuses.push({
          bus,
          route,
          direction: matchDir.direction,
          hasPassedStartStop,
          isPastDest,
          distanceToStartMeters: Math.round(distanceToStart),
          etaToStartMinutes,
          distanceStartToDestMeters: Math.round(distanceStartToDestMeters),
          travelTimeMinutes: tripPhase === 'in_transit' ? Math.max(1, Math.round(etaToDestMinutes)) : Math.max(2, Math.round(((distanceStartToDestMeters / 1000) / busSpeedKmh) * 60)),
          fare,
          statusNote,
          stopsRemainingToStart,
          stopsSpanToDest: stopsSpan,
          pathFromStartToDest,
          intermediateStops,
          tripPhase,
          distanceToDestMeters: Math.round(distanceToDestMeters),
          etaToDestMinutes,
          stopsRemainingToDest,
          destinationStop: actualDestStop,
        });
      }
    }
  }

  matchedBuses.sort((a, b) => {
    // If user is locked onto an active trip bus, keep tracking it at all times!
    if (preferredBusId) {
      if (a.bus.id === preferredBusId) return -1;
      if (b.bus.id === preferredBusId) return 1;
    }

    const rankPhase = (m: MatchedBusInfo) => {
      // If user is already tracking this bus, prioritize it above all else
      if (preferredBusId && m.bus.id === preferredBusId) {
        if (m.tripPhase === 'arrived_dest') return -2;
        if (m.tripPhase === 'in_transit') return -1;
        if (m.tripPhase === 'boarding') return 0;
        if (m.tripPhase === 'approaching') return 1;
      }

      // Boarding right now at start platform
      if (m.tripPhase === 'boarding') return 0;
      // Approaching departure platform from upstream without looping
      if (m.tripPhase === 'approaching' && !m.hasPassedStartStop && !m.isPastDest) return 1;
      // In transit (already passed start stop; cannot board unless already on it)
      if (m.tripPhase === 'in_transit') return 10;
      // Past destination or reverse loop (requires riding full loop)
      if (m.isPastDest) return 20;
      if (m.tripPhase === 'arrived_dest') return 30;
      return 40;
    };

    const rankA = rankPhase(a);
    const rankB = rankPhase(b);
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    if (!a.hasPassedStartStop && !b.hasPassedStartStop && !a.isPastDest && !b.isPastDest) {
      return a.etaToStartMinutes - b.etaToStartMinutes;
    }

    if (a.tripPhase === 'in_transit' && b.tripPhase === 'in_transit') {
      return (a.distanceToDestMeters ?? 0) - (b.distanceToDestMeters ?? 0);
    }

    return a.distanceToStartMeters - b.distanceToStartMeters;
  });

  return matchedBuses;
}

// Requirement 3: When a user selects a start stop and destination stop, do NOT create any new bus or route.
// Instead, run a query against the EXISTING persistent buses and routes.
interface CachedJourneyPlan {
  isDirect: boolean;
  directRoutes: PersistentRoute[];
  transferOptions: Array<{
    transferStop: Stop;
    leg1Routes: PersistentRoute[];
    leg2Routes: PersistentRoute[];
  }>;
}

const journeyTopologyPlanCache = new Map<string, CachedJourneyPlan>();

export function clearJourneyTopologyPlanCache(): void {
  journeyTopologyPlanCache.clear();
}

// Supports both direct connections and one-transfer journeys across old and new routes!
export function queryPersistentBusesForJourney(
  startStopId: string,
  destStopId: string,
  fleet: PersistentBus[],
  preferredBusId?: string | null,
  routes: PersistentRoute[] = PERSISTENT_ROUTES,
  stops: Stop[] = STOPS
): JourneyQueryResult | null {
  if (startStopId === destStopId) return null;

  const targetDestIds = getAllUnderlyingStopIds(destStopId, stops);
  if (targetDestIds.includes(startStopId) && targetDestIds.length === 1) return null;

  const stopsMap = getStopsMapIndex(stops);
  const startStop = stopsMap.get(startStopId);
  let destStop = stopsMap.get(destStopId);
  if (!destStop && targetDestIds.length > 0) {
    destStop = stopsMap.get(targetDestIds[0]);
  }
  if (!startStop || !destStop) return null;

  const routesByStop = getRoutesByStopIndex(routes);
  const busesByRoute = groupBusesByRoute(fleet);

  // Check topology plan cache so we never re-scan all routes on 250ms ticks
  const planKey = `${startStopId}:${destStopId}:${routes.length}`;
  let plan = journeyTopologyPlanCache.get(planKey);

  if (!plan) {
    const originRoutes = routesByStop.get(startStopId) || routes;
    const destSet = new Set(targetDestIds);

    // 1. Direct route candidates
    const directRoutes: PersistentRoute[] = [];
    for (const route of originRoutes) {
      const outStart = route.outboundStopIds.indexOf(startStopId);
      const outDest = route.outboundStopIds.findIndex((id, idx) => idx > outStart && destSet.has(id));
      const inStart = route.inboundStopIds.indexOf(startStopId);
      const inDest = route.inboundStopIds.findIndex((id, idx) => idx > inStart && destSet.has(id));
      if ((outStart !== -1 && outDest !== -1) || (inStart !== -1 && inDest !== -1)) {
        directRoutes.push(route);
      }
    }

    if (directRoutes.length > 0) {
      plan = { isDirect: true, directRoutes, transferOptions: [] };
    } else {
      // 2. Transfer route candidates
      const downstreamOriginStops = new Set<string>();
      const upstreamDestStops = new Set<string>();

      for (const route of originRoutes) {
        const outStart = route.outboundStopIds.indexOf(startStopId);
        if (outStart !== -1) {
          for (let i = outStart + 1; i < route.outboundStopIds.length; i++) {
            downstreamOriginStops.add(route.outboundStopIds[i]);
          }
        }
        const inStart = route.inboundStopIds.indexOf(startStopId);
        if (inStart !== -1) {
          for (let i = inStart + 1; i < route.inboundStopIds.length; i++) {
            downstreamOriginStops.add(route.inboundStopIds[i]);
          }
        }
      }

      const destRoutes: PersistentRoute[] = [];
      for (const dId of targetDestIds) {
        const rList = routesByStop.get(dId);
        if (rList) {
          for (const r of rList) destRoutes.push(r);
        }
      }

      for (const route of destRoutes) {
        for (let i = 0; i < route.outboundStopIds.length; i++) {
          if (destSet.has(route.outboundStopIds[i])) {
            for (let j = 0; j < i; j++) upstreamDestStops.add(route.outboundStopIds[j]);
            break;
          }
        }
        for (let i = 0; i < route.inboundStopIds.length; i++) {
          if (destSet.has(route.inboundStopIds[i])) {
            for (let j = 0; j < i; j++) upstreamDestStops.add(route.inboundStopIds[j]);
            break;
          }
        }
      }

      const transferOptions: Array<{ transferStop: Stop; leg1Routes: PersistentRoute[]; leg2Routes: PersistentRoute[] }> = [];
      for (const sId of downstreamOriginStops) {
        if (upstreamDestStops.has(sId) && sId !== startStopId && !destSet.has(sId)) {
          const tStop = stopsMap.get(sId);
          if (!tStop) continue;

          const leg1Routes = originRoutes.filter((r) => {
            const o = r.outboundStopIds.indexOf(startStopId);
            const t = r.outboundStopIds.indexOf(sId);
            if (o !== -1 && t !== -1 && o < t) return true;
            const io = r.inboundStopIds.indexOf(startStopId);
            const it = r.inboundStopIds.indexOf(sId);
            return io !== -1 && it !== -1 && io < it;
          });

          const leg2Routes = destRoutes.filter((r) => {
            const t = r.outboundStopIds.indexOf(sId);
            const d = r.outboundStopIds.findIndex((id, idx) => idx > t && destSet.has(id));
            if (t !== -1 && d !== -1) return true;
            const it = r.inboundStopIds.indexOf(sId);
            const id = r.inboundStopIds.findIndex((idxId, idx) => idx > it && destSet.has(idxId));
            return it !== -1 && id !== -1;
          });

          if (leg1Routes.length > 0 && leg2Routes.length > 0) {
            transferOptions.push({ transferStop: tStop, leg1Routes, leg2Routes });
          }
        }
      }

      plan = { isDirect: false, directRoutes: [], transferOptions };
    }

    journeyTopologyPlanCache.set(planKey, plan);
  }

  // 1. Direct Bus Evaluation
  if (plan.isDirect && plan.directRoutes.length > 0) {
    const directBuses = findDirectLegMatches(
      startStopId,
      destStopId,
      fleet,
      startStop,
      destStop,
      preferredBusId,
      plan.directRoutes,
      stops,
      false, // includeGeometry is false during match evaluation!
      busesByRoute
    );

    const viableDirectBuses = directBuses.filter(
      (b) =>
        !b.isPastDest &&
        (!b.hasPassedStartStop || b.tripPhase === 'boarding' || (preferredBusId && b.bus.id === preferredBusId))
    );

    const finalDirectBuses = viableDirectBuses.length > 0 ? viableDirectBuses : directBuses;

    if (finalDirectBuses.length > 0) {
      const primaryBus = finalDirectBuses[0] || null;
      const resolvedDestStop = primaryBus?.destinationStop || destStop;

      if (primaryBus) {
        // Slice geometry ONLY for primaryBus (uses memoized slice)
        const pRoute = primaryBus.route as any;
        const baseRoadGeom: [number, number][] =
          (pRoute.road_geometry && pRoute.road_geometry.length >= 2)
            ? pRoute.road_geometry
            : (getRouteRoadGeometry(primaryBus.route.id) ||
               (pRoute.number ? getRouteRoadGeometry(pRoute.number) : null) ||
               (pRoute.outboundPath && pRoute.outboundPath.length >= 2 ? pRoute.outboundPath : []));

        primaryBus.pathFromStartToDest = sliceRouteRoadGeometry(
          baseRoadGeom,
          startStop,
          resolvedDestStop
        );

        const activeStops = primaryBus.direction === 'outbound' ? (pRoute.outboundStopIds || pRoute.stops) : (pRoute.inboundStopIds || pRoute.stops);
        const startIdx = activeStops.indexOf(startStopId);
        const destIdx = activeStops.indexOf(resolvedDestStop.id);
        if (startIdx !== -1 && destIdx !== -1 && startIdx < destIdx) {
          primaryBus.intermediateStops = activeStops
            .slice(startIdx + 1, destIdx)
            .map((id: string) => stopsMap.get(id))
            .filter((s: Stop | undefined): s is Stop => Boolean(s));
        }
      }

      const allMatchingBusIds = Array.from(new Set(finalDirectBuses.map((m) => m.bus.id)));

      return {
        startStop,
        destStop: resolvedDestStop,
        matchingBuses: finalDirectBuses,
        primaryBus,
        allMatchingBusIds,
        transferJourney: null,
      };
    }
  }

  // 2. Transfer Bus Evaluation
  if (plan.transferOptions && plan.transferOptions.length > 0) {
    interface TransferCandidate {
      transferStop: Stop;
      leg1Bus: MatchedBusInfo;
      leg2Bus: MatchedBusInfo;
      totalAlongRouteDistanceMeters: number;
      leg1DistanceMeters: number;
      leg2DistanceMeters: number;
      totalStops: number;
      combinedScore: number;
    }

    const candidates: TransferCandidate[] = [];

    for (const option of plan.transferOptions) {
      const transferStop = option.transferStop;
      const leg1Buses = findDirectLegMatches(
        startStopId,
        transferStop.id,
        fleet,
        startStop,
        transferStop,
        null,
        option.leg1Routes,
        stops,
        false,
        busesByRoute
      );
      if (leg1Buses.length === 0) continue;

      const leg2Buses = findDirectLegMatches(
        transferStop.id,
        destStopId,
        fleet,
        transferStop,
        destStop,
        null,
        option.leg2Routes,
        stops,
        false,
        busesByRoute
      );
      if (leg2Buses.length === 0) continue;

      const leg1Candidates = leg1Buses.filter(
        (b) =>
          !b.isPastDest &&
          (!b.hasPassedStartStop || b.tripPhase === 'boarding' || (preferredBusId && b.bus.id === preferredBusId))
      );
      if (leg1Candidates.length === 0) continue;

      const leg2Candidates = leg2Buses.filter(
        (b) => !b.isPastDest && (!b.hasPassedStartStop || b.tripPhase === 'boarding')
      );
      if (leg2Candidates.length === 0) continue;

      const leg1Bus = leg1Candidates[0];
      const leg2Bus = leg2Candidates[0];

      const leg1DistanceMeters = leg1Bus.distanceStartToDestMeters;
      const leg2DistanceMeters = leg2Bus.distanceStartToDestMeters;
      const totalAlongRouteDistanceMeters = leg1DistanceMeters + leg2DistanceMeters;
      const totalStops = leg1Bus.stopsSpanToDest + leg2Bus.stopsSpanToDest;

      const isHowrahHub = transferStop.id === 'howrah' && startStopId !== 'howrah' && !targetDestIds.includes('howrah');
      const hubPenalty = isHowrahHub ? 15000 : 0;
      const excessiveDetourPenalty = leg2DistanceMeters > 35000 ? 50000 : 0;

      const score = totalAlongRouteDistanceMeters + hubPenalty + excessiveDetourPenalty;

      candidates.push({
        transferStop,
        leg1Bus,
        leg2Bus,
        totalAlongRouteDistanceMeters,
        leg1DistanceMeters,
        leg2DistanceMeters,
        totalStops,
        combinedScore: score,
      });
    }

    if (candidates.length > 0) {
      candidates.sort(
        (a, b) =>
          a.totalAlongRouteDistanceMeters - b.totalAlongRouteDistanceMeters ||
          a.combinedScore - b.combinedScore ||
          a.totalStops - b.totalStops ||
          a.leg1Bus.etaToStartMinutes - b.leg1Bus.etaToStartMinutes
      );
      const best = candidates[0];

      // Populate road geometries and intermediate stops for the winning transfer journey
      const pRoute1 = best.leg1Bus.route as any;
      const baseRoadGeom1: [number, number][] =
        (pRoute1.road_geometry && pRoute1.road_geometry.length >= 2)
          ? pRoute1.road_geometry
          : (getRouteRoadGeometry(best.leg1Bus.route.id) ||
             (pRoute1.number ? getRouteRoadGeometry(pRoute1.number) : null) ||
             (pRoute1.outboundPath && pRoute1.outboundPath.length >= 2 ? pRoute1.outboundPath : []));
      best.leg1Bus.pathFromStartToDest = sliceRouteRoadGeometry(baseRoadGeom1, startStop, best.transferStop);

      const pRoute2 = best.leg2Bus.route as any;
      const baseRoadGeom2: [number, number][] =
        (pRoute2.road_geometry && pRoute2.road_geometry.length >= 2)
          ? pRoute2.road_geometry
          : (getRouteRoadGeometry(best.leg2Bus.route.id) ||
             (pRoute2.number ? getRouteRoadGeometry(pRoute2.number) : null) ||
             (pRoute2.outboundPath && pRoute2.outboundPath.length >= 2 ? pRoute2.outboundPath : []));
      best.leg2Bus.pathFromStartToDest = sliceRouteRoadGeometry(baseRoadGeom2, best.transferStop, best.leg2Bus.destinationStop);

      const combinedPath: [number, number][] = [
        ...best.leg1Bus.pathFromStartToDest,
        ...best.leg2Bus.pathFromStartToDest.slice(1),
      ];

      const totalFare = best.leg1Bus.fare + best.leg2Bus.fare;
      const totalTravelTimeMinutes = best.leg1Bus.travelTimeMinutes + best.leg2Bus.travelTimeMinutes + 5; // 5 min transfer wait

      const transferJourney = {
        isTransfer: true as const,
        transferStop: best.transferStop,
        leg1Bus: best.leg1Bus,
        leg2Bus: best.leg2Bus,
        leg1Route: best.leg1Bus.route,
        leg2Route: best.leg2Bus.route,
        leg1IntermediateStops: best.leg1Bus.intermediateStops || [],
        leg2IntermediateStops: best.leg2Bus.intermediateStops || [],
        totalFare,
        totalTravelTimeMinutes,
        combinedPath,
      };

      const primaryBus: MatchedBusInfo = {
        ...best.leg1Bus,
        fare: totalFare,
        travelTimeMinutes: totalTravelTimeMinutes,
        pathFromStartToDest: combinedPath,
        intermediateStops: [
          ...(best.leg1Bus.intermediateStops || []),
          best.transferStop,
          ...(best.leg2Bus.intermediateStops || []),
        ],
        statusNote: `Transfer at ${best.transferStop.name} • 1st Bus: ${best.leg1Bus.route.number} (${best.leg1Bus.bus.licensePlate})`,
      };

      const allMatchingBusIds = Array.from(
        new Set([best.leg1Bus.bus.id, best.leg2Bus.bus.id, ...candidates.map((c) => c.leg1Bus.bus.id)])
      );

      const resolvedTransferDestStop = best.leg2Bus.destinationStop || destStop;

      return {
        startStop,
        destStop: resolvedTransferDestStop,
        matchingBuses: [best.leg1Bus, best.leg2Bus],
        primaryBus,
        allMatchingBusIds,
        transferJourney,
      };
    }
  }

  return null;
}

export interface ClosestRouteOption {
  route: PersistentRoute;
  bus: PersistentBus;
  destinationStop: Stop;
  distanceMeters: number;
  etaMinutes: number;
  direction: 'outbound' | 'inbound' | 'turnaround_at_destination' | 'turnaround_at_origin';
  intermediateStops?: Stop[];
}

/**
 * Finds all active bus routes passing through the given stop,
 * as featured in Kolkata Travel Router (kolkata-travel-router / Akash190104).
 */
export function findAvailableRoutesFromStop(stopId: string): PersistentRoute[] {
  const routesByStop = getRoutesByStopIndex(PERSISTENT_ROUTES);
  return routesByStop.get(stopId) || [];
}

/**
 * Finds the closest approaching bus route possible from the user's current stop.
 * Queries live fleet telemetry to determine which bus has the shortest ETA and distance.
 */
export function findClosestBusRoutePossible(
  currentStopId: string,
  fleet: PersistentBus[]
): ClosestRouteOption | null {
  const stopsMap = getStopsMapIndex(STOPS);
  const currentStop = stopsMap.get(currentStopId);
  if (!currentStop) return null;

  const routesByStop = getRoutesByStopIndex(PERSISTENT_ROUTES);
  const relevantRoutes = routesByStop.get(currentStopId) || [];
  if (relevantRoutes.length === 0) return null;

  const busesByRoute = groupBusesByRoute(fleet);
  const candidateOptions: ClosestRouteOption[] = [];

  for (const route of relevantRoutes) {
    const isOutbound = route.outboundStopIds.includes(currentStopId);
    const isInbound = route.inboundStopIds.includes(currentStopId);
    if (!isOutbound && !isInbound) continue;

    const routeBuses = busesByRoute.get(route.id) || [];

    if (isOutbound) {
      const destId = route.outboundStopIds[route.outboundStopIds.length - 1];
      const destStop = stopsMap.get(destId);
      if (destStop && destId !== currentStopId) {
        const currIdx = route.outboundStopIds.indexOf(currentStopId);
        const intermediateIds = currIdx !== -1 ? route.outboundStopIds.slice(currIdx + 1, -1) : [];
        const intermediateStops = intermediateIds
          .map((id) => stopsMap.get(id))
          .filter((s): s is Stop => Boolean(s));

        const stopDist = route.stopDistances[currentStopId]?.outboundDist ?? 0;
        for (const b of routeBuses) {
          if (b.direction === 'outbound' && b.currentDistanceMeters <= stopDist) {
            const dist = stopDist - b.currentDistanceMeters;
            const eta = Math.max(0.3, Math.round(((dist / 1000) / (b.speedKmh || 32)) * 60 * 10) / 10);
            candidateOptions.push({
              route,
              bus: b,
              destinationStop: destStop,
              distanceMeters: Math.round(dist),
              etaMinutes: eta,
              direction: 'outbound',
              intermediateStops,
            });
          }
        }
      }
    }

    if (isInbound) {
      const destId = route.inboundStopIds[route.inboundStopIds.length - 1];
      const destStop = stopsMap.get(destId);
      if (destStop && destId !== currentStopId) {
        const currIdx = route.inboundStopIds.indexOf(currentStopId);
        const intermediateIds = currIdx !== -1 ? route.inboundStopIds.slice(currIdx + 1, -1) : [];
        const intermediateStops = intermediateIds
          .map((id) => stopsMap.get(id))
          .filter((s): s is Stop => Boolean(s));

        const stopDist =
          route.stopDistances[currentStopId]?.inboundDist ?? (route.totalLoopDistanceMeters / 2);
        for (const b of routeBuses) {
          if (b.direction === 'inbound' && b.currentDistanceMeters <= stopDist) {
            const dist = stopDist - b.currentDistanceMeters;
            const eta = Math.max(0.3, Math.round(((dist / 1000) / (b.speedKmh || 32)) * 60 * 10) / 10);
            candidateOptions.push({
              route,
              bus: b,
              destinationStop: destStop,
              distanceMeters: Math.round(dist),
              etaMinutes: eta,
              direction: 'inbound',
              intermediateStops,
            });
          }
        }
      }
    }
  }

  // Fallback: If all buses on current leg passed stop, find nearest approaching bus on the closed loop
  if (candidateOptions.length === 0) {
    for (const b of fleet) {
      const r = PERSISTENT_ROUTES_MAP.get(b.routeId);
      if (!r) continue;
      if (!r.outboundStopIds.includes(currentStopId) && !r.inboundStopIds.includes(currentStopId))
        continue;

      const dist = computeDistanceMeters(b.currentPos, [currentStop.lat, currentStop.lng]);
      const eta = Math.max(0.5, Math.round(((dist / 1000) / (b.speedKmh || 32)) * 60 * 10) / 10);
      const destId =
        b.direction === 'outbound'
          ? r.outboundStopIds[r.outboundStopIds.length - 1]
          : r.inboundStopIds[r.inboundStopIds.length - 1];
      const destStop = stopsMap.get(destId) || STOPS[0];

      const stopsList = b.direction === 'outbound' ? r.outboundStopIds : r.inboundStopIds;
      const currIdx = stopsList.indexOf(currentStopId);
      const intermediateIds = currIdx !== -1 ? stopsList.slice(currIdx + 1, -1) : [];
      const intermediateStops = intermediateIds
        .map((id) => stopsMap.get(id))
        .filter((s): s is Stop => Boolean(s));

      candidateOptions.push({
        route: r,
        bus: b,
        destinationStop: destStop,
        distanceMeters: Math.round(dist),
        etaMinutes: eta,
        direction: b.direction,
        intermediateStops,
      });
    }
  }

  candidateOptions.sort((a, b) => a.etaMinutes - b.etaMinutes || a.distanceMeters - b.distanceMeters);
  return candidateOptions[0] || null;
}

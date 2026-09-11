/**
 * Corridor Snapping and Dense Cluster Simplification Service
 *
 * Prevents route geometry zigzagging by:
 * 1. Snapping stop coordinates towards OpenStreetMap arterial road centerlines
 *    (motorway, trunk, primary, secondary), favoring specific corridors (VIP Road,
 *    Jessore Road, EM Bypass, BT Road, Diamond Harbour Road, Biswa Bangla Sarani, etc.)
 *    over closer residential or minor alleys.
 * 2. Simplifying dense Old-Kolkata segments (e.g. Bagbazar / Sovabazar / Manicktala / Shyambazar)
 *    where 3+ consecutive stops are within ~100-130m on the same corridor by keeping the first & last
 *    as mandatory waypoints and treating middle ones as "passed near" (via: true).
 * 3. Flagging stops causing > 80m perpendicular detour off the main road corridor.
 */

import { computeDistanceMeters, computeBearing } from './osrmRouteService';
import arterialRoadsData from '../data/kolkataArterialRoads.json';

export interface CorridorStopPoint {
  id: string;
  name?: string;
  lat: number;
  lng: number;
  road_corridor?: string;
}

export interface SnappedWaypoint {
  id: string;
  name?: string;
  originalLat: number;
  originalLng: number;
  snappedLat: number;
  snappedLng: number;
  heading: number;
  radiusMeters: number; // Tight 15-20m radius
  isMandatoryWaypoint: boolean; // false if simplified in dense cluster
  isVia: boolean; // true if pass-through ("passed near")
  detourMeters: number;
  clusterId?: number;
  snappedRoadName?: string;
  snappedRoadType?: string;
}

export interface DetourAuditRecord {
  routeNumber: string;
  routeId: string;
  stopId: string;
  stopName: string;
  lat: number;
  lng: number;
  prevStopName: string;
  nextStopName: string;
  corridorName: string;
  detourMeters: number;
  triangularExtraDistanceMeters: number;
  reason: string;
  suggestedAction: string;
}

interface WaySegment {
  wayIndex: number;
  segIndex: number;
  name: string;
  ref: string;
  highway: string;
  p1: [number, number];
  p2: [number, number];
  bearing: number;
}

// Spatial grid buckets for sub-millisecond segment lookup
const BUCKET_SIZE = 0.01; // ~1.1km grid
let spatialGrid: Map<string, WaySegment[]> | null = null;

function pDistance(x: number, y: number, x1: number, y1: number, x2: number, y2: number) {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) param = dot / len_sq;
  let xx: number, yy: number;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  const dx = (x - xx) * 111139;
  const dy = (y - yy) * 111139 * Math.cos((x * Math.PI) / 180);
  const distMeters = Math.hypot(dx, dy);
  return { distMeters, snapLat: xx, snapLng: yy, param };
}

function initSpatialIndex() {
  if (spatialGrid) return spatialGrid;
  const grid = new Map<string, WaySegment[]>();
  const ways = arterialRoadsData as Array<{
    id: number;
    name: string;
    ref: string;
    highway: string;
    geom: [number, number][];
  }>;

  for (let wIdx = 0; wIdx < ways.length; wIdx++) {
    const w = ways[wIdx];
    for (let sIdx = 0; sIdx < w.geom.length - 1; sIdx++) {
      const p1 = w.geom[sIdx];
      const p2 = w.geom[sIdx + 1];
      const seg: WaySegment = {
        wayIndex: wIdx,
        segIndex: sIdx,
        name: w.name || '',
        ref: w.ref || '',
        highway: w.highway || '',
        p1,
        p2,
        bearing: computeBearing(p1, p2),
      };

      const minLat = Math.min(p1[0], p2[0]);
      const maxLat = Math.max(p1[0], p2[0]);
      const minLng = Math.min(p1[1], p2[1]);
      const maxLng = Math.max(p1[1], p2[1]);

      const bLatMin = Math.floor(minLat / BUCKET_SIZE);
      const bLatMax = Math.floor(maxLat / BUCKET_SIZE);
      const bLngMin = Math.floor(minLng / BUCKET_SIZE);
      const bLngMax = Math.floor(maxLng / BUCKET_SIZE);

      for (let bLat = bLatMin; bLat <= bLatMax; bLat++) {
        for (let bLng = bLngMin; bLng <= bLngMax; bLng++) {
          const key = `${bLat}_${bLng}`;
          let list = grid.get(key);
          if (!list) {
            list = [];
            grid.set(key, list);
          }
          list.push(seg);
        }
      }
    }
  }
  spatialGrid = grid;
  return spatialGrid;
}

// Major Corridor Regex Patterns
export const CORRIDOR_PATTERNS: Record<string, RegExp> = {
  VIP_ROAD: /kazi nazrul|vip/i,
  JESSORE_ROAD: /jessore|nh\s*12|nh\s*34/i,
  EM_BYPASS: /eastern metropolitan|e\.?m\.? bypass/i,
  BISWA_BANGLA: /biswa bangla|major arterial|mar/i,
  BT_ROAD: /barrackpore trunk|b\.?t\.? road/i,
  DIAMOND_HARBOUR: /diamond harbour/i,
  CENTRAL_AVE: /chittaranjan|jawaharlal nehru|central ave/i,
  BELGHORIA: /belghoria/i,
  KONA: /kona/i,
  GT_ROAD: /grand trunk|g\.?t\.? road/i,
  STRAND_ROAD: /strand/i,
};

// Heuristic corridor resolution by stop name
export function inferCorridorFromStopName(stopName: string): RegExp | null {
  const n = (stopName || '').toLowerCase();
  if (/baguiati|kaikhali|haldiram|bangur|dum dum park|kestopur|teghoria|chinar park|airport gate/i.test(n)) {
    return CORRIDOR_PATTERNS.VIP_ROAD;
  }
  if (/nagerbazar|dum dum cant|birati|madhyamgram|barasat|airport 1/i.test(n)) {
    return CORRIDOR_PATTERNS.JESSORE_ROAD;
  }
  if (/ruby|science city|chingrighata|kalikapur|ajay nagar|patuli|garia/i.test(n)) {
    return CORRIDOR_PATTERNS.EM_BYPASS;
  }
  if (/ecospace|unitech|ecopark|shapoorji|biswa bangla|new town|narkelbagan/i.test(n)) {
    return CORRIDOR_PATTERNS.BISWA_BANGLA;
  }
  if (/shyambazar|dunlop|baranagar|agarpara|sodepur|khardah|titagarh|barrackpore/i.test(n)) {
    return CORRIDOR_PATTERNS.BT_ROAD;
  }
  if (/taratala|behala|thakurpukur|joka/i.test(n)) {
    return CORRIDOR_PATTERNS.DIAMOND_HARBOUR;
  }
  return null;
}

/**
 * Snaps a stop coordinate directly to the nearest arterial / primary / trunk road centerline,
 * ignoring small residential or service alleys.
 */
export function snapStopToArterial(
  lat: number,
  lng: number,
  options?: {
    stopName?: string;
    corridorHint?: string;
    routeBearing?: number;
    maxSearchRadiusMeters?: number;
  }
): {
  snappedLat: number;
  snappedLng: number;
  distanceShiftMeters: number;
  roadName: string;
  roadType: string;
} {
  const grid = initSpatialIndex();
  const maxRadius = options?.maxSearchRadiusMeters || 450;
  const delta = (maxRadius / 111139) * 1.5;

  const bLatMin = Math.floor((lat - delta) / BUCKET_SIZE);
  const bLatMax = Math.floor((lat + delta) / BUCKET_SIZE);
  const bLngMin = Math.floor((lng - delta) / BUCKET_SIZE);
  const bLngMax = Math.floor((lng + delta) / BUCKET_SIZE);

  const seenSegments = new Set<string>();
  const candidates: Array<{
    seg: WaySegment;
    distMeters: number;
    snapLat: number;
    snapLng: number;
  }> = [];

  for (let bLat = bLatMin; bLat <= bLatMax; bLat++) {
    for (let bLng = bLngMin; bLng <= bLngMax; bLng++) {
      const segs = grid.get(`${bLat}_${bLng}`);
      if (!segs) continue;
      for (const s of segs) {
        const segKey = `${s.wayIndex}_${s.segIndex}`;
        if (seenSegments.has(segKey)) continue;
        seenSegments.add(segKey);

        const { distMeters, snapLat, snapLng } = pDistance(
          lat,
          lng,
          s.p1[0],
          s.p1[1],
          s.p2[0],
          s.p2[1]
        );
        if (distMeters <= maxRadius) {
          candidates.push({ seg: s, distMeters, snapLat, snapLng });
        }
      }
    }
  }

  if (candidates.length === 0) {
    return {
      snappedLat: lat,
      snappedLng: lng,
      distanceShiftMeters: 0,
      roadName: '',
      roadType: '',
    };
  }

  let targetCorridor: RegExp | null = null;
  if (options?.corridorHint) {
    if (CORRIDOR_PATTERNS[options.corridorHint]) {
      targetCorridor = CORRIDOR_PATTERNS[options.corridorHint];
    } else {
      targetCorridor = new RegExp(options.corridorHint, 'i');
    }
  } else if (options?.stopName) {
    targetCorridor = inferCorridorFromStopName(options.stopName);
  }

  let bestScore = Infinity;
  let bestCandidate = candidates[0];

  for (const c of candidates) {
    let score = c.distMeters;

    // Road classification scoring (favor motorway/trunk/primary over secondary)
    const h = c.seg.highway;
    if (h === 'trunk' || h === 'motorway') {
      score *= 0.6;
    } else if (h === 'primary') {
      score *= 0.7;
    } else if (h.endsWith('_link')) {
      score *= 1.15;
    } else if (h === 'secondary') {
      score *= 1.0;
    }

    // Corridor name preference
    const roadFullName = `${c.seg.name} ${c.seg.ref}`;
    if (targetCorridor && targetCorridor.test(roadFullName)) {
      score *= 0.35; // Strongly favor the designated corridor road
    }

    // Direction alignment with route bearing
    if (options?.routeBearing !== undefined) {
      const angleDiff = Math.abs((c.seg.bearing - options.routeBearing + 360) % 180);
      const acuteAngle = angleDiff > 90 ? 180 - angleDiff : angleDiff;
      if (acuteAngle < 35) {
        score *= 0.85;
      }
    }

    if (score < bestScore) {
      bestScore = score;
      bestCandidate = c;
    }
  }

  return {
    snappedLat: Math.round(bestCandidate.snapLat * 1e6) / 1e6,
    snappedLng: Math.round(bestCandidate.snapLng * 1e6) / 1e6,
    distanceShiftMeters: Math.round(bestCandidate.distMeters),
    roadName: bestCandidate.seg.name || bestCandidate.seg.ref || 'Unnamed Arterial',
    roadType: bestCandidate.seg.highway,
  };
}

/**
 * Calculates perpendicular cross-track distance in meters from point P
 * to the line segment between A and B, along with projected centerline coordinate.
 */
export function calculateCrossTrackDistance(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): {
  perpDistanceMeters: number;
  alongTrackMeters: number;
  segmentLengthMeters: number;
  projectedPoint: [number, number];
} {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;

  const latMid = toRad((a[0] + b[0]) / 2);
  const xB = (b[1] - a[1]) * (Math.PI / 180) * R * Math.cos(latMid);
  const yB = (b[0] - a[0]) * (Math.PI / 180) * R;

  const xP = (p[1] - a[1]) * (Math.PI / 180) * R * Math.cos(latMid);
  const yP = (p[0] - a[0]) * (Math.PI / 180) * R;

  const segmentLength = Math.hypot(xB, yB);
  if (segmentLength < 1e-6) {
    return {
      perpDistanceMeters: Math.hypot(xP, yP),
      alongTrackMeters: 0,
      segmentLengthMeters: 0,
      projectedPoint: [a[0], a[1]],
    };
  }

  const uX = xB / segmentLength;
  const uY = yB / segmentLength;

  const alongTrack = xP * uX + yP * uY;
  const perpX = xP - alongTrack * uX;
  const perpY = yP - alongTrack * uY;
  const perpDist = Math.hypot(perpX, perpY);

  const clampedAlong = Math.max(0, Math.min(segmentLength, alongTrack));
  const projX = clampedAlong * uX;
  const projY = clampedAlong * uY;

  const projLat = a[0] + (projY / R) * (180 / Math.PI);
  const projLng = a[1] + (projX / (R * Math.cos(latMid))) * (180 / Math.PI);

  return {
    perpDistanceMeters: perpDist,
    alongTrackMeters: alongTrack,
    segmentLengthMeters: segmentLength,
    projectedPoint: [Number(projLat.toFixed(6)), Number(projLng.toFixed(6))],
  };
}

/**
 * 1. Snaps stops to OpenStreetMap arterial corridor centerlines (motorway, trunk, primary, secondary),
 *    eliminating detours caused by pins placed in residential side streets.
 * 2. Enforces a tight radiuses parameter (15-20m) and heading bearings for the routing API.
 * 3. Simplifies dense clusters (3+ stops within ~100m on same corridor) by treating middle stops
 *    as "passed near" (isVia: true).
 * 4. Identifies stops with >80m detour for manual review.
 */
export function processCorridorStops(
  routeNumber: string,
  routeId: string,
  stops: CorridorStopPoint[]
): {
  waypoints: SnappedWaypoint[];
  routingWaypoints: SnappedWaypoint[];
  detourFlags: DetourAuditRecord[];
  radiusesParam: string;
  bearingsParam: string;
} {
  const n = stops.length;
  if (n < 2) {
    const defaultWps: SnappedWaypoint[] = stops.map((s) => ({
      id: s.id,
      name: s.name,
      originalLat: s.lat,
      originalLng: s.lng,
      snappedLat: s.lat,
      snappedLng: s.lng,
      heading: 0,
      radiusMeters: 20,
      isMandatoryWaypoint: true,
      isVia: false,
      detourMeters: 0,
    }));
    return {
      waypoints: defaultWps,
      routingWaypoints: defaultWps,
      detourFlags: [],
      radiusesParam: '20',
      bearingsParam: '0,45',
    };
  }

  const waypoints: SnappedWaypoint[] = [];
  const detourFlags: DetourAuditRecord[] = [];

  // Pass 1: Arterial snapping, directional headings, and detour evaluation
  for (let i = 0; i < n; i++) {
    const curr = stops[i];
    let heading = 0;

    if (i < n - 1) {
      heading = computeBearing([curr.lat, curr.lng], [stops[i + 1].lat, stops[i + 1].lng]);
    } else if (i > 0) {
      heading = computeBearing([stops[i - 1].lat, stops[i - 1].lng], [curr.lat, curr.lng]);
    }

    // Snap to arterial corridor centerline
    const arterialSnap = snapStopToArterial(curr.lat, curr.lng, {
      stopName: curr.name,
      corridorHint: curr.road_corridor,
      routeBearing: heading,
      maxSearchRadiusMeters: 450,
    });

    const snappedLat = arterialSnap.snappedLat;
    const snappedLng = arterialSnap.snappedLng;
    const shiftMeters = arterialSnap.distanceShiftMeters;

    // Cross-track detour check relative to previous and next stops
    let perpDeviation = shiftMeters;
    let isConfident = true;
    let skipReason = '';

    if (i > 0 && i < n - 1) {
      const prev = stops[i - 1];
      const next = stops[i + 1];

      const { perpDistanceMeters } = calculateCrossTrackDistance(
        [curr.lat, curr.lng],
        [prev.lat, prev.lng],
        [next.lat, next.lng]
      );
      perpDeviation = Math.max(shiftMeters, perpDistanceMeters);

      const directDist = computeDistanceMeters([prev.lat, prev.lng], [next.lat, next.lng]);
      const pathDist =
        computeDistanceMeters([prev.lat, prev.lng], [curr.lat, curr.lng]) +
        computeDistanceMeters([curr.lat, curr.lng], [next.lat, next.lng]);
      const extraTravel = pathDist - directDist;

      // Calculate turn angle between (prev -> curr) and (curr -> next)
      const bIn = computeBearing([prev.lat, prev.lng], [curr.lat, curr.lng]);
      const bOut = computeBearing([curr.lat, curr.lng], [next.lat, next.lng]);
      let turnAngle = Math.abs((bOut - bIn + 360) % 360);
      if (turnAngle > 180) turnAngle = 360 - turnAngle;

      // "Skip if uncertain, correct if confident" rule:
      // An intermediate stop is UNCERTAIN and should be SKIPPED from geometry routing if:
      // 1. Shift to nearest arterial road exceeds 400m (isolated residential pin with no confident arterial snap), OR
      // 2. Creates an acute hairpin doubling-back spike (turnAngle > 140° and extraTravel > 500m), OR
      // 3. Perp deviation > 1200m off through-corridor with no matching corridor road name.
      if (shiftMeters > 400 || (turnAngle > 140 && extraTravel > 500) || (perpDeviation > 1200 && !arterialSnap.roadName)) {
        isConfident = false;
        skipReason = `Uncertain pin (${Math.round(shiftMeters)}m shift, ${Math.round(turnAngle)}° hairpin spike, ${Math.round(extraTravel)}m extra travel)`;
      }

      if (shiftMeters > 80 || perpDistanceMeters > 80 || extraTravel > 80 || !isConfident) {
        detourFlags.push({
          routeNumber,
          routeId,
          stopId: curr.id,
          stopName: curr.name || curr.id,
          lat: curr.lat,
          lng: curr.lng,
          prevStopName: prev.name || prev.id,
          nextStopName: next.name || next.id,
          corridorName: curr.road_corridor || arterialSnap.roadName || 'Kolkata Corridor',
          detourMeters: Math.round(perpDeviation),
          triangularExtraDistanceMeters: Math.round(extraTravel),
          reason: isConfident
            ? `Stop pin was ${Math.round(shiftMeters)}m off arterial centerline "${arterialSnap.roadName}" (${arterialSnap.roadType}); confidently snapped to main road`
            : `${skipReason}; skipped from road_geometry routing to prevent boxy detour loop`,
          suggestedAction: isConfident
            ? `Confident snap applied on ${arterialSnap.roadName}`
            : `Skipped from road routing waypoints; kept in stop_sequence for schedule/ETA`,
        });
      }
    }

    waypoints.push({
      id: curr.id,
      name: curr.name,
      originalLat: curr.lat,
      originalLng: curr.lng,
      snappedLat,
      snappedLng,
      heading,
      radiusMeters: 20, // Tight 20m radius
      isMandatoryWaypoint: isConfident, // Set to false if skipped from routing
      isVia: false,
      detourMeters: Math.round(perpDeviation),
      snappedRoadName: arterialSnap.roadName,
      snappedRoadType: arterialSnap.roadType,
    });
  }

  // Pass 2: Dense Old-Kolkata segment clustering & simplification (~100-130m threshold)
  let clusterIdCounter = 1;
  let i = 0;
  while (i < n - 2) {
    let clusterEnd = i;

    while (clusterEnd < n - 1) {
      const pA = [waypoints[clusterEnd].snappedLat, waypoints[clusterEnd].snappedLng] as [number, number];
      const pB = [waypoints[clusterEnd + 1].snappedLat, waypoints[clusterEnd + 1].snappedLng] as [number, number];
      const dist = computeDistanceMeters(pA, pB);

      if (dist <= 130) {
        clusterEnd++;
      } else {
        break;
      }
    }

    const clusterSize = clusterEnd - i + 1;
    if (clusterSize >= 3) {
      for (let m = i + 1; m < clusterEnd; m++) {
        waypoints[m].isMandatoryWaypoint = false;
        waypoints[m].isVia = true;
        waypoints[m].clusterId = clusterIdCounter;
      }
      waypoints[i].clusterId = clusterIdCounter;
      waypoints[clusterEnd].clusterId = clusterIdCounter;
      clusterIdCounter++;
      i = clusterEnd + 1;
    } else {
      i++;
    }
  }

  // Routing waypoints: First, Last, and all Mandatory stops (middle dense cluster stops marked via)
  const routingWaypoints = waypoints.filter(
    (w, idx) => idx === 0 || idx === n - 1 || w.isMandatoryWaypoint
  );

  const radiusesParam = routingWaypoints.map(() => '20').join(';');
  const bearingsParam = routingWaypoints.map((w) => `${w.heading},45`).join(';');

  return {
    waypoints,
    routingWaypoints,
    detourFlags,
    radiusesParam,
    bearingsParam,
  };
}

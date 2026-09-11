import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { STOPS, getRoadNameForCoordinate } from '../src/data/transitData';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface Point {
  lat: number;
  lng: number;
  id?: string;
  name?: string;
  corridor?: string;
}

export function computeDistanceMeters(p1: [number, number], p2: [number, number]): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(p2[0] - p1[0]);
  const dLng = toRad(p2[1] - p1[1]);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1[0])) * Math.cos(toRad(p2[0])) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function computeBearing(p1: [number, number], p2: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const lat1 = toRad(p1[0]);
  const lat2 = toRad(p2[0]);
  const dLng = toRad(p2[1] - p1[1]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  let brng = toDeg(Math.atan2(y, x));
  return Math.round((brng + 360) % 360);
}

/**
 * Calculates perpendicular distance (cross-track distance) in meters
 * from point P to the segment defined by A and B.
 */
export function calculateCrossTrackDistance(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): { perpDistanceMeters: number; alongTrackMeters: number; segmentLengthMeters: number; projectedPoint: [number, number] } {
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

  // Projected coordinates back to lat/lng
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

export interface SimplifiedWaypoint {
  id: string;
  name: string;
  originalLat: number;
  originalLng: number;
  snappedLat: number;
  snappedLng: number;
  heading: number;
  radiusMeters: number;
  isMandatoryWaypoint: boolean; // false if middle stop in dense cluster ("passed near")
  isVia: boolean;
  clusterGroup?: number;
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
}

/**
 * 1. Snaps stop coordinates towards nearest arterial centerline (radius 15-20m) with corridor bearings
 * 2. Simplifies dense clusters (3+ stops within ~100m on same corridor)
 * 3. Detects and returns stops causing >80m detours
 */
export function processCorridorStops(
  routeNumber: string,
  routeId: string,
  stops: Point[]
): {
  simplifiedWaypoints: SimplifiedWaypoint[];
  detourFlags: DetourAuditRecord[];
} {
  const n = stops.length;
  const waypoints: SimplifiedWaypoint[] = [];
  const detourFlags: DetourAuditRecord[] = [];

  if (n < 2) {
    return {
      simplifiedWaypoints: stops.map((s) => ({
        id: s.id || 'stop',
        name: s.name || 'Stop',
        originalLat: s.lat,
        originalLng: s.lng,
        snappedLat: s.lat,
        snappedLng: s.lng,
        heading: 0,
        radiusMeters: 20,
        isMandatoryWaypoint: true,
        isVia: false,
      })),
      detourFlags: [],
    };
  }

  // 1. Compute bearings and snapped positions
  for (let i = 0; i < n; i++) {
    const curr = stops[i];
    let heading = 0;

    if (i < n - 1) {
      heading = computeBearing([curr.lat, curr.lng], [stops[i + 1].lat, stops[i + 1].lng]);
    } else if (i > 0) {
      heading = computeBearing([stops[i - 1].lat, stops[i - 1].lng], [curr.lat, curr.lng]);
    }

    let snappedLat = curr.lat;
    let snappedLng = curr.lng;
    const corridorName = curr.corridor || getRoadNameForCoordinate(curr.lat, curr.lng);

    // If intermediate stop, check alignment with prev and next
    if (i > 0 && i < n - 1) {
      const prev = stops[i - 1];
      const next = stops[i + 1];

      const { perpDistanceMeters, alongTrackMeters, segmentLengthMeters, projectedPoint } =
        calculateCrossTrackDistance([curr.lat, curr.lng], [prev.lat, prev.lng], [next.lat, next.lng]);

      const directDist = computeDistanceMeters([prev.lat, prev.lng], [next.lat, next.lng]);
      const pathDist =
        computeDistanceMeters([prev.lat, prev.lng], [curr.lat, curr.lng]) +
        computeDistanceMeters([curr.lat, curr.lng], [next.lat, next.lng]);
      const extraDist = pathDist - directDist;

      // Requirement 3: Flag stops where routing engine detours > 80m off main road path
      if (perpDistanceMeters > 80 || extraDist > 80) {
        detourFlags.push({
          routeNumber,
          routeId,
          stopId: curr.id || `stop-${i}`,
          stopName: curr.name || `Stop ${i}`,
          lat: curr.lat,
          lng: curr.lng,
          prevStopName: prev.name || `Stop ${i - 1}`,
          nextStopName: next.name || `Stop ${i + 1}`,
          corridorName,
          detourMeters: Math.round(perpDistanceMeters),
          triangularExtraDistanceMeters: Math.round(extraDist),
          reason: `Detours ${Math.round(perpDistanceMeters)}m perpendicularly off corridor line (${Math.round(extraDist)}m extra travel)`,
        });
      }

      // Requirement 1: Snap to nearest main road with tight radius (15-20m)
      // If deviation is moderate (10-35m), stop is likely off the curb; project towards centerline
      if (perpDistanceMeters >= 8 && perpDistanceMeters <= 40 && alongTrackMeters > 0 && alongTrackMeters < segmentLengthMeters) {
        snappedLat = projectedPoint[0];
        snappedLng = projectedPoint[1];
      }
    }

    waypoints.push({
      id: curr.id || `stop-${i}`,
      name: curr.name || `Stop ${i}`,
      originalLat: curr.lat,
      originalLng: curr.lng,
      snappedLat,
      snappedLng,
      heading,
      radiusMeters: 20, // Strict 15-20m snapping radius
      isMandatoryWaypoint: true,
      isVia: false,
    });
  }

  // Requirement 2: Dense old-Kolkata segment clustering & simplification
  // If 3+ consecutive stops are within ~100m of each other on same corridor,
  // compute route through only first and last of that cluster (middle ones = "passed near" / via)
  let clusterGroupCounter = 1;
  let i = 0;
  while (i < n - 2) {
    let clusterEnd = i;

    while (clusterEnd < n - 1) {
      const pA = [waypoints[clusterEnd].snappedLat, waypoints[clusterEnd].snappedLng] as [number, number];
      const pB = [waypoints[clusterEnd + 1].snappedLat, waypoints[clusterEnd + 1].snappedLng] as [number, number];
      const dist = computeDistanceMeters(pA, pB);

      // Check if within ~100m (allow up to 130m threshold for dense urban stops)
      if (dist <= 130) {
        clusterEnd++;
      } else {
        break;
      }
    }

    const clusterSize = clusterEnd - i + 1;
    if (clusterSize >= 3) {
      // Keep waypoints[i] and waypoints[clusterEnd] as mandatory
      // Middle stops are marked as non-mandatory / via
      for (let m = i + 1; m < clusterEnd; m++) {
        waypoints[m].isMandatoryWaypoint = false;
        waypoints[m].isVia = true;
        waypoints[m].clusterGroup = clusterGroupCounter;
      }
      waypoints[i].clusterGroup = clusterGroupCounter;
      waypoints[clusterEnd].clusterGroup = clusterGroupCounter;
      clusterGroupCounter++;
      i = clusterEnd + 1;
    } else {
      i++;
    }
  }

  return {
    simplifiedWaypoints: waypoints,
    detourFlags,
  };
}

async function main() {
  console.log('--- Analyzing Kolkata Transit Stops, Detours & Corridor Simplifications ---');
  const { data: allRoutes } = await supabase.from('routes').select('id, route_number, stop_sequence');
  const { data: allStops } = await supabase.from('stops').select('*');

  if (!allRoutes || !allStops) {
    console.error('Failed to load routes/stops from DB');
    return;
  }

  const stopsMap = new Map<string, any>(allStops.map((s) => [s.id, s]));
  const allDetours: DetourAuditRecord[] = [];
  let totalClustersFound = 0;
  let totalSimplifiedStops = 0;

  for (const r of allRoutes) {
    const seq: string[] = r.stop_sequence || [];
    const stopPoints: Point[] = seq
      .map((sId) => {
        let s = stopsMap.get(sId) || STOPS.find((item) => item.id === sId);
        if (!s) return null;
        return {
          id: s.id,
          name: s.name,
          lat: Number(s.lat),
          lng: Number(s.lng),
          corridor: s.road_corridor || getRoadNameForCoordinate(Number(s.lat), Number(s.lng)),
        };
      })
      .filter((s): s is Point => Boolean(s && !isNaN(s.lat) && !isNaN(s.lng)));

    const { simplifiedWaypoints, detourFlags } = processCorridorStops(r.route_number || r.id, r.id, stopPoints);

    allDetours.push(...detourFlags);

    const viaCount = simplifiedWaypoints.filter((w) => w.isVia).length;
    if (viaCount > 0) {
      totalClustersFound++;
      totalSimplifiedStops += viaCount;
    }
  }

  // Deduplicate detour flags by stopId
  const uniqueDetourStopsMap = new Map<string, DetourAuditRecord>();
  for (const d of allDetours) {
    const existing = uniqueDetourStopsMap.get(d.stopId);
    if (!existing || d.detourMeters > existing.detourMeters) {
      uniqueDetourStopsMap.set(d.stopId, d);
    }
  }
  const uniqueDetourStops = Array.from(uniqueDetourStopsMap.values()).sort((a, b) => b.detourMeters - a.detourMeters);

  console.log(`\nAudit Results across ${allRoutes.length} Routes:`);
  console.log(`• Total dense-segment clusters simplified: ${totalClustersFound} routes affected (${totalSimplifiedStops} middle stops converted to pass-through)`);
  console.log(`• Total detour flags across all routes: ${allDetours.length}`);
  console.log(`• Unique stops flagged with >80m detour from main corridor: ${uniqueDetourStops.length}`);

  // Save audit log to JSON
  fs.writeFileSync('./flagged_detour_stops.json', JSON.stringify(uniqueDetourStops, null, 2));
  console.log(`• Saved detailed audit to flagged_detour_stops.json`);

  console.log('\nTop 15 Flagged Detour Stops for Manual Review:');
  console.log('-----------------------------------------------------------------------------------------------');
  uniqueDetourStops.slice(0, 15).forEach((s, idx) => {
    console.log(
      `${idx + 1}. [${s.stopName}] (${s.stopId}) on Route ${s.routeNumber} | Corridor: ${s.corridorName}` +
      `\n   Detour: ${s.detourMeters}m off corridor between "${s.prevStopName}" and "${s.nextStopName}" (coords: ${s.lat.toFixed(5)}, ${s.lng.toFixed(5)})`
    );
  });
}

main().catch(console.error);

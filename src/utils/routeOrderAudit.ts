import { Stop, BusRoute } from '../types';
import { SupabaseRoute } from '../hooks/useSupabaseTransit';
import { computeBearing, computeDistanceMeters } from '../services/osrmRouteService';

export interface RouteStopReversal {
  routeId: string;
  routeNumber: string;
  stopIndex: number;
  stopName: string;
  stopId: string;
  reversalAngle: number;
  prevStopName: string;
  nextStopName: string;
}

export interface RouteAuditResult {
  routeId: string;
  routeNumber: string;
  routeName: string;
  totalStops: number;
  reversalCount: number;
  reversals: RouteStopReversal[];
  originalStops: Stop[];
  suggestedStops: Stop[];
}

/**
 * Calculates absolute angle difference between two compass bearings (0-180°).
 */
export function angleDifference(a: number, b: number): number {
  let diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Requirement 1:
 * Computes bearing between each consecutive stop triplet and flags any reversal > 120°,
 * returning a list of {routeId, stopIndex, stopName, reversalAngle}.
 */
export function auditRouteStopOrder(
  route: BusRoute | SupabaseRoute,
  stopsMap: Map<string, Stop>
): RouteStopReversal[] {
  const routeId = route.id;
  const routeNumber =
    'route_number' in route && route.route_number
      ? route.route_number
      : (route as any).number || routeId;

  const rawSequence: string[] =
    'stop_sequence' in route && Array.isArray(route.stop_sequence)
      ? route.stop_sequence
      : 'stops' in route && Array.isArray(route.stops)
      ? route.stops
      : [];

  const validStops: Stop[] = [];
  for (const sId of rawSequence) {
    const s = stopsMap.get(sId);
    if (s && s.lat != null && s.lng != null && !isNaN(Number(s.lat)) && !isNaN(Number(s.lng))) {
      validStops.push(s);
    }
  }

  if (validStops.length < 3) {
    return [];
  }

  const reversals: RouteStopReversal[] = [];

  for (let i = 0; i < validStops.length - 2; i++) {
    const s1 = validStops[i];
    const s2 = validStops[i + 1];
    const s3 = validStops[i + 2];

    const b1 = computeBearing([s1.lat, s1.lng], [s2.lat, s2.lng]);
    const b2 = computeBearing([s2.lat, s2.lng], [s3.lat, s3.lng]);
    const diff = angleDifference(b1, b2);

    if (diff > 120) {
      reversals.push({
        routeId,
        routeNumber: String(routeNumber),
        stopIndex: i + 1,
        stopName: s2.name,
        stopId: s2.id,
        reversalAngle: Math.round(diff),
        prevStopName: s1.name,
        nextStopName: s3.name,
      });
    }
  }

  return reversals;
}

function computeStopPathDistance(stops: Stop[]): number {
  let dist = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    dist += computeDistanceMeters([stops[i].lat, stops[i].lng], [stops[i + 1].lat, stops[i + 1].lng]);
  }
  return dist;
}

function countStopReversals(stops: Stop[]): number {
  let revs = 0;
  for (let i = 0; i < stops.length - 2; i++) {
    const b1 = computeBearing([stops[i].lat, stops[i].lng], [stops[i + 1].lat, stops[i + 1].lng]);
    const b2 = computeBearing([stops[i + 1].lat, stops[i + 1].lng], [stops[i + 2].lat, stops[i + 2].lng]);
    if (angleDifference(b1, b2) > 120) {
      revs++;
    }
  }
  return revs;
}

/**
 * Requirement 3:
 * For each flagged route, generates an optimized suggested stop sequence
 * using multi-start nearest neighbor and 2-opt local search.
 * Specifically targets eliminating >120° backtracks and minimizing circuitous detour distance.
 * Suggestion ONLY, not an automatic overwrite.
 */
export function suggestNearestNeighborReorder(stops: Stop[]): Stop[] {
  if (stops.length <= 2) {
    return [...stops];
  }

  let best = [...stops];
  let bestReversals = countStopReversals(best);
  let bestDist = computeStopPathDistance(best);

  // 1. Evaluate reversing the entire route (in case stops were entered destination-first)
  const reversed = [...stops].reverse();
  const revReversals = countStopReversals(reversed);
  const revDist = computeStopPathDistance(reversed);
  if (revReversals < bestReversals || (revReversals === bestReversals && revDist < bestDist)) {
    best = reversed;
    bestReversals = revReversals;
    bestDist = revDist;
  }

  // 2. Evaluate nearest-neighbor starting from each stop (especially true terminals)
  for (let startIdx = 0; startIdx < stops.length; startIdx++) {
    const remaining = [...stops];
    const candidate = [remaining.splice(startIdx, 1)[0]];

    while (remaining.length > 0) {
      const current = candidate[candidate.length - 1];
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let j = 0; j < remaining.length; j++) {
        const d = computeDistanceMeters(
          [current.lat, current.lng],
          [remaining[j].lat, remaining[j].lng]
        );
        if (d < minDistance) {
          minDistance = d;
          nearestIdx = j;
        }
      }

      candidate.push(remaining.splice(nearestIdx, 1)[0]);
    }

    const cRevs = countStopReversals(candidate);
    const cDist = computeStopPathDistance(candidate);

    if (cRevs < bestReversals || (cRevs === bestReversals && cDist < bestDist * 0.95)) {
      best = candidate;
      bestReversals = cRevs;
      bestDist = cDist;
    }
  }

  // 3. 2-opt local search optimization to untangle crossed/zigzagging segments
  let improved = true;
  let iter = 0;
  while (improved && iter < 50) {
    improved = false;
    iter++;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, k + 1).reverse(),
          ...best.slice(k + 1),
        ];
        const cRevs = countStopReversals(candidate);
        const cDist = computeStopPathDistance(candidate);

        if (cRevs < bestReversals || (cRevs === bestReversals && cDist < bestDist - 100)) {
          best = candidate;
          bestReversals = cRevs;
          bestDist = cDist;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  return best;
}

/**
 * Requirement 2:
 * Runs stop order audit across all routes and returns comprehensive results
 * sorted by reversal count descending. Dev-only console.table caller helper.
 */
export function runAllRoutesStopOrderAudit(
  routes: (BusRoute | SupabaseRoute)[],
  stopsMap: Map<string, Stop>,
  logToConsole = false
): RouteAuditResult[] {
  const results: RouteAuditResult[] = [];

  for (const r of routes) {
    const rawSequence: string[] =
      'stop_sequence' in r && Array.isArray(r.stop_sequence)
        ? r.stop_sequence
        : 'stops' in r && Array.isArray(r.stops)
        ? r.stops
        : [];

    const originalStops: Stop[] = [];
    for (const sId of rawSequence) {
      const s = stopsMap.get(sId);
      if (s) originalStops.push(s);
    }

    const reversals = auditRouteStopOrder(r, stopsMap);

    if (reversals.length > 0) {
      const suggested = suggestNearestNeighborReorder(originalStops);
      const routeNumber =
        'route_number' in r && r.route_number
          ? r.route_number
          : (r as any).number || r.id;
      const routeName = (r as any).name || `Route ${routeNumber}`;

      results.push({
        routeId: r.id,
        routeNumber: String(routeNumber),
        routeName,
        totalStops: originalStops.length,
        reversalCount: reversals.length,
        reversals,
        originalStops,
        suggestedStops: suggested,
      });
    }
  }

  // Sort descending by reversal count
  results.sort((a, b) => b.reversalCount - a.reversalCount);

  if (logToConsole && typeof console !== 'undefined' && console.table) {
    console.group(`[Stop Order Audit] Flagged ${results.length} routes with >120° reversals`);
    console.table(
      results.map((r) => ({
        Route: r.routeNumber,
        Name: r.routeName,
        'Total Stops': r.totalStops,
        'Reversals (>120°)': r.reversalCount,
        'Sample Reversals': r.reversals
          .slice(0, 3)
          .map((rev) => `${rev.stopName} (${rev.reversalAngle}°)`)
          .join('; '),
      }))
    );
    console.groupEnd();
  }

  return results;
}

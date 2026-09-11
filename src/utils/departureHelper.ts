import { Stop, PersistentBus, PersistentRoute } from '../types';
import { STOPS } from '../data/transitData';
import { PERSISTENT_ROUTES, queryPersistentBusesForJourney, groupBusesByRoute } from '../data/persistentFleet';
import { getAllUnderlyingStopIds, getCanonicalDisplayName } from '../data/canonicalStops';

export interface StopDeparture {
  id: string;
  busId: string;
  routeId: string;
  routeNumber: string;
  routeColor: string;
  busType: string;
  destinationStopId: string;
  destinationName: string;
  etaMinutes: number;
  distanceMeters: number;
  fare: number;
  crowdLevel: 'Low' | 'Moderate' | 'Crowded';
  seatsStatus: string;
}

const STOP_NAME_OVERRIDES: Record<string, string> = {
  'sector-v': 'Salt Lake Sector V',
  'sdf-building': 'Salt Lake Sector V',
  'ruby': 'Ruby Hospital',
  'kolkata-airport': 'Kolkata Airport (CCU)',
  'airport-gate-1': 'Kolkata Airport (CCU)',
  'howrah': 'Howrah Station',
  'esplanade': 'Esplanade',
  'park-street': 'Park Street',
  'barasat': 'Barasat',
  'joka': 'Joka',
  'tollygunge': 'Tollygunge',
  'sealdah': 'Sealdah Station',
  'garia': 'Garia',
  'nabanna': 'Nabanna',
  'new-town-ecospace': 'New Town Ecospace',
  'ecospace': 'New Town Ecospace',
};

export function formatDestinationName(stopId: string, stops: Stop[] = STOPS): string {
  if (STOP_NAME_OVERRIDES[stopId]) {
    return STOP_NAME_OVERRIDES[stopId];
  }
  const canonical = getCanonicalDisplayName(stopId, stops);
  if (canonical && canonical !== stopId && !canonical.startsWith('canonical:')) {
    return canonical;
  }
  const stop = stops.find((s) => s.id === stopId);
  if (!stop) return stopId.replace(/^canonical:/, '').replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  if (stop.name.includes('Airport')) return 'Kolkata Airport (CCU)';
  if (stop.name.includes('Ruby')) return 'Ruby Hospital';
  if (stop.name.includes('Sector V')) return 'Salt Lake Sector V';
  return stop.name;
}

export function computeStopDepartures(
  stopId: string,
  fleet: PersistentBus[],
  preferredDestinationId?: string,
  routes: PersistentRoute[] = PERSISTENT_ROUTES,
  stops: Stop[] = STOPS
): {
  allDepartures: StopDeparture[];
  servingRouteNumbers: string[];
} {
  const busesByRoute = groupBusesByRoute(fleet);

  // 1. If a destination is selected, use journey-search logic to filter
  if (preferredDestinationId && preferredDestinationId !== stopId) {
    const targetDestIds = getAllUnderlyingStopIds(preferredDestinationId, stops);
    const targetDestSet = new Set(targetDestIds);

    // 1A. Direct Route Matches: check routes where origin is upstream of ANY candidate destination stop
    const directRoutes = routes.filter((r) => {
      const outStart = r.outboundStopIds.indexOf(stopId);
      const outDest = r.outboundStopIds.findIndex((id, idx) => idx > outStart && targetDestSet.has(id));
      const matchOut = outStart !== -1 && outDest !== -1;

      const inStart = r.inboundStopIds.indexOf(stopId);
      const inDest = r.inboundStopIds.findIndex((id, idx) => idx > inStart && targetDestSet.has(id));
      const matchIn = inStart !== -1 && inDest !== -1;

      return matchOut || matchIn;
    });

    if (directRoutes.length > 0) {
      const servingRouteNumbers = Array.from(new Set(directRoutes.map((r) => r.number)));
      const priorityOrder = ['S-12', '24B', 'AC39', 'L238'];
      servingRouteNumbers.sort((a, b) => {
        const idxA = priorityOrder.indexOf(a);
        const idxB = priorityOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      const departures: StopDeparture[] = [];
      const canonicalDestName = formatDestinationName(preferredDestinationId, stops);

      for (const route of directRoutes) {
        const routeBuses = busesByRoute.get(route.id) || busesByRoute.get(route.number) || [];
        const outStart = route.outboundStopIds.indexOf(stopId);
        const outDest = route.outboundStopIds.findIndex((id, idx) => idx > outStart && targetDestSet.has(id));
        const matchOut = outStart !== -1 && outDest !== -1;

        const inStart = route.inboundStopIds.indexOf(stopId);
        const inDest = route.inboundStopIds.findIndex((id, idx) => idx > inStart && targetDestSet.has(id));
        const matchIn = inStart !== -1 && inDest !== -1;

        if (matchOut) {
          const outMatchedDestId = route.outboundStopIds[outDest];
          const startDist = route.stopDistances[stopId]?.outboundDist ?? 0;
          const stopsSpan = outDest - outStart;
          const fare =
            route.number === 'S-12'
              ? 20
              : route.number === '24B'
              ? 10
              : Math.max(10, Math.round(route.baseFare + Math.max(0, stopsSpan - 1) * route.farePerStop));

          for (const bus of routeBuses) {
            const d = (startDist - bus.currentDistanceMeters + route.totalLoopDistanceMeters) % route.totalLoopDistanceMeters;
            const eta = Math.max(1, Math.round(((d / 1000) / (bus.speedKmh || 32)) * 60));
            departures.push({
              id: `${bus.id}-out-direct`,
              busId: bus.id,
              routeId: route.id,
              routeNumber: route.number,
              routeColor: route.color || '#2563EB',
              busType: route.type === 'AC Express' || route.type === 'Electric' ? 'AC · Regular' : 'Regular',
              destinationStopId: outMatchedDestId,
              destinationName: canonicalDestName,
              etaMinutes: eta,
              distanceMeters: d,
              fare,
              crowdLevel: bus.crowdLevel,
              seatsStatus: bus.crowdLevel === 'Crowded' ? 'Standing Room' : 'Seats Open',
            });
          }

          // If no active bus instance on route, show scheduled departure
          if (routeBuses.length === 0) {
            departures.push({
              id: `sched-${route.id}-out-direct`,
              busId: `sched-${route.id}-1`,
              routeId: route.id,
              routeNumber: route.number,
              routeColor: route.color || '#2563EB',
              busType: route.type === 'AC Express' || route.type === 'Electric' ? 'AC · Regular' : 'Regular',
              destinationStopId: outMatchedDestId,
              destinationName: canonicalDestName,
              etaMinutes: 6,
              distanceMeters: 2000,
              fare,
              crowdLevel: 'Moderate',
              seatsStatus: 'Scheduled',
            });
          }
        }

        if (matchIn) {
          const inMatchedDestId = route.inboundStopIds[inDest];
          const startDist = route.stopDistances[stopId]?.inboundDist ?? 0;
          const stopsSpan = inDest - inStart;
          const fare =
            route.number === 'S-12'
              ? 20
              : route.number === '24B'
              ? 10
              : Math.max(10, Math.round(route.baseFare + Math.max(0, stopsSpan - 1) * route.farePerStop));

          for (const bus of routeBuses) {
            const d = (startDist - bus.currentDistanceMeters + route.totalLoopDistanceMeters) % route.totalLoopDistanceMeters;
            const eta = Math.max(1, Math.round(((d / 1000) / (bus.speedKmh || 32)) * 60));
            departures.push({
              id: `${bus.id}-in-direct`,
              busId: bus.id,
              routeId: route.id,
              routeNumber: route.number,
              routeColor: route.color || '#2563EB',
              busType: route.type === 'AC Express' || route.type === 'Electric' ? 'AC · Regular' : 'Regular',
              destinationStopId: inMatchedDestId,
              destinationName: canonicalDestName,
              etaMinutes: eta,
              distanceMeters: d,
              fare,
              crowdLevel: bus.crowdLevel,
              seatsStatus: bus.crowdLevel === 'Crowded' ? 'Standing Room' : 'Seats Open',
            });
          }

          if (routeBuses.length === 0) {
            departures.push({
              id: `sched-${route.id}-in-direct`,
              busId: `sched-${route.id}-1`,
              routeId: route.id,
              routeNumber: route.number,
              routeColor: route.color || '#2563EB',
              busType: route.type === 'AC Express' || route.type === 'Electric' ? 'AC · Regular' : 'Regular',
              destinationStopId: inMatchedDestId,
              destinationName: canonicalDestName,
              etaMinutes: 7,
              distanceMeters: 2200,
              fare,
              crowdLevel: 'Moderate',
              seatsStatus: 'Scheduled',
            });
          }
        }
      }

      // Sort ascending by ETA (soonest first) and cap to 6
      departures.sort((a, b) => a.etaMinutes - b.etaMinutes);

      return {
        allDepartures: departures.slice(0, 6),
        servingRouteNumbers,
      };
    }

    // 1B. Transfer Journey Matches (if no direct route exists)
    const journeyResult = queryPersistentBusesForJourney(stopId, preferredDestinationId, fleet, null, routes, stops);
    if (journeyResult?.transferJourney) {
      const tj = journeyResult.transferJourney;
      const leg1Route = tj.leg1Route;
      const transferStop = tj.transferStop;
      const servingRouteNumbers = [leg1Route.number];
      const departures: StopDeparture[] = [];

      const leg1Persistent =
        routes.find((r) => r.id === leg1Route.id || r.number === leg1Route.number) ||
        PERSISTENT_ROUTES.find((r) => r.id === leg1Route.id || r.number === leg1Route.number);

      if (leg1Persistent) {
        const routeBuses = busesByRoute.get(leg1Persistent.id) || busesByRoute.get(leg1Persistent.number) || [];
        const outStart = leg1Persistent.outboundStopIds.indexOf(stopId);
        const outTransfer = leg1Persistent.outboundStopIds.indexOf(transferStop.id);
        const matchOut = outStart !== -1 && outTransfer !== -1 && outStart < outTransfer;

        const startDist = matchOut
          ? leg1Persistent.stopDistances[stopId]?.outboundDist ?? 0
          : leg1Persistent.stopDistances[stopId]?.inboundDist ?? 0;

        for (const bus of routeBuses) {
          const d =
            (startDist - bus.currentDistanceMeters + leg1Persistent.totalLoopDistanceMeters) %
            leg1Persistent.totalLoopDistanceMeters;
          const eta = Math.max(1, Math.round(((d / 1000) / (bus.speedKmh || 32)) * 60));
          departures.push({
            id: `${bus.id}-transfer`,
            busId: bus.id,
            routeId: leg1Persistent.id,
            routeNumber: leg1Persistent.number,
            routeColor: leg1Persistent.color || '#2563EB',
            busType:
              leg1Persistent.type === 'AC Express' || leg1Persistent.type === 'Electric'
                ? 'AC · Regular'
                : 'Regular',
            destinationStopId: preferredDestinationId,
            destinationName: `${formatDestinationName(preferredDestinationId, stops)} (via ${transferStop.name})`,
            etaMinutes: eta,
            distanceMeters: d,
            fare: tj.totalFare,
            crowdLevel: bus.crowdLevel,
            seatsStatus: `Transfer at ${transferStop.name}`,
          });
        }
      }

      departures.sort((a, b) => a.etaMinutes - b.etaMinutes);

      return {
        allDepartures: departures.slice(0, 6),
        servingRouteNumbers,
      };
    }

    console.warn(
      `[computeStopDepartures] Origin: ${stopId}, Destination: ${preferredDestinationId}: No direct or transfer route found in ${routes.length} routes.`
    );

    // No matching journey found
    return {
      allDepartures: [],
      servingRouteNumbers: [],
    };
  }

  // 2. DEFAULT STATE (No destination selected): All buses passing through this stop
  const servingRoutes = routes.filter(
    (r) => r.outboundStopIds.includes(stopId) || r.inboundStopIds.includes(stopId)
  );

  // Collect unique route numbers serving this stop
  const servingRouteNumbers = Array.from(new Set(servingRoutes.map((r) => r.number)));

  // Put iconic routes first if they serve this stop (e.g. S-12, 24B, AC39, L238)
  const priorityOrder = ['S-12', '24B', 'AC39', 'L238'];
  servingRouteNumbers.sort((a, b) => {
    const idxA = priorityOrder.indexOf(a);
    const idxB = priorityOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const rawDepartures: StopDeparture[] = [];

  for (const route of servingRoutes) {
    const routeBuses = busesByRoute.get(route.id) || busesByRoute.get(route.number) || [];
    const outIdx = route.outboundStopIds.indexOf(stopId);
    const inIdx = route.inboundStopIds.indexOf(stopId);

    // 1. Outbound direction check
    if (outIdx >= 0 && outIdx < route.outboundStopIds.length - 1) {
      const outDist = route.stopDistances[stopId]?.outboundDist ?? 0;
      const destId = route.outboundStopIds[route.outboundStopIds.length - 1];
      const stopsSpan = route.outboundStopIds.length - 1 - outIdx;
      const fare = Math.max(10, Math.round(route.baseFare + Math.max(0, stopsSpan - 1) * route.farePerStop));

      for (const bus of routeBuses) {
        const d = (outDist - bus.currentDistanceMeters + route.totalLoopDistanceMeters) % route.totalLoopDistanceMeters;
        const eta = Math.max(1, Math.round(((d / 1000) / (bus.speedKmh || 32)) * 60));
        rawDepartures.push({
          id: `${bus.id}-out`,
          busId: bus.id,
          routeId: route.id,
          routeNumber: route.number,
          routeColor: route.color || '#2563EB',
          busType: route.type === 'AC Express' || route.type === 'Electric' ? 'AC · Regular' : 'Regular',
          destinationStopId: destId,
          destinationName: formatDestinationName(destId, stops),
          etaMinutes: eta,
          distanceMeters: d,
          fare: route.number === 'S-12' ? 20 : route.number === '24B' ? 10 : fare,
          crowdLevel: bus.crowdLevel,
          seatsStatus: bus.crowdLevel === 'Crowded' ? 'Standing Room' : 'Seats Open',
        });
      }

      if (routeBuses.length === 0) {
        rawDepartures.push({
          id: `sched-${route.id}-out`,
          busId: `sched-${route.id}-1`,
          routeId: route.id,
          routeNumber: route.number,
          routeColor: route.color || '#2563EB',
          busType: route.type === 'AC Express' || route.type === 'Electric' ? 'AC · Regular' : 'Regular',
          destinationStopId: destId,
          destinationName: formatDestinationName(destId, stops),
          etaMinutes: 5,
          distanceMeters: 1800,
          fare: route.number === 'S-12' ? 20 : route.number === '24B' ? 10 : fare,
          crowdLevel: 'Moderate',
          seatsStatus: 'Scheduled',
        });
      }
    }

    // 2. Inbound direction check
    if (inIdx >= 0 && inIdx < route.inboundStopIds.length - 1) {
      const inDist = route.stopDistances[stopId]?.inboundDist ?? 0;
      const destId = route.inboundStopIds[route.inboundStopIds.length - 1];
      const stopsSpan = route.inboundStopIds.length - 1 - inIdx;
      const fare = Math.max(10, Math.round(route.baseFare + Math.max(0, stopsSpan - 1) * route.farePerStop));

      for (const bus of routeBuses) {
        const d = (inDist - bus.currentDistanceMeters + route.totalLoopDistanceMeters) % route.totalLoopDistanceMeters;
        const eta = Math.max(1, Math.round(((d / 1000) / (bus.speedKmh || 32)) * 60));
        rawDepartures.push({
          id: `${bus.id}-in`,
          busId: bus.id,
          routeId: route.id,
          routeNumber: route.number,
          routeColor: route.color || '#2563EB',
          busType: route.type === 'AC Express' || route.type === 'Electric' ? 'AC · Regular' : 'Regular',
          destinationStopId: destId,
          destinationName: formatDestinationName(destId, stops),
          etaMinutes: eta,
          distanceMeters: d,
          fare: route.number === 'S-12' ? 20 : route.number === '24B' ? 10 : fare,
          crowdLevel: bus.crowdLevel,
          seatsStatus: bus.crowdLevel === 'Crowded' ? 'Standing Room' : 'Seats Open',
        });
      }

      if (routeBuses.length === 0) {
        rawDepartures.push({
          id: `sched-${route.id}-in`,
          busId: `sched-${route.id}-1`,
          routeId: route.id,
          routeNumber: route.number,
          routeColor: route.color || '#2563EB',
          busType: route.type === 'AC Express' || route.type === 'Electric' ? 'AC · Regular' : 'Regular',
          destinationStopId: destId,
          destinationName: formatDestinationName(destId, stops),
          etaMinutes: 8,
          distanceMeters: 2400,
          fare: route.number === 'S-12' ? 20 : route.number === '24B' ? 10 : fare,
          crowdLevel: 'Moderate',
          seatsStatus: 'Scheduled',
        });
      }
    }
  }

  // Sort strictly by ETA minutes ascending (soonest first)
  rawDepartures.sort((a, b) => a.etaMinutes - b.etaMinutes);

  // Cap the departure list to the soonest 5-6 buses by ETA
  const allDepartures = rawDepartures.slice(0, 6);

  return {
    allDepartures,
    servingRouteNumbers,
  };
}

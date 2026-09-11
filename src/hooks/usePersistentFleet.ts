import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Stop, PersistentBus, PersistentRoute, BusRoute, JourneyQueryResult } from '../types';
import {
  PERSISTENT_ROUTES,
  PERSISTENT_ROUTES_MAP,
  buildPersistentRoutes,
  createInitialFleet,
  advanceBusAlongLoop,
  queryPersistentBusesForJourney,
  interpolatePositionAlongLoop,
} from '../data/persistentFleet';

interface UsePersistentFleetParams {
  startStopId: string;
  destStopId: string | null;
  supabaseFleet?: PersistentBus[];
  supabaseRoutes?: BusRoute[];
  stops?: Stop[];
}

export function usePersistentFleet({
  startStopId,
  destStopId,
  supabaseFleet,
  supabaseRoutes,
  stops,
}: UsePersistentFleetParams) {
  // Speed multiplier: 1x, 2x, 4x
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Active persistent routes (Supabase-backed if provided, fallback to default)
  const { routes: activeRoutes, routesMap: activeRoutesMap } = useMemo(() => {
    if (supabaseRoutes && supabaseRoutes.length > 0) {
      return buildPersistentRoutes(supabaseRoutes, stops);
    }
    return { routes: PERSISTENT_ROUTES, routesMap: PERSISTENT_ROUTES_MAP };
  }, [supabaseRoutes, stops]);

  const activeRoutesMapRef = useRef(activeRoutesMap);
  useEffect(() => {
    activeRoutesMapRef.current = activeRoutesMap;
  }, [activeRoutesMap]);

  const activeRoutesRef = useRef(activeRoutes);
  useEffect(() => {
    activeRoutesRef.current = activeRoutes;
  }, [activeRoutes]);

  const stopsRef = useRef(stops);
  useEffect(() => {
    stopsRef.current = stops;
  }, [stops]);

  // Persistent fleet initialized with Supabase fleet if available, or initial static fleet
  const fleetRef = useRef<PersistentBus[]>(
    supabaseFleet && supabaseFleet.length > 0 ? supabaseFleet : createInitialFleet()
  );

  // Sync fleet when Supabase fleet data is loaded
  useEffect(() => {
    if (supabaseFleet && supabaseFleet.length > 0) {
      fleetRef.current = supabaseFleet;
      setFleetState(supabaseFleet);
    }
  }, [supabaseFleet]);

  // Active primary bus being tracked on the commuter's journey
  const activeTripBusIdRef = useRef<string | null>(null);
  const hasDwelledAtStartRef = useRef<boolean>(false);

  // Throttled fleet state for React UI components (ResultsCard, Telemetry, etc.)
  const [fleetState, setFleetState] = useState<PersistentBus[]>(() => fleetRef.current);

  // Active query result based on current start & destination
  const [journeyResult, setJourneyResult] = useState<JourneyQueryResult | null>(null);

  const lastAnimTimeRef = useRef<number>(performance.now());
  const lastUiUpdateRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  // Reset active trip lock when user changes destination or origin stop
  useEffect(() => {
    activeTripBusIdRef.current = null;
    hasDwelledAtStartRef.current = false;
  }, [startStopId, destStopId]);

  // Requirement 2: Global continuous simulation loop running in the background at all times
  useEffect(() => {
    let isRunning = true;

    const tick = (now: number) => {
      if (!isRunning) return;

      const deltaMs = now - lastAnimTimeRef.current;
      lastAnimTimeRef.current = now;

      // Cap delta time to prevent giant jumps if browser tab loses focus
      const deltaSec = Math.min(0.1, deltaMs / 1000);

      if (!isPaused && deltaSec > 0) {
        const currentFleet = fleetRef.current;
        const updatedFleet: PersistentBus[] = [];

        // Check if active trip bus reaches the boarding stop to initiate platform dwell
        const activeBusId = activeTripBusIdRef.current;
        let busToDwellId: string | null = null;
        let busDwellDist: number | null = null;

        if (activeBusId && startStopId && !hasDwelledAtStartRef.current) {
          const activeBus = currentFleet.find((b) => b.id === activeBusId);
          if (activeBus) {
            const route =
              activeRoutesMapRef.current.get(activeBus.routeId) ||
              activeRoutesMapRef.current.get(String(activeBus.routeId)) ||
              PERSISTENT_ROUTES_MAP.get(activeBus.routeId);
            if (route) {
              const isOutbound = activeBus.direction === 'outbound';
              const startDist = isOutbound
                ? route.stopDistances[startStopId]?.outboundDist ?? 0
                : route.stopDistances[startStopId]?.inboundDist ?? 0;

              // If bus is within 25 meters of reaching the stop platform
              const distToStop = startDist - activeBus.currentDistanceMeters;
              if (distToStop >= -10 && distToStop <= 30) {
                busToDwellId = activeBusId;
                busDwellDist = startDist;
                hasDwelledAtStartRef.current = true;
              }
            }
          }
        }

        for (let i = 0; i < currentFleet.length; i++) {
          let bus = currentFleet[i];
          const route =
            activeRoutesMapRef.current.get(bus.routeId) ||
            activeRoutesMapRef.current.get(String(bus.routeId)) ||
            PERSISTENT_ROUTES_MAP.get(bus.routeId);

          if (bus.id === busToDwellId && busDwellDist !== null && route) {
            // Initiate platform boarding dwell: bus pauses at the stop platform for 4 seconds
            bus = {
              ...bus,
              currentDistanceMeters: busDwellDist,
              isDwelling: true,
              dwellRemainingSeconds: 4.0,
              speedKmh: 0,
            };
          }

          if (route) {
            updatedFleet.push(advanceBusAlongLoop(bus, route, deltaSec, simSpeed));
          } else {
            updatedFleet.push(bus);
          }
        }

        fleetRef.current = updatedFleet;

        // Throttle React state updates to ~4Hz (every 250ms) to prevent unnecessary re-rendering
        // while the map component interpolates at 60fps
        if (now - lastUiUpdateRef.current >= 250) {
          lastUiUpdateRef.current = now;
          setFleetState([...updatedFleet]);

          if (destStopId && startStopId && destStopId !== startStopId) {
            const queryRes = queryPersistentBusesForJourney(
              startStopId,
              destStopId,
              updatedFleet,
              activeTripBusIdRef.current,
              activeRoutesRef.current,
              stopsRef.current
            );
            setJourneyResult(queryRes);

            if (queryRes?.primaryBus) {
              activeTripBusIdRef.current = queryRes.primaryBus.bus.id;
            }
          } else {
            setJourneyResult(null);
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    lastAnimTimeRef.current = performance.now();
    animFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPaused, simSpeed, startStopId, destStopId]);

  // Immediately re-query when startStopId or destStopId changes (without restarting any bus)
  useEffect(() => {
    if (destStopId && startStopId && destStopId !== startStopId) {
      const res = queryPersistentBusesForJourney(
        startStopId,
        destStopId,
        fleetRef.current,
        activeTripBusIdRef.current,
        activeRoutes,
        stops
      );
      setJourneyResult(res);
      if (res?.primaryBus) {
        activeTripBusIdRef.current = res.primaryBus.bus.id;
      }
    } else {
      setJourneyResult(null);
    }
  }, [startStopId, destStopId, activeRoutes, stops]);

  // User action: immediately start the bus on the route intended
  const startTripNow = useCallback(
    (targetBusIdOverride?: string, destStopIdOverride?: string) => {
      const effectiveDestStopId = destStopIdOverride || destStopId;
      if (!effectiveDestStopId || !startStopId) return;

      const targetBusId =
        targetBusIdOverride ||
        activeTripBusIdRef.current ||
        journeyResult?.primaryBus?.bus.id;
      if (!targetBusId) return;

      activeTripBusIdRef.current = targetBusId;
      const targetBus = fleetRef.current.find((b) => b.id === targetBusId);
      if (!targetBus) return;
      const route =
        activeRoutesMapRef.current.get(targetBus.routeId) ||
        activeRoutesMapRef.current.get(String(targetBus.routeId)) ||
        PERSISTENT_ROUTES_MAP.get(targetBus.routeId);
      if (!route) return;

      const isOutbound = targetBus.direction === 'outbound';
      const startDist = isOutbound
        ? route.stopDistances[startStopId]?.outboundDist ?? 0
        : route.stopDistances[startStopId]?.inboundDist ?? 0;

      // Immediately conclude boarding dwell and start moving along the intended route!
      hasDwelledAtStartRef.current = true;
      const advanceDist = (startDist + 15) % route.totalLoopDistanceMeters;
      const { position, bearing } = interpolatePositionAlongLoop(
        route.fullLoopPath,
        route.cumDistances,
        advanceDist
      );

      fleetRef.current = fleetRef.current.map((b) => {
        if (b.id === targetBusId) {
          return {
            ...b,
            currentDistanceMeters: advanceDist,
            currentPos: position,
            bearing,
            isDwelling: false,
            dwellRemainingSeconds: 0,
            speedKmh: b.speedKmh || 32,
          };
        }
        return b;
      });

      const res = queryPersistentBusesForJourney(
        startStopId,
        effectiveDestStopId,
        fleetRef.current,
        targetBusId,
        activeRoutesRef.current,
        stopsRef.current
      );
      setJourneyResult(res);
    },
    [destStopId, startStopId, journeyResult]
  );

  // Reset trip to track the next approaching bus
  const resetTrip = useCallback(() => {
    activeTripBusIdRef.current = null;
    hasDwelledAtStartRef.current = false;
    if (destStopId && startStopId && destStopId !== startStopId) {
      const res = queryPersistentBusesForJourney(
        startStopId,
        destStopId,
        fleetRef.current,
        null,
        activeRoutesRef.current,
        stopsRef.current
      );
      setJourneyResult(res);
      if (res?.primaryBus) {
        activeTripBusIdRef.current = res.primaryBus.bus.id;
      }
    }
  }, [destStopId, startStopId]);

  // Set of matching bus IDs for active query (Requirement 4)
  const matchingBusIds = useMemo(() => {
    return journeyResult?.allMatchingBusIds || [];
  }, [journeyResult]);

  // Toggle pause
  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  return {
    fleet: fleetState,
    fleetRef,
    routes: activeRoutes,
    journeyResult,
    primaryBus: journeyResult?.primaryBus || null,
    matchingBusIds,
    simSpeed,
    setSimSpeed,
    isPaused,
    setIsPaused,
    togglePause,
    startTripNow,
    resetTrip,
  };
}

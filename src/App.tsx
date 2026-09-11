import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { DestinationSelector } from './components/DestinationSelector';
import { ResultsCard } from './components/ResultsCard';
import { LiveBusMap } from './components/LiveBusMap';
import { ActiveFleetCard } from './components/ActiveFleetCard';
import { DevQrGenerator } from './components/DevQrGenerator';
import { InvalidQrScreen } from './components/InvalidQrScreen';
import { TransitIntelligenceSection } from './components/TransitIntelligenceSection';
import { StopHeaderCard } from './components/StopHeaderCard';
import { StopDetailPanel } from './components/StopDetailPanel';
import { StopDeparture } from './utils/departureHelper';
import { STOPS, getRouteRecommendation, getRoadNameForCoordinate } from './data/transitData';
import { getStopFromCurrentUrl, updateUrlForStop } from './utils/urlHelper';
import { Stop, SimulationPhase, RouteRecommendation, PersistentBus } from './types';
import {
  getAllUnderlyingStopIds,
  getCanonicalDisplayName,
  getCanonicalGroupForStop,
} from './data/canonicalStops';
import { runAllRoutesStopOrderAudit, RouteAuditResult } from './utils/routeOrderAudit';
import { RouteOrderAuditModal } from './components/RouteOrderAuditModal';
import { TransitTimeDebugModal } from './components/TransitTimeDebugModal';
import { useFirebaseTransit } from './hooks/useFirebaseTransit';
import { useSupabaseTransit } from './hooks/useSupabaseTransit';
import { useTransitIntelligence } from './hooks/useTransitIntelligence';
import { useUserJourneyTracker } from './hooks/useUserJourneyTracker';
import { usePersistentFleet } from './hooks/usePersistentFleet';
import { Compass, QrCode, Share2, Check, Bookmark, Star, Signal, Wifi, Battery, X, LogOut, Navigation } from 'lucide-react';
import { QrLoadingScreen } from './components/QrLoadingScreen';
import { SplashScreen } from './components/SplashScreen';
import { BoardingDetailModal, BoardingModalData } from './components/BoardingDetailModal';
import { ArrivalAlertBanner } from './components/ArrivalAlertBanner';
import { PostBoardingSignInBanner } from './components/PostBoardingSignInBanner';
import { RideFeedbackModal } from './components/RideFeedbackModal';
import {
  createBoardedTrip,
  completeBoardedTrip,
  submitTripFeedback,
  getStoredActiveTrip,
  clearStoredActiveTrip,
  BoardedTrip,
} from './services/tripService';

export default function App() {
  // Check if developer / test QR generator page is requested via URL (?dev=qr-generator or /dev/qr-generator)
  const [isDevQrGeneratorOpen, setIsDevQrGeneratorOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const search = new URLSearchParams(window.location.search);
    return (
      path.includes('/dev/qr-generator') ||
      path.includes('/qr-generator') ||
      search.get('dev') === 'qr-generator' ||
      search.get('page') === 'qr-generator'
    );
  });

  // Current stop automatically detected strictly from URL parameter (?stop=ruby_general_hospital)
  // If missing or invalid, remains null (never falls back/guesses)
  const [currentStop, setCurrentStop] = useState<Stop | null>(() => getStopFromCurrentUrl(STOPS));

  // Night-time / Dark mode toggle for outdoor bus waiting
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kolkata_transit_theme') === 'dark';
    } catch {
      return false;
    }
  });

  // Live device local clock (updates every 10s to keep status bar accurate)
  const [deviceTime, setDeviceTime] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  useEffect(() => {
    const updateTime = () => {
      setDeviceTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Transit time & loop telemetry debug modal
  const [isTimeDebugModalOpen, setIsTimeDebugModalOpen] = useState<boolean>(false);

  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('kolkata_transit_theme', next ? 'dark' : 'light');
      } catch {}
      return next;
    });
  }, []);

  // Supabase-backed stops, routes, and deterministic fleet
  const {
    stops: supabaseStops,
    routes: supabaseRoutes,
    trips: supabaseTrips,
    deterministicFleet,
    isLoading: isTransitLoading,
    refreshTransitData,
  } = useSupabaseTransit();

  const allStops = useMemo(
    () => (supabaseStops && supabaseStops.length > 0 ? supabaseStops : STOPS),
    [supabaseStops]
  );
  const allRoutes = useMemo(
    () => (supabaseRoutes && supabaseRoutes.length > 0 ? supabaseRoutes : []),
    [supabaseRoutes]
  );

  // Selected destination (single source of truth for both search input and departure filtering)
  const [destinationId, setDestinationId] = useState<string>('');

  // Fixed persistent fleet simulation running continuously in the background
  const {
    fleet,
    fleetRef,
    routes,
    journeyResult,
    primaryBus,
    matchingBusIds,
    simSpeed,
    setSimSpeed,
    isPaused,
    togglePause,
    startTripNow,
    resetTrip,
  } = usePersistentFleet({
    startStopId: currentStop?.id || '',
    destStopId: destinationId,
    supabaseFleet: deterministicFleet,
    supabaseRoutes: allRoutes,
    stops: allStops,
  });

  // Resolve destination stop: prefer the specific stop instance picked by journey matching,
  // then direct match, then canonical group representative.
  const destinationStop = useMemo(() => {
    if (!destinationId) return null;
    if (journeyResult?.destStop) {
      return journeyResult.destStop;
    }
    const cleanId = destinationId.replace(/^canonical:/, '');
    const direct = allStops.find((s) => s.id === cleanId);
    if (direct) return direct;

    const targetIds = getAllUnderlyingStopIds(destinationId, allStops);
    const matched = allStops.find((s) => targetIds.includes(s.id));
    return matched || null;
  }, [destinationId, allStops, journeyResult]);

  // Sync currentStop with dynamic Supabase stops once loaded
  useEffect(() => {
    if (supabaseStops && supabaseStops.length > 0) {
      const stop = getStopFromCurrentUrl(supabaseStops);
      setCurrentStop(stop);
    }
  }, [supabaseStops]);

  // Diagnostic logging for origin/destination pair, matched routes, and trip instances count
  useEffect(() => {
    if (!currentStop) return;
    const targetDestIds = destinationId ? getAllUnderlyingStopIds(destinationId, allStops) : [];
    const matched = allRoutes.filter((r) => {
      const outStart = r.stops.indexOf(currentStop.id);
      const outDest = destinationId ? r.stops.some((sId) => targetDestIds.includes(sId)) : false;
      if (destinationId) {
        return outStart !== -1 && outDest;
      }
      return outStart !== -1;
    });

    console.log(
      `[BusTracker Diagnostic]\n` +
      `  • Origin: "${currentStop.name}" (${currentStop.id})\n` +
      `  • Destination: ${destinationStop ? `"${destinationStop.name}" (${destinationId})` : 'None selected'}\n` +
      `  • Matched Routes (${matched.length}): ${matched.map((r) => r.number).join(', ') || 'None'}\n` +
      `  • Supabase trip_instances loaded: ${supabaseTrips.length}\n` +
      `  • Active Deterministic Fleet Buses: ${deterministicFleet.length}\n` +
      `  • Journey matching buses: ${journeyResult?.matchingBuses?.length ?? 0}`
    );
  }, [currentStop, destinationId, destinationStop, allRoutes, supabaseTrips, deterministicFleet, journeyResult, allStops]);

  // Telemetry from live map GPS simulation
  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number>(4);
  const [liveDistanceKm, setLiveDistanceKm] = useState<number>(1.8);
  const [busStatusText, setBusStatusText] = useState<string>('En route on transit corridor');
  const [simPhase, setSimPhase] = useState<SimulationPhase>('approaching');
  const [simBusPosition, setSimBusPosition] = useState<[number, number] | null>(null);

  // Navigation & Modals state
  const [isFullMapOpen, setIsFullMapOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Requirement 1: QR scan loading screen & locked origin state
  const [isQrLoading, setIsQrLoading] = useState<boolean>(false);
  const [isOriginLocked, setIsOriginLocked] = useState<boolean>(true);

  // Requirement 3 & 4: Boarding Detail Modal and Active Boarded Journey
  const [boardingModalData, setBoardingModalData] = useState<BoardingModalData | null>(null);
  const [activeBoardedTrip, setActiveBoardedTrip] = useState<BoardedTrip | null>(() => getStoredActiveTrip());
  const [hasUserDismissedSignInBanner, setHasUserDismissedSignInBanner] = useState<boolean>(false);

  // Requirement 6: Arrival alert banner & Trip feedback modal
  const [showArrivalAlert, setShowArrivalAlert] = useState<boolean>(true);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const hasTriggeredFeedbackRef = useRef<boolean>(false);

  const handleOpenAuditModal = useCallback(() => setIsAuditModalOpen(true), []);
  const handleOpenScheduleModal = useCallback(() => {
    if (!currentStop) return;
    // If no destination is chosen yet, automatically select the default route destination
    // for this stop so the user immediately gets the full Bus Schedule view
    if (!destinationId) {
      const currentRoute = allRoutes.find(
        (r) => r.stops?.includes(currentStop.id) || (r as any).outboundStopIds?.includes(currentStop.id)
      );
      if (currentRoute) {
        const stopsList = (currentRoute as any).outboundStopIds || currentRoute.stops || [];
        const terminalDest = stopsList[stopsList.length - 1];
        if (terminalDest && terminalDest !== currentStop.id) {
          setDestinationId(terminalDest);
        }
      }
    }
    setIsScheduleModalOpen(true);
  }, [destinationId, allRoutes, currentStop]);
  const handleOpenFullMap = useCallback(() => setIsFullMapOpen(true), []);
  const handleCloseFullMap = useCallback(() => setIsFullMapOpen(false), []);

  const handleQrLoadingComplete = useCallback(() => {
    setIsQrLoading(false);
  }, []);

  const handleSelectDeparture = useCallback((departure: StopDeparture) => {
    setDestinationId(departure.destinationStopId);
  }, []);



  // Requirement 1, 2 & 3: Run Stop-Order Audit across all routes on app load (dev-only)
  // Flags any reversal > 120° and console.tables results sorted by reversal count descending
  const [auditResults, setAuditResults] = useState<RouteAuditResult[]>([]);
  useEffect(() => {
    if (allRoutes.length === 0 || allStops.length === 0) return;

    const stopsMap = new Map(allStops.map((s) => [s.id, s]));
    const isDev = import.meta.env?.DEV !== false;
    const audited = runAllRoutesStopOrderAudit(allRoutes, stopsMap, isDev);
    setAuditResults(audited);
  }, [allRoutes, allStops]);

  // Firebase Auth & Firestore hook
  const {
    currentUser,
    favoriteStops,
    savedRoutes,
    communityAlerts,
    signInWithGoogle,
    logOut,
    toggleFavoriteStop,
    toggleSaveRoute,
    postAlert,
    isStopFavorited,
    isRouteSaved,
  } = useFirebaseTransit();

  // Requirement 3: Dynamic Route Recommendation built directly from the live matching bus query
  const recommendation: RouteRecommendation | null = useMemo(() => {
    if (!currentStop || !destinationId || destinationId === currentStop.id || !destinationStop) {
      return null;
    }

    const targetDestIds = getAllUnderlyingStopIds(destinationId, allStops);

    if (journeyResult?.primaryBus) {
      const pb = journeyResult.primaryBus;
      // HARD CHECK: Both origin and destination must exist in pb.route
      const stopSeq = (pb.route as any).stops || (pb.route as any).stop_sequence || (pb.route as any).outboundStopIds || [];
      const hasOrigin = stopSeq.includes(currentStop.id) || (pb.route as any).inboundStopIds?.includes(currentStop.id);
      const hasDest =
        targetDestIds.some((tId) => stopSeq.includes(tId)) ||
        targetDestIds.some((tId) => (pb.route as any).inboundStopIds?.includes(tId));

      if (!hasOrigin || !hasDest) {
        console.error(
          `[Stop Matching Bug] journeyResult.primaryBus route "${pb.route.number || pb.route.id}" lacks required stops! Origin "${currentStop.id}": ${hasOrigin}, Destination "${destinationId}": ${hasDest}. Refusing to return recommendation.`,
          { stopSeq }
        );
        return null;
      }

      return {
        route: pb.route,
        currentStop,
        destinationStop: pb.destinationStop || destinationStop,
        fare: pb.fare,
        initialEtaMinutes: pb.etaToStartMinutes,
        stopsRemaining: pb.stopsRemainingToStart,
        distanceKm: Math.round((pb.distanceStartToDestMeters / 1000) * 10) / 10,
        isDirect: true,
        busNumberPlate: pb.bus.licensePlate,
        crowdLevel: pb.bus.crowdLevel,
        pathCoordinates: pb.pathFromStartToDest,
        approachPath: [],
      };
    }

    if (journeyResult?.transferJourney) {
      const tj = journeyResult.transferJourney;
      const leg1Seq = (tj.leg1Route as any).stops || (tj.leg1Route as any).stop_sequence || (tj.leg1Route as any).outboundStopIds || [];
      const leg2Seq = (tj.leg2Route as any).stops || (tj.leg2Route as any).stop_sequence || (tj.leg2Route as any).outboundStopIds || [];

      const leg1Valid = (leg1Seq.includes(currentStop.id) || (tj.leg1Route as any).inboundStopIds?.includes(currentStop.id)) &&
                        (leg1Seq.includes(tj.transferStop.id) || (tj.leg1Route as any).inboundStopIds?.includes(tj.transferStop.id));
      const leg2Valid = (leg2Seq.includes(tj.transferStop.id) || (tj.leg2Route as any).inboundStopIds?.includes(tj.transferStop.id)) &&
                        (targetDestIds.some((tId) => leg2Seq.includes(tId)) || targetDestIds.some((tId) => (tj.leg2Route as any).inboundStopIds?.includes(tId)));

      if (!leg1Valid || !leg2Valid) {
        console.error(
          `[Stop Matching Bug] journeyResult.transferJourney legs invalid for origin "${currentStop.id}", transfer "${tj.transferStop.id}", destination "${destinationId}".`,
          { leg1Valid, leg2Valid }
        );
        return null;
      }

      return {
        route: tj.leg1Route,
        currentStop,
        destinationStop: tj.leg2Bus.destinationStop || destinationStop,
        fare: tj.totalFare,
        initialEtaMinutes: tj.leg1Bus.etaToStartMinutes,
        stopsRemaining: tj.leg1Bus.stopsRemainingToStart,
        distanceKm: Math.round(((tj.leg1Bus.distanceStartToDestMeters + tj.leg2Bus.distanceStartToDestMeters) / 1000) * 10) / 10,
        isDirect: false,
        busNumberPlate: tj.leg1Bus.bus.licensePlate,
        crowdLevel: tj.leg1Bus.bus.crowdLevel,
        pathCoordinates: tj.combinedPath,
        approachPath: [],
        transferStop: tj.transferStop,
        secondLegRoute: tj.leg2Route,
      };
    }

    // Fallback to static data / route recommendation search
    const rec = getRouteRecommendation(currentStop.id, destinationId, allRoutes, allStops);
    if (!rec) {
      return null;
    }

    const routeStops = rec.route.stops || (rec.route as any).stop_sequence || [];
    const hasOrigin = routeStops.includes(currentStop.id);
    const hasDest = targetDestIds.some((tId) => routeStops.includes(tId));

    if (rec.isDirect && (!hasOrigin || !hasDest)) {
      console.error(
        `[Stop Matching Bug] getRouteRecommendation returned direct route "${rec.route.number || rec.route.id}" without both origin "${currentStop.id}" and destination "${destinationId}" present!`,
        { hasOrigin, hasDest, routeStops }
      );
      return null;
    }

    return rec;
  }, [destinationId, currentStop, destinationStop, journeyResult, allRoutes, allStops]);

  // Fallback recommendation for the Bus Schedule modal if no destination was selected yet
  const scheduleModalRecommendation = useMemo(() => {
    if (!currentStop) return null;
    if (recommendation) return recommendation;

    // Find the first route serving currentStop
    const servingRoute = allRoutes.find(
      (r) =>
        r.stops?.includes(currentStop.id) ||
        (r as any).outboundStopIds?.includes(currentStop.id) ||
        (r as any).inboundStopIds?.includes(currentStop.id)
    ) || allRoutes[0];

    if (!servingRoute) return null;

    const stopsList = (servingRoute as any).outboundStopIds || servingRoute.stops || [];
    const destStopId = stopsList.find((id: string) => id !== currentStop.id) || stopsList[stopsList.length - 1] || 'esplanade';
    const destStop: Stop = allStops.find((s) => s.id === destStopId) || {
      id: destStopId,
      name: 'Esplanade Terminal',
      code: 'ESP',
      platform: 'Bay 1',
      lat: 22.5645,
      lng: 88.352,
      description: 'Central terminus in Kolkata',
    };

    return getRouteRecommendation(currentStop.id, destStop.id, allRoutes, allStops) || ({
      route: servingRoute,
      currentStop,
      destinationStop: destStop,
      fare: 20,
      initialEtaMinutes: 4,
      stopsRemaining: 2,
      distanceKm: 4.8,
      isDirect: true,
      busNumberPlate: 'WB-04-E-1984',
      crowdLevel: 'Moderate' as const,
      pathCoordinates: [[Number(currentStop.lat), Number(currentStop.lng)], [Number(destStop.lat), Number(destStop.lng)]],
      approachPath: [],
    } as RouteRecommendation);
  }, [recommendation, allRoutes, allStops, currentStop]);

  // Guaranteed recommendation for the active boarded journey
  const boardedTripRecommendation = useMemo(() => {
    if (!activeBoardedTrip) return null;
    if (recommendation) return recommendation;

    const route = allRoutes.find(
      (r) => r.id === activeBoardedTrip.routeId || r.number === activeBoardedTrip.routeNumber
    );
    const destStop: Stop =
      allStops.find((s) => s.id === activeBoardedTrip.destinationStopId) || {
        id: activeBoardedTrip.destinationStopId || 'dest',
        name: activeBoardedTrip.destinationStopName,
        lat: 22.5726,
        lng: 88.3639,
      };
    const origStop: Stop =
      allStops.find((s) => s.id === activeBoardedTrip.originStopId) || currentStop || allStops[0];

    if (route) {
      const fromStatic = getRouteRecommendation(origStop.id, destStop.id, allRoutes, allStops);
      if (fromStatic) return fromStatic;
    }

    return {
      route: route || {
        id: activeBoardedTrip.routeId,
        number: activeBoardedTrip.routeNumber,
        name: `${activeBoardedTrip.originStopName} - ${activeBoardedTrip.destinationStopName}`,
        type: 'Express',
        frequency: 'Every 10 min',
        baseFare: activeBoardedTrip.fare || 20,
        farePerStop: 5,
        stops: [origStop.id, destStop.id],
      },
      currentStop: origStop,
      destinationStop: destStop,
      fare: activeBoardedTrip.fare || 20,
      initialEtaMinutes: Math.max(1, Math.round(liveEtaMinutes)),
      stopsRemaining: 1,
      distanceKm: Math.max(1, Math.round(liveDistanceKm * 10) / 10),
      isDirect: true,
      busNumberPlate: activeBoardedTrip.busLicensePlate || activeBoardedTrip.busId,
      crowdLevel: 'Moderate' as const,
      pathCoordinates: [
        [Number(origStop.lat), Number(origStop.lng)],
        [Number(destStop.lat), Number(destStop.lng)],
      ],
      approachPath: [],
    } as RouteRecommendation;
  }, [activeBoardedTrip, recommendation, allRoutes, allStops, currentStop, liveEtaMinutes, liveDistanceKm]);

  // Real-time server telemetry + Google Search Grounding + Google Maps Grounding
  const {
    liveFleet,
    wbtcFleet,
    fleetLoading,
    refetchFleet,
    searchSummary,
    searchSources,
    searchLoading,
    refetchSearch,
    mapsSummary,
    mapsPlaces,
    mapsLoading,
    refetchMaps,
  } = useTransitIntelligence(
    currentStop?.name || '',
    currentStop?.lat || 22.5726,
    currentStop?.lng || 88.3639,
    recommendation?.route?.number
  );

  // Sync with browser navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const stopFromUrl = getStopFromCurrentUrl(allStops);
      setCurrentStop(stopFromUrl);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [allStops]);

  // Update URL whenever currentStop changes
  const handleSelectStop = useCallback((stop: Stop) => {
    setCurrentStop(stop);
    updateUrlForStop(stop.id);
    setDestinationId('');
  }, []);

  // Handle telemetry updates from map simulation (throttled to avoid re-rendering entire App 4x/second)
  const lastCommittedTelemetryRef = useRef<{ eta: number; distKm: number; status: string; phase: SimulationPhase }>({
    eta: 4,
    distKm: 1.8,
    status: 'En route on transit corridor',
    phase: 'approaching',
  });

  const handleTelemetryUpdate = useCallback(
    (
      eta: number,
      distKm: number,
      status: string,
      phase: SimulationPhase = 'approaching',
      pos?: [number, number]
    ) => {
      const prev = lastCommittedTelemetryRef.current;

      // FREEZE: Once the trip has arrived at destination, don't let the bus
      // looping back around reset the phase to 'approaching' or 'in_transit'.
      // Keep arrived_dest locked until the feedback modal finishes and clears state.
      if (prev.phase === 'arrived_dest' && phase !== 'arrived_dest') {
        return;
      }

      const etaDiff = Math.abs(prev.eta - eta);
      const distDiff = Math.abs(prev.distKm - distKm);
      const phaseChanged = prev.phase !== phase;
      const statusChanged = prev.status !== status;

      // Only trigger an App component re-render when the values have visibly changed
      if (etaDiff >= 0.5 || distDiff >= 0.2 || phaseChanged || statusChanged) {
        lastCommittedTelemetryRef.current = { eta, distKm, status, phase };
        setLiveEtaMinutes(eta);
        setLiveDistanceKm(distKm);
        setBusStatusText(status);
        setSimPhase(phase);
      }
      if (pos) {
        setSimBusPosition((prevPos) => {
          if (!prevPos || Math.hypot(prevPos[0] - pos[0], prevPos[1] - pos[1]) > 0.0001) {
            return pos;
          }
          return prevPos;
        });
      }
    },
    []
  );

  // Real-time corridor/road name of active or simulated bus
  const currentRoadName = useMemo(() => {
    if (activeBoardedTrip) {
      const bus = fleet.find((b) => b.id === activeBoardedTrip.busId);
      if (bus?.currentRoadName) return bus.currentRoadName;
    }
    if (journeyResult?.primaryBus?.bus?.currentRoadName) {
      return journeyResult.primaryBus.bus.currentRoadName;
    }
    if (simBusPosition) {
      return getRoadNameForCoordinate(simBusPosition[0], simBusPosition[1]);
    }
    return recommendation?.route?.road_corridor || 'Kolkata Transit Corridor';
  }, [activeBoardedTrip, fleet, journeyResult, simBusPosition, recommendation]);

  // Personalized user journey tracking (when signed in + destination selected)
  const {
    userLocation,
    distanceToStopMeters,
    walkTimeMinutes,
    hasBoarded,
    elapsedTravelTimeSeconds,
    gpsStatus,
    isSimulated,
    toggleSimulatedGps,
    triggerBoarding,
    resetJourney,
  } = useUserJourneyTracker({
    currentUser,
    destinationId,
    currentStop,
    busPosition: simBusPosition,
    simPhase,
  });

  // Boarding Flow Handlers
  const handleOpenBoardingModal = useCallback(
    (departureOrBus: StopDeparture | PersistentBus) => {
      let busId: string;
      let routeId: string;
      let routeNumber: string;
      let routeColor: string;
      let busType: string;
      let fare = 20;
      let plate: string | undefined;

      if ('destinationStopId' in departureOrBus) {
        // From StopDeparture
        busId = departureOrBus.busId;
        routeId = departureOrBus.routeId;
        routeNumber = departureOrBus.routeNumber;
        routeColor = departureOrBus.routeColor;
        busType = departureOrBus.busType;
        fare = departureOrBus.fare;
      } else {
        // From PersistentBus
        busId = departureOrBus.id;
        routeId = departureOrBus.routeId;
        routeNumber = departureOrBus.routeNumber;
        routeColor = departureOrBus.routeColor;
        busType = departureOrBus.type;
        plate = departureOrBus.licensePlate;
      }

      const route = allRoutes.find((r) => r.id === routeId || r.number === routeNumber);
      const destStopName = destinationStop?.name || 'Destination Stop';
      const destStopId = destinationStop?.id || destinationId || 'dest';

      setBoardingModalData({
        busId,
        routeId,
        routeNumber,
        routeColor,
        busType,
        licensePlate: plate,
        originStop: currentStop,
        nextStopName: (route as any)?.stops?.[1] || undefined,
        destinationStopName: destStopName,
        destinationStopId: destStopId,
        fare,
        etaMinutes: 0,
      });
    },
    [allRoutes, currentStop, destinationStop, destinationId]
  );

  // Triggered when commuter clicks "I am on the bus"
  const handleConfirmBoarding = useCallback(
    async (modalData: BoardingModalData) => {
      setBoardingModalData(null);
      triggerBoarding();

      if (modalData.destinationStopId && destinationId !== modalData.destinationStopId) {
        setDestinationId(modalData.destinationStopId);
      }

      // Immediately advance persistent fleet bus onto the cruise trajectory toward destination
      startTripNow(modalData.busId, modalData.destinationStopId);

      const trip = await createBoardedTrip({
        userId: currentUser?.uid || null,
        busId: modalData.busId,
        routeId: modalData.routeId,
        routeNumber: modalData.routeNumber,
        originStopId: modalData.originStop.id,
        originStopName: modalData.originStop.name,
        destinationStopId: modalData.destinationStopId,
        destinationStopName: modalData.destinationStopName,
        fare: modalData.fare,
        busLicensePlate: modalData.licensePlate,
      });

      setActiveBoardedTrip(trip);
      setHasUserDismissedSignInBanner(false);
      setShowArrivalAlert(true);
      hasTriggeredFeedbackRef.current = false;
    },
    [currentUser, triggerBoarding, destinationId, startTripNow]
  );

  // Manual Exit/Leave Trip handler
  const handleExitTrip = useCallback(async () => {
    if (activeBoardedTrip) {
      await completeBoardedTrip(activeBoardedTrip.id);
    }
    setActiveBoardedTrip(null);
    clearStoredActiveTrip();
    resetTrip();
    setSimPhase('approaching');
    setLiveEtaMinutes(4);
    setLiveDistanceKm(1.8);
    hasTriggeredFeedbackRef.current = false;
    lastCommittedTelemetryRef.current = { eta: 4, distKm: 1.8, status: 'En route on transit corridor', phase: 'approaching' };
  }, [activeBoardedTrip, resetTrip]);

  // Feedback Submission Handler
  const handleFeedbackSubmit = useCallback(
    async (feedbackData: {
      busMaintenanceRating: number;
      driverConductorRating: number;
      reachedOnTime: boolean;
      comments?: string;
    }) => {
      if (!activeBoardedTrip) return;

      // Save destination stop so we can navigate there after the modal closes
      const completedDestStopId = activeBoardedTrip.destinationStopId;
      const completedDestStopName = activeBoardedTrip.destinationStopName;

      await submitTripFeedback({
        tripId: activeBoardedTrip.id,
        userId: currentUser?.uid || null,
        ...feedbackData,
      });

      await completeBoardedTrip(activeBoardedTrip.id);

      // After 2.2s (thank-you screen in modal), close modal and navigate home
      // with destination stop as the new starting stop
      setTimeout(() => {
        setIsFeedbackModalOpen(false);
        setActiveBoardedTrip(null);
        clearStoredActiveTrip();
        resetTrip();
        setDestinationId('');
        setSimPhase('approaching');
        setLiveEtaMinutes(4);
        setLiveDistanceKm(1.8);
        // Unfreeze the arrived_dest lock so next journey telemetry flows freely
        lastCommittedTelemetryRef.current = { eta: 4, distKm: 1.8, status: 'En route on transit corridor', phase: 'approaching' };
        hasTriggeredFeedbackRef.current = false;

        // Navigate to destination stop as the new origin
        const newOrigin = allStops.find((s) => s.id === completedDestStopId) ||
          allStops.find((s) => s.name.trim().toLowerCase() === completedDestStopName.trim().toLowerCase());
        if (newOrigin) {
          setCurrentStop(newOrigin);
          updateUrlForStop(newOrigin.id);
        }
      }, 2200);
    },
    [activeBoardedTrip, currentUser, resetTrip, allStops]
  );

  // Trigger feedback form automatically on arrival at destination stop
  useEffect(() => {
    if (activeBoardedTrip && !hasTriggeredFeedbackRef.current) {
      const isArrivedPhase = simPhase === 'arrived_dest' || journeyResult?.primaryBus?.tripPhase === 'arrived_dest';
      const isArrivedDist = liveDistanceKm <= 0.05 && liveEtaMinutes <= 0.2;
      const isPrimaryNearDest = Boolean(
        journeyResult?.primaryBus &&
        journeyResult.primaryBus.distanceToDestMeters != null &&
        journeyResult.primaryBus.distanceToDestMeters <= 50
      );

      if (isArrivedPhase || isArrivedDist || isPrimaryNearDest) {
        hasTriggeredFeedbackRef.current = true;
        setSimPhase('arrived_dest');
        setLiveDistanceKm(0);
        setLiveEtaMinutes(0);
        setIsFeedbackModalOpen(true);
      }
    }
  }, [activeBoardedTrip, simPhase, liveDistanceKm, liveEtaMinutes, journeyResult]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Bus Tracking at ${currentStop?.name || 'Bus Stop'}`,
        url: window.location.href,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const isCurrentStopFav = currentStop ? isStopFavorited(currentStop.id) : false;
  const isCurrentRouteSaved = currentStop && recommendation?.route?.number
    ? isRouteSaved(currentStop.id, destinationId, recommendation.route.number)
    : false;

  // Dev QR Generator Screen (accessed via ?dev=qr-generator or /dev/qr-generator)
  if (isDevQrGeneratorOpen) {
    return (
      <DevQrGenerator
        stops={allStops}
        initialStopId={currentStop?.id}
        onSelectStop={(stop) => {
          setCurrentStop(stop);
          updateUrlForStop(stop.id);
          setIsDevQrGeneratorOpen(false);
        }}
        onClose={() => {
          setIsDevQrGeneratorOpen(false);
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('dev');
            url.searchParams.delete('page');
            window.history.replaceState({}, '', url.toString());
          } catch {}
        }}
      />
    );
  }

  // Missing or Invalid QR Code Screen (prevents origin guessing)
  if (!currentStop) {
    const invalidParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('stop') : null;
    return (
      <>
        <SplashScreen isDataReady={!isTransitLoading} />
        <InvalidQrScreen
          stops={allStops}
          invalidParam={invalidParam}
          onOpenQrGenerator={() => setIsDevQrGeneratorOpen(true)}
          onSelectTestStop={(stopId) => {
            const matched = allStops.find((s) => s.id === stopId);
            if (matched) {
              setCurrentStop(matched);
              updateUrlForStop(matched.id);
            }
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-center text-slate-900 font-sans antialiased p-0 sm:p-4 selection:bg-blue-600 selection:text-white">
      {/* Sleek Interface Smartphone Frame */}
      <main
        id="app-container"
        className={`w-full max-w-[430px] min-h-screen sm:min-h-[850px] ${
          isDarkMode
            ? 'dark bg-slate-950 text-slate-100 sm:border-slate-700'
            : 'bg-white text-slate-900 sm:border-slate-800'
        } sm:rounded-[44px] sm:border-[10px] shadow-2xl flex flex-col overflow-hidden relative transition-colors duration-200`}
      >
        {/* Sleek Dynamic Island / Top Notch (Visible on Tablet/Desktop) */}
        <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-800 rounded-full z-40 pointer-events-none" />

        {/* Mobile Status Bar (Live Device Clock, WiFi, Battery) */}
        <div
          className={`w-full px-6 pt-3.5 pb-1 flex items-center justify-between text-xs font-semibold ${
            isDarkMode ? 'text-slate-300' : 'text-slate-800'
          } z-30 select-none`}
        >
          <button
            type="button"
            onClick={() => setIsTimeDebugModalOpen(true)}
            className="font-bold text-[13px] tracking-tight hover:opacity-80 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            title="Click to view Live Transit Time & Telemetry Diagnostics"
          >
            <span>{deviceTime}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </button>
          <div className="flex items-center gap-1.5">
            <Signal className="w-3.5 h-3.5 fill-current" />
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4 fill-current" />
          </div>
        </div>

        {/* 1 & 2. HEADER CARD + SEARCH BAR: Dark slate/navy rounded card with QR icon, Verified, Live badge, Audit, and Search */}
        <StopHeaderCard
          currentStop={currentStop}
          selectedDestinationId={destinationId}
          onSelectDestination={setDestinationId}
          isDarkMode={isDarkMode}
          stops={allStops}
          onOpenAuditModal={handleOpenAuditModal}
          flaggedRoutesCount={auditResults.length}
          isOriginLocked={isOriginLocked}
        />

        {/* Post-Boarding Sign-In Banner: Prompt commuter to sign in for extra features */}
        {activeBoardedTrip && !currentUser && !hasUserDismissedSignInBanner && (
          <PostBoardingSignInBanner
            onSignIn={signInWithGoogle}
            onDismiss={() => setHasUserDismissedSignInBanner(true)}
          />
        )}

        {/* 5-Minute Arrival Alert Banner: Unlocked when signed in + boarded */}
        {activeBoardedTrip && currentUser && liveEtaMinutes <= 5 && liveEtaMinutes > 0 && showArrivalAlert && (
          <ArrivalAlertBanner
            etaMinutes={liveEtaMinutes}
            destinationName={activeBoardedTrip.destinationStopName}
            onDismiss={() => setShowArrivalAlert(false)}
          />
        )}

        {/* 3. COMPACT EMBEDDED LEAFLET MAP: roughly 35-40% of screen height */}
        <div className="w-full relative z-20">
          <LiveBusMap
            fleet={fleet}
            fleetRef={fleetRef}
            routes={routes}
            journeyResult={journeyResult}
            currentStop={currentStop}
            destinationStop={destinationStop}
            matchingBusIds={matchingBusIds}
            wbtcFleet={wbtcFleet}
            userLocation={userLocation}
            hasBoarded={hasBoarded || !!activeBoardedTrip}
            simSpeed={simSpeed}
            onSetSimSpeed={setSimSpeed}
            isPaused={isPaused}
            onTogglePause={togglePause}
            isDarkMode={isDarkMode}
            onTelemetryUpdate={handleTelemetryUpdate}
            onRefreshTelemetry={refetchFleet}
            mapSizeProp={isFullMapOpen ? 'fullscreen' : 'standard'}
            onToggleFullscreen={handleCloseFullMap}
            onBoardBus={handleOpenBoardingModal}
          />
        </div>

        {/* 4, 5 & 6. IN-TRANSIT BOARDED VIEW OR DEPARTURES PANEL */}
        {activeBoardedTrip ? (
          <div
            id="in-transit-boarded-container"
            className="bg-white rounded-t-3xl shadow-xl flex-1 flex flex-col overflow-y-auto pt-3 px-4 pb-3 transition-colors duration-200 z-30 space-y-3 max-h-[460px] no-scrollbar"
          >
            {/* Grab Handle & Active Trip Header */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-1" />

            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  On Board • Route {activeBoardedTrip.routeNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={handleExitTrip}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer border border-rose-200/80"
                title="Leave bus or end trip"
              >
                <LogOut className="w-3 h-3" />
                <span>Leave Bus</span>
              </button>
            </div>

            {/* In-Transit ResultsCard showing live Route Progress %, Sequential Stops, and ETA */}
            {(boardedTripRecommendation || scheduleModalRecommendation || recommendation) && (
              <ResultsCard
                recommendation={(boardedTripRecommendation || scheduleModalRecommendation || recommendation)!}
                matchingBuses={journeyResult?.matchingBuses || []}
                transferJourney={journeyResult?.transferJourney || null}
                currentEtaMinutes={liveEtaMinutes}
                currentDistanceRemainingKm={liveDistanceKm}
                liveDistanceKm={liveDistanceKm}
                busStatusText={busStatusText}
                currentRoadName={currentRoadName}
                simPhase={simPhase === 'approaching' ? 'in_transit' : simPhase}
                isRouteSaved={isCurrentRouteSaved}
                onStartRoute={startTripNow}
                onResetTrip={resetTrip}
                isDarkMode={isDarkMode}
                onToggleSaveRoute={() => {
                  const activeRec = boardedTripRecommendation || scheduleModalRecommendation || recommendation;
                  if (!activeRec) return;
                  toggleSaveRoute(
                    currentStop.id,
                    activeRec.destinationStop.id,
                    currentStop.name,
                    activeRec.destinationStop.name,
                    activeRec.route.number
                  );
                }}
              />
            )}
          </div>
        ) : (
          <StopDetailPanel
            currentStop={currentStop}
            fleet={fleet}
            selectedDestinationId={destinationId}
            onSelectDeparture={handleSelectDeparture}
            onViewFullMap={handleOpenFullMap}
            onOpenSchedule={handleOpenScheduleModal}
            onBoardBus={handleOpenBoardingModal}
            routes={routes}
            stops={allStops}
          />
        )}

        {/* Subtle iOS Home Indicator Bar */}
        <div className="w-full bg-white pb-2 pt-1 flex justify-center items-center pointer-events-none z-30">
          <div className="w-32 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Bus Schedule & Transit Intelligence Drawer Modal */}
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4">
            <div className="w-full max-w-[430px] bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span>Bus Schedule & Transit Intelligence</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {(scheduleModalRecommendation || recommendation) && (
                  <ResultsCard
                    recommendation={(scheduleModalRecommendation || recommendation)!}
                    matchingBuses={journeyResult?.matchingBuses || []}
                    transferJourney={journeyResult?.transferJourney || null}
                    currentEtaMinutes={liveEtaMinutes}
                    currentDistanceRemainingKm={liveDistanceKm}
                    liveDistanceKm={liveDistanceKm}
                    busStatusText={busStatusText}
                    currentRoadName={currentRoadName}
                    simPhase={simPhase}
                    isRouteSaved={isCurrentRouteSaved}
                    onStartRoute={startTripNow}
                    onResetTrip={resetTrip}
                    isDarkMode={isDarkMode}
                    onToggleSaveRoute={() => {
                      const activeRec = scheduleModalRecommendation || recommendation;
                      if (!activeRec) return;
                      toggleSaveRoute(
                        currentStop.id,
                        activeRec.destinationStop.id,
                        currentStop.name,
                        activeRec.destinationStop.name,
                        activeRec.route.number
                      );
                    }}
                  />
                )}
                {journeyResult?.matchingBuses && journeyResult.matchingBuses.length > 0 && (
                  <ActiveFleetCard
                    matchingBuses={journeyResult.matchingBuses}
                    routeNumber={
                      recommendation
                        ? (recommendation.route?.number ?? 'Direct')
                        : journeyResult.transferJourney
                        ? `${journeyResult.transferJourney.leg1Route?.number ?? 'Leg 1'} + ${journeyResult.transferJourney.leg2Route?.number ?? 'Leg 2'}`
                        : journeyResult.primaryBus?.route?.number || 'Active'
                    }
                    transferJourney={journeyResult.transferJourney}
                  />
                )}
                <TransitIntelligenceSection
                  currentStop={currentStop}
                  routeNumber={recommendation?.route?.number}
                  liveFleet={liveFleet}
                  wbtcFleet={wbtcFleet}
                  fleetLoading={fleetLoading}
                  onRefreshFleet={refetchFleet}
                  searchSummary={searchSummary}
                  searchSources={searchSources}
                  searchLoading={searchLoading}
                  onRefreshSearch={refetchSearch}
                  mapsSummary={mapsSummary}
                  mapsPlaces={mapsPlaces}
                  mapsLoading={mapsLoading}
                  onRefreshMaps={refetchMaps}
                  communityAlerts={communityAlerts}
                  onPostAlert={postAlert}
                  isSignedIn={!!currentUser}
                  onSignIn={signInWithGoogle}
                />
              </div>
            </div>
          </div>
        )}

        {/* Boarding Detail Modal: triggered when commuter taps "BOARD" */}
        <BoardingDetailModal
          isOpen={!!boardingModalData}
          onClose={() => setBoardingModalData(null)}
          data={boardingModalData}
          onConfirmBoarding={handleConfirmBoarding}
        />

        {/* Ride Feedback Modal on Arrival */}
        <RideFeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          onSubmit={handleFeedbackSubmit}
          tripInfo={
            activeBoardedTrip
              ? {
                  routeNumber: activeBoardedTrip.routeNumber,
                  originName: activeBoardedTrip.originStopName,
                  destinationName: activeBoardedTrip.destinationStopName,
                }
              : null
          }
        />

        {/* Full-screen QR Scan Loading Screen */}
        {isQrLoading && (
          <QrLoadingScreen
            stopName={currentStop.name}
            onLoaded={handleQrLoadingComplete}
          />
        )}

        {/* Startup Splash Video Screen (Highest z-index, fades out when video ends + data ready) */}
        <SplashScreen isDataReady={!isTransitLoading} />

        {/* Stop Order Audit & Guided Fix Modal */}
        <RouteOrderAuditModal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
          auditResults={auditResults}
          stops={allStops}
          onRouteReordered={async (routeId, newStopIds) => {
            console.log(`[Route Reorder Applied] Route ${routeId} reordered in Supabase. Refreshing transit data...`);
            // Optimistically update in-memory audit results
            setAuditResults((prev) => prev.filter((r) => r.routeId !== routeId));
            // Re-fetch routes and sync local state with Supabase
            if (refreshTransitData) {
              await refreshTransitData();
            }
          }}
        />

        {/* Transit Time & Loop Telemetry Debug Modal */}
        <TransitTimeDebugModal
          isOpen={isTimeDebugModalOpen}
          onClose={() => setIsTimeDebugModalOpen(false)}
          currentStop={currentStop}
          destinationStop={destinationStop}
          activeBus={primaryBus || fleet[0] || null}
          fleet={fleet}
          trips={supabaseTrips}
          routes={allRoutes}
        />
      </main>
    </div>
  );
}

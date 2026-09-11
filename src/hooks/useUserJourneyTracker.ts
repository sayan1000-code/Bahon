import { useState, useEffect, useRef, useCallback } from 'react';
import { Stop, SimulationPhase, UserLocationPing, UserJourneyState } from '../types';
import { User } from 'firebase/auth';

interface UseUserJourneyTrackerParams {
  currentUser: User | null;
  destinationId: string | null;
  currentStop: Stop;
  busPosition: [number, number] | null;
  simPhase: SimulationPhase;
}

// Equirectangular distance in meters
function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = (lat2 - lat1) * 111139;
  const dLng = (lng2 - lng1) * 111139 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  return Math.hypot(dLat, dLng);
}

const SESSION_STORAGE_KEY = 'smart_transit_session_user_pings';

// Session-only storage helper (Requirement 5: purely session-only, not persisted permanently)
function appendSessionPing(ping: UserLocationPing) {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const existing: UserLocationPing[] = raw ? JSON.parse(raw) : [];
    // Keep last 60 pings to prevent memory bloating while providing sufficient session trail
    const updated = [...existing.slice(-59), ping];
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Gracefully ignore session storage errors in private browsing
  }
}

export function useUserJourneyTracker({
  currentUser,
  destinationId,
  currentStop,
  busPosition,
  simPhase,
}: UseUserJourneyTrackerParams) {
  const isSignedIn = !!currentUser;
  const hasDestination = !!destinationId && destinationId !== currentStop.id;
  const isActive = isSignedIn && hasDestination;

  const [userLocation, setUserLocation] = useState<UserLocationPing | null>(null);
  const [distanceToStopMeters, setDistanceToStopMeters] = useState<number>(0);
  const [walkTimeMinutes, setWalkTimeMinutes] = useState<number>(0);
  const [hasBoarded, setHasBoarded] = useState<boolean>(false);
  const [boardedAt, setBoardedAt] = useState<number | null>(null);
  const [elapsedTravelTimeSeconds, setElapsedTravelTimeSeconds] = useState<number>(0);
  const [gpsStatus, setGpsStatus] = useState<UserJourneyState['gpsStatus']>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  const watchIdRef = useRef<number | null>(null);
  const lastPingTimeRef = useRef<number>(0);
  const simulatedOffsetRef = useRef<{ dLat: number; dLng: number }>({
    dLat: 0.0022, // ~240m away walking distance
    dLng: 0.0018,
  });

  // Clear session storage on sign out or when tracking is inactive
  useEffect(() => {
    if (!isSignedIn) {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // silent
      }
      setHasBoarded(false);
      setBoardedAt(null);
      setElapsedTravelTimeSeconds(0);
      setUserLocation(null);
      setGpsStatus('idle');
      setIsSimulated(false);
    }
  }, [isSignedIn]);

  // Reset boarding if user changes current stop or destination
  useEffect(() => {
    setHasBoarded(false);
    setBoardedAt(null);
    setElapsedTravelTimeSeconds(0);
  }, [currentStop.id, destinationId]);

  // Handle GPS location updates
  const handleLocationUpdate = useCallback(
    (lat: number, lng: number, accuracy = 15) => {
      const now = Date.now();
      const ping: UserLocationPing = { lat, lng, timestamp: now, accuracy };
      setUserLocation(ping);

      // Store in session-only storage (throttled to every 3s)
      if (now - lastPingTimeRef.current >= 3000) {
        lastPingTimeRef.current = now;
        appendSessionPing(ping);
      }

      // Calculate real-time distance to current bus stop
      const distMeters = calculateDistanceMeters(lat, lng, currentStop.lat, currentStop.lng);
      setDistanceToStopMeters(Math.round(distMeters));

      // Calculate live-updating walk time estimate at ~5 km/h (83.33 meters/min)
      // Standard walking speed = 5,000 m / 60 min
      const walkMins = distMeters / (5000 / 60);
      setWalkTimeMinutes(Math.max(0.2, Math.round(walkMins * 10) / 10));

      // Boarding detection:
      // Once they board (detect this as: user's GPS location becomes close to and moves along with the bus's simulated position)
      if (!hasBoarded && busPosition) {
        const distToBusMeters = calculateDistanceMeters(lat, lng, busPosition[0], busPosition[1]);
        const isNearStop = distMeters <= 55;
        const isNearBus = distToBusMeters <= 65;

        if (
          (isNearBus && (simPhase === 'boarding' || simPhase === 'in_transit')) ||
          (isNearStop && simPhase === 'boarding')
        ) {
          setHasBoarded(true);
          setBoardedAt(now);
        }
      }
    },
    [currentStop.lat, currentStop.lng, busPosition, simPhase, hasBoarded]
  );

  // Real Geolocation watcher
  useEffect(() => {
    if (!isActive || isSimulated) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsStatus('unavailable');
      setGpsError('Geolocation is not supported by your browser');
      return;
    }

    setGpsStatus('prompt');

    const successHandler: PositionCallback = (position) => {
      setGpsStatus('active');
      setGpsError(null);
      const { latitude, longitude, accuracy } = position.coords;

      // Check if real GPS is exceedingly far from Kolkata (e.g. > 150 km away)
      const distFromKolkata = calculateDistanceMeters(latitude, longitude, currentStop.lat, currentStop.lng);
      if (distFromKolkata > 150000) {
        // Commuter is in a different city or testing from afar
        // Automatically default to simulated walk test near stop to make the experience immediately demonstrable
        setIsSimulated(true);
        setGpsStatus('simulated');
        return;
      }

      handleLocationUpdate(latitude, longitude, accuracy);
    };

    const errorHandler: PositionErrorCallback = (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        setGpsStatus('denied');
        setGpsError('Location permission was denied. Switched to simulated walk mode.');
        // Enable simulation so user can still test the feature
        setIsSimulated(true);
      } else {
        setGpsStatus('unavailable');
        setGpsError(err.message || 'Unable to retrieve location');
      }
    };

    const id = navigator.geolocation.watchPosition(successHandler, errorHandler, {
      enableHighAccuracy: true,
      maximumAge: 4000,
      timeout: 10000,
    });

    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isActive, isSimulated, currentStop.lat, currentStop.lng, handleLocationUpdate]);

  // Simulation loop for testing when user enables simulated GPS or is outside Kolkata
  useEffect(() => {
    if (!isActive || !isSimulated) return;

    setGpsStatus('simulated');
    setGpsError(null);

    const interval = setInterval(() => {
      if (hasBoarded && busPosition) {
        // User moves with the bus
        handleLocationUpdate(busPosition[0], busPosition[1], 5);
      } else {
        // User is walking towards current stop at ~5 km/h (~1.4 m/s)
        const currentLat = currentStop.lat + simulatedOffsetRef.current.dLat;
        const currentLng = currentStop.lng + simulatedOffsetRef.current.dLng;

        // Progressively step closer to the stop
        simulatedOffsetRef.current.dLat *= 0.985;
        simulatedOffsetRef.current.dLng *= 0.985;

        handleLocationUpdate(currentLat, currentLng, 10);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isSimulated, hasBoarded, busPosition, currentStop.lat, currentStop.lng, handleLocationUpdate]);

  // Live second-by-second ticker for elapsed travel time once boarded
  useEffect(() => {
    if (!hasBoarded || !boardedAt) {
      setElapsedTravelTimeSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      if (simPhase !== 'arrived_dest') {
        const seconds = Math.floor((Date.now() - boardedAt) / 1000);
        setElapsedTravelTimeSeconds(seconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hasBoarded, boardedAt, simPhase]);

  // Manual actions for convenience and demo testing
  const toggleSimulatedGps = useCallback(() => {
    setIsSimulated((prev) => {
      const next = !prev;
      if (next) {
        // Reset simulated offset to ~280m away from stop
        simulatedOffsetRef.current = { dLat: 0.0022, dLng: 0.0018 };
        setGpsStatus('simulated');
      } else {
        setGpsStatus('prompt');
      }
      return next;
    });
  }, []);

  const triggerBoarding = useCallback(() => {
    setHasBoarded(true);
    setBoardedAt(Date.now());
  }, []);

  const resetJourney = useCallback(() => {
    setHasBoarded(false);
    setBoardedAt(null);
    setElapsedTravelTimeSeconds(0);
    simulatedOffsetRef.current = { dLat: 0.0022, dLng: 0.0018 };
  }, []);

  return {
    isActive,
    userLocation,
    distanceToStopMeters,
    walkTimeMinutes,
    hasBoarded,
    boardedAt,
    elapsedTravelTimeSeconds,
    isNearStop: distanceToStopMeters <= 60,
    gpsStatus,
    gpsError,
    isSimulated,
    toggleSimulatedGps,
    triggerBoarding,
    resetJourney,
  };
}

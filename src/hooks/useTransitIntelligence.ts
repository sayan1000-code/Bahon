import { useState, useEffect, useCallback } from 'react';
import { WbtcBus, RouteGeometryResponse } from '../types';

export interface LiveBusFleetItem {
  id: string;
  routeNumber: string;
  routeName: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  nextStop: string;
  etaMinutes: number;
  crowdStatus: string;
  fleetStatus: string;
  lastPing: string;
}

export interface SearchGroundingSource {
  title: string;
  uri: string;
}

export interface MapsGroundingPlace {
  title: string;
  uri: string;
}

const clientSearchCache = new Map<string, { summary: string; sources: SearchGroundingSource[] }>();
const clientMapsCache = new Map<string, { summary: string; places: MapsGroundingPlace[] }>();

export function useTransitIntelligence(currentStopName?: string, lat?: number, lng?: number, routeNumber?: string) {
  const [liveFleet, setLiveFleet] = useState<LiveBusFleetItem[]>([]);
  const [wbtcFleet, setWbtcFleet] = useState<WbtcBus[]>([]);
  const [fleetLoading, setFleetLoading] = useState<boolean>(true);
  const [wbtcLoading, setWbtcLoading] = useState<boolean>(true);

  // Search Grounding state
  const [searchSummary, setSearchSummary] = useState<string>('');
  const [searchSources, setSearchSources] = useState<SearchGroundingSource[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  // Maps Grounding state
  const [mapsSummary, setMapsSummary] = useState<string>('');
  const [mapsPlaces, setMapsPlaces] = useState<MapsGroundingPlace[]>([]);
  const [mapsLoading, setMapsLoading] = useState<boolean>(false);

  // 1. Fetch WBTC Real-Time Automated Vehicle Location (AVL) GPS Telemetry
  const fetchWbtcFleet = useCallback(async () => {
    try {
      const res = await fetch('/api/transit/wbtc-live');
      if (res.ok) {
        const data = await res.json();
        if (data.buses) {
          setWbtcFleet(data.buses);
        }
      }
    } catch {
      // Gracefully silent fallback
    } finally {
      setWbtcLoading(false);
    }
  }, []);

  // 2. Fetch Live Fleet Telemetry from legacy server API
  const fetchLiveFleet = useCallback(async () => {
    try {
      const res = await fetch('/api/transit/live-feed');
      if (res.ok) {
        const data = await res.json();
        if (data.buses) {
          setLiveFleet(data.buses);
        }
      }
    } catch {
      // Gracefully silent fallback
    } finally {
      setFleetLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWbtcFleet();
    fetchLiveFleet();
    const interval = setInterval(() => {
      fetchWbtcFleet();
      fetchLiveFleet();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchWbtcFleet, fetchLiveFleet]);

  // 3. Fetch Realistic Road Geometry from Google Maps Routes API / WBTC Road Network
  const fetchRealisticRoute = useCallback(
    async (
      originLat: number,
      originLng: number,
      destLat: number,
      destLng: number,
      currentStopId: string,
      destStopId: string
    ): Promise<RouteGeometryResponse | null> => {
      try {
        const res = await fetch('/api/transit/realistic-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originLat,
            originLng,
            destLat,
            destLng,
            currentStopId,
            destStopId,
          }),
        });
        if (res.ok) {
          const data: RouteGeometryResponse = await res.json();
          return data;
        }
      } catch (err) {
        console.warn('Failed to fetch realistic road route from server:', err);
      }
      return null;
    },
    []
  );

  // 4. Fetch Google Search Grounding for current corridor
  const fetchSearchInsights = useCallback(async (force = false) => {
    if (!currentStopName) return;
    const cacheKey = `${currentStopName.toLowerCase()}-${(routeNumber || 'transit').toLowerCase()}`;
    if (!force && clientSearchCache.has(cacheKey)) {
      const cached = clientSearchCache.get(cacheKey)!;
      setSearchSummary(cached.summary);
      setSearchSources(cached.sources);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch('/api/transit/search-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stopName: currentStopName,
          routeNumber: routeNumber || 'transit',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const summary = data.summary || '';
        const sources = data.sources || [];
        setSearchSummary(summary);
        setSearchSources(sources);
        clientSearchCache.set(cacheKey, { summary, sources });
      }
    } catch {
      // Gracefully silent fallback
    } finally {
      setSearchLoading(false);
    }
  }, [currentStopName, routeNumber]);

  // 5. Fetch Google Maps Grounding for stop amenities & entrances
  const fetchMapsGrounding = useCallback(async (force = false) => {
    if (!currentStopName) return;
    const cacheKey = `${currentStopName.toLowerCase()}-${(lat || 0).toFixed(3)}-${(lng || 0).toFixed(3)}`;
    if (!force && clientMapsCache.has(cacheKey)) {
      const cached = clientMapsCache.get(cacheKey)!;
      setMapsSummary(cached.summary);
      setMapsPlaces(cached.places);
      return;
    }

    setMapsLoading(true);
    try {
      const res = await fetch('/api/transit/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stopName: currentStopName,
          lat: lat || 22.5855,
          lng: lng || 88.345,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const summary = data.summary || '';
        const places = data.places || [];
        setMapsSummary(summary);
        setMapsPlaces(places);
        clientMapsCache.set(cacheKey, { summary, places });
      }
    } catch {
      // Gracefully silent fallback
    } finally {
      setMapsLoading(false);
    }
  }, [currentStopName, lat, lng]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSearchInsights();
      fetchMapsGrounding();
    }, 600);
    return () => clearTimeout(timer);
  }, [fetchSearchInsights, fetchMapsGrounding]);

  return {
    liveFleet,
    wbtcFleet,
    fleetLoading,
    wbtcLoading,
    refetchFleet: fetchLiveFleet,
    refetchWbtc: fetchWbtcFleet,
    fetchRealisticRoute,
    searchSummary,
    searchSources,
    searchLoading,
    refetchSearch: fetchSearchInsights,
    mapsSummary,
    mapsPlaces,
    mapsLoading,
    refetchMaps: fetchMapsGrounding,
  };
}


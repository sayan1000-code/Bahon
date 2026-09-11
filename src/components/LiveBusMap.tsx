import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import {
  Maximize2,
  Minimize2,
  LocateFixed,
  Zap,
  Play,
  Pause,
  Radio,
  Layers,
  Compass,
  Bus as BusIcon,
  Info,
  Plus,
  Minus,
  ArrowRightLeft,
  X,
  Route,
  Navigation,
  RotateCw,
  Crosshair,
} from 'lucide-react';
import { Stop, PersistentBus, PersistentRoute, JourneyQueryResult, SimulationPhase, WbtcBus } from '../types';
import { PERSISTENT_ROUTES, computeDistanceMeters } from '../data/persistentFleet';
import {
  getRouteRoadGeometry,
  sliceRouteRoadGeometry,
  clearStaleRouteGeometryCache,
} from '../services/osrmRouteService';

function isValidCoordinate(lat: any, lng: any): boolean {
  return lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng));
}

function sanitizePolyline(path?: [number, number][]): [number, number][] {
  if (!Array.isArray(path)) return [];
  return path
    .filter((p) => Array.isArray(p) && p.length >= 2 && isValidCoordinate(p[0], p[1]))
    .map((p) => [Number(p[0]), Number(p[1])]);
}

interface LiveBusMapProps {
  fleet: PersistentBus[];
  fleetRef?: React.MutableRefObject<PersistentBus[]>;
  routes?: PersistentRoute[];
  journeyResult: JourneyQueryResult | null;
  currentStop: Stop;
  destinationStop: Stop | null;
  matchingBusIds: string[];
  wbtcFleet?: WbtcBus[];
  userLocation?: { lat: number; lng: number } | null;
  hasBoarded?: boolean;
  simSpeed?: number;
  onSetSimSpeed?: (speed: number) => void;
  isPaused?: boolean;
  onTogglePause?: () => void;
  isDarkMode?: boolean;
  onTelemetryUpdate?: (
    etaMinutes: number,
    distanceRemainingKm: number,
    statusText: string,
    phase: SimulationPhase,
    busPos?: [number, number]
  ) => void;
  onRefreshTelemetry?: () => void;
  mapSizeProp?: 'standard' | 'tall' | 'fullscreen';
  onToggleFullscreen?: () => void;
  onBoardBus?: (bus: PersistentBus) => void;
}

export const LiveBusMap: React.FC<LiveBusMapProps> = React.memo(({
  fleet,
  fleetRef,
  routes,
  journeyResult,
  currentStop,
  destinationStop,
  matchingBusIds,
  wbtcFleet = [],
  userLocation,
  hasBoarded = false,
  simSpeed = 1,
  onSetSimSpeed,
  isPaused = false,
  onTogglePause,
  isDarkMode = false,
  onTelemetryUpdate,
  onRefreshTelemetry,
  mapSizeProp = 'standard',
  onToggleFullscreen,
  onBoardBus,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Markers & Layers refs
  const currentStopMarkerRef = useRef<L.Marker | null>(null);
  const destStopMarkerRef = useRef<L.Marker | null>(null);
  const transferStopMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userWalkLineRef = useRef<L.Polyline | null>(null);
  const journeyLineCasingRef = useRef<L.Polyline | null>(null);
  const journeyLineRef = useRef<L.Polyline | null>(null);
  const leg2LineCasingRef = useRef<L.Polyline | null>(null);
  const leg2LineRef = useRef<L.Polyline | null>(null);
  const approachLineRef = useRef<L.Polyline | null>(null);
  const approachLinesMapRef = useRef<Map<string, L.Polyline>>(new Map());
  const wbtcMarkersLayerRef = useRef<L.LayerGroup | null>(null);

  // Persistent fleet marker registry: busId -> L.Marker
  const fleetMarkersMapRef = useRef<Map<string, L.Marker>>(new Map());
  const markerPropsCacheRef = useRef<Map<string, { bearing: number; isPrimary: boolean; isMatching: boolean; isDriverMode: boolean; rankIdx: number; isBoarded: boolean }>>(new Map());

  // Synchronized refs for uninterrupted 60fps RAF gliding
  const journeyResultRef = useRef(journeyResult);
  journeyResultRef.current = journeyResult;
  const destinationStopRef = useRef(destinationStop);
  destinationStopRef.current = destinationStop;
  const routesRef = useRef(routes);
  routesRef.current = routes;
  const matchingBusIdsRef = useRef(matchingBusIds);
  matchingBusIdsRef.current = matchingBusIds;
  const currentStopRef = useRef(currentStop);
  currentStopRef.current = currentStop;
  const hasBoardedRef = useRef(hasBoarded);
  hasBoardedRef.current = hasBoarded;
  const onTelemetryUpdateRef = useRef(onTelemetryUpdate);
  onTelemetryUpdateRef.current = onTelemetryUpdate;
  const fleetPropRef = useRef(fleet);
  fleetPropRef.current = fleet;

  // UI state
  const [showWbtcFleet, setShowWbtcFleet] = useState<boolean>(false);
  const [currentRoadName, setCurrentRoadName] = useState<string>('Strand Road / Rabindra Setu');
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(13);
  const [mapSize, setMapSize] = useState<'standard' | 'tall' | 'fullscreen'>(mapSizeProp || 'standard');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    if (mapSizeProp) {
      setMapSize(mapSizeProp);
    }
  }, [mapSizeProp]);
  const [visibleBusCount, setVisibleBusCount] = useState<number>(3);
  const [viewMode, setViewMode] = useState<'overview' | 'driver'>('overview');
  const viewModeRef = useRef<'overview' | 'driver'>('overview');
  const isUserInteractingWithMapRef = useRef<boolean>(false);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const animFrameIdRef = useRef<number | null>(null);
  const lastTelemetrySentTimeRef = useRef<number>(0);
  const lastFittedRouteKeyRef = useRef<string>('');
  const lastRenderedPolylineKeyRef = useRef<string>('');

  // Helper to build HTML icon for a persistent bus with vivid moving vehicle animation
  // isBoarded=true means the commuter is currently riding this bus → purple marker
  const createBusMarkerHtml = useCallback(
    (
      bus: PersistentBus,
      isMatching: boolean,
      isPrimary: boolean,
      rankIndex: number = 0,
      isDriverMode: boolean = false,
      isBoarded: boolean = false
    ): string => {
      const isElectric = bus.type === 'Electric';
      const isAc = bus.type === 'AC Express';

      // Simple bus pointer styling (box with bus number + directional pointer)
      let boxBg = '#1E293B'; // Slate 800
      let boxText = '#F8FAFC';
      let boxBorder = '#475569';
      let pointerColor = '#334155';

      if (isBoarded && isPrimary) {
        // Commuter is ON this bus → vivid purple/violet
        boxBg = '#7C3AED'; // Violet 600
        boxText = '#FFFFFF';
        boxBorder = '#6D28D9'; // Violet 700
        pointerColor = '#6D28D9';
      } else if (isPrimary) {
        boxBg = '#F59E0B'; // Amber 500 — "Next Bus"
        boxText = '#0F172A'; // Slate 900
        boxBorder = '#D97706'; // Amber 600
        pointerColor = '#D97706';
      } else if (isMatching) {
        boxBg = '#2563EB'; // Blue 600
        boxText = '#FFFFFF';
        boxBorder = '#1D4ED8';
        pointerColor = '#1D4ED8';
      } else if (isElectric) {
        boxBg = '#047857'; // Emerald 700
        boxText = '#FFFFFF';
        boxBorder = '#059669';
        pointerColor = '#059669';
      } else if (isAc) {
        boxBg = '#0284C7'; // Sky 600
        boxText = '#FFFFFF';
        boxBorder = '#0369A1';
        pointerColor = '#0369A1';
      }

      let badgeLabel = `${bus.speedKmh} km/h`;
      if (isBoarded && isPrimary) {
        badgeLabel = 'ON BOARD';
      } else if (isPrimary) {
        badgeLabel = isDriverMode ? `FOCUS • ${bus.speedKmh} km/h` : 'NEXT BUS';
      } else if (rankIndex === 1) {
        badgeLabel = `#2 Following`;
      } else if (rankIndex === 2) {
        badgeLabel = `#3 En Route`;
      } else if (rankIndex === 3) {
        badgeLabel = `#4 En Route`;
      }

      const badgeColor = (isBoarded && isPrimary)
        ? 'bg-violet-500 text-white font-black ring-1 ring-violet-400 shadow-sm'
        : isPrimary
        ? isDriverMode
          ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-500 shadow-md'
          : 'bg-amber-400 text-slate-950 font-black ring-1 ring-amber-500 shadow-sm'
        : isMatching
        ? 'bg-blue-700 text-white font-bold shadow-xs'
        : 'bg-slate-900/90 text-white font-medium';

      const bearingRounded = Math.round(bus.bearing);

      return `
        <div class="relative flex flex-col items-center justify-center cursor-pointer select-none group" style="width: 44px; height: 44px;">
          <!-- Boarded bus purple pulse / Primary bus amber ping -->
          ${
            isBoarded && isPrimary
              ? `<span class="absolute w-12 h-12 rounded-full bg-violet-500/35 animate-ping pointer-events-none"></span>`
              : isPrimary && isDriverMode
              ? `<span class="absolute w-14 h-14 rounded-full bg-amber-400/35 animate-ping pointer-events-none"></span>`
              : isPrimary
              ? `<span class="absolute w-12 h-12 rounded-full bg-amber-400/30 animate-ping pointer-events-none"></span>`
              : ''
          }

          <!-- Directional Pointer Arrow (Hardware-accelerated heading rotation) -->
          <div class="moving-bus-marker absolute inset-0 flex items-center justify-center pointer-events-none" style="transform: rotate(${bearingRounded}deg); transform-origin: 50% 50%; will-change: transform;">
            <div style="transform: translateY(-18px); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 7px solid ${pointerColor};"></div>
          </div>

          <!-- Simple Bus Box with Bus Number -->
          <div style="background-color: ${boxBg}; color: ${boxText}; border: 2px solid ${boxBorder};" class="relative z-10 px-2 py-0.5 rounded-md shadow-md font-sans font-black text-[11.5px] leading-tight flex items-center justify-center whitespace-nowrap min-w-[30px] text-center select-none group-hover:scale-110 transition-transform">
            ${bus.routeNumber}
          </div>

          <!-- Compact Speed / Sequence Tag -->
          <div class="relative z-10 -mt-0.5 whitespace-nowrap ${badgeColor} text-[8px] px-1.5 py-0.2 rounded-full font-bold shadow-xs pointer-events-none">
            ${badgeLabel}
          </div>
        </div>
      `;
    },
    []
  );

  // Initialize Map with zoom control and touch gestures fully enabled
  useEffect(() => {
    clearStaleRouteGeometryCache();
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false, // Managed via floating zoom dock to prevent collision with top badges
        attributionControl: false,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        boxZoom: true,
        dragging: true,
        keyboard: true,
      });

      const osmTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      const baseTileLayer = L.tileLayer(osmTileUrl, {
        subdomains: 'abc',
        maxZoom: 19,
        opacity: 0.85,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);
      tileLayerRef.current = baseTileLayer;

      wbtcMarkersLayerRef.current = L.layerGroup().addTo(map);

      map.on('zoomend', () => {
        setCurrentZoom(map.getZoom());
      });

      map.on('dragstart', () => {
        isUserInteractingWithMapRef.current = true;
        if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
      });

      map.on('dragend', () => {
        if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
        interactionTimeoutRef.current = setTimeout(() => {
          isUserInteractingWithMapRef.current = false;
        }, 3000);
      });

      mapInstanceRef.current = map;
      map.setView([22.5697, 88.3697], 13);
    }

    const map = mapInstanceRef.current;
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    };
  }, []);

  // Update tile layer with genuine free OpenStreetMap tiles (no API key required)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
      tileLayerRef.current = null;
    }

    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      subdomains: 'abc',
      maxZoom: 19,
      opacity: 0.85,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    tileLayerRef.current = tileLayer;
  }, [isDarkMode]);

  // Synchronize viewMode ref for 60fps animation loop
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // Invalidate map size whenever mapSize changes (Standard, Tall, Fullscreen)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const t1 = setTimeout(() => map.invalidateSize(), 60);
    const t2 = setTimeout(() => map.invalidateSize(), 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mapSize]);

  // Zoom handlers (explicit step zoom)
  const handleZoomIn = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const map = mapInstanceRef.current;
    if (map) {
      map.zoomIn(1);
    }
  }, []);

  const handleZoomOut = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const map = mapInstanceRef.current;
    if (map) {
      map.zoomOut(1);
    }
  }, []);

  // Map Size toggle
  const toggleMapSize = useCallback(() => {
    setMapSize((prev) => {
      if (prev === 'standard') return 'tall';
      if (prev === 'tall') return 'fullscreen';
      return 'standard';
    });
  }, []);

  // Fit bounds helper
  const handleFitBounds = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points: [number, number][] = [];
    if (isValidCoordinate(currentStop?.lat, currentStop?.lng)) points.push([Number(currentStop.lat), Number(currentStop.lng)]);
    if (destinationStop && isValidCoordinate(destinationStop.lat, destinationStop.lng)) points.push([Number(destinationStop.lat), Number(destinationStop.lng)]);
    if (journeyResult?.transferJourney?.transferStop && isValidCoordinate(journeyResult.transferJourney.transferStop.lat, journeyResult.transferJourney.transferStop.lng)) {
      const ts = journeyResult.transferJourney.transferStop;
      points.push([Number(ts.lat), Number(ts.lng)]);
    }
    if (journeyResult?.primaryBus && isValidCoordinate(journeyResult.primaryBus.bus?.currentPos?.[0], journeyResult.primaryBus.bus?.currentPos?.[1])) {
      points.push(journeyResult.primaryBus.bus.currentPos);
    }
    if (journeyResult?.transferJourney?.leg2Bus && isValidCoordinate(journeyResult.transferJourney.leg2Bus.bus?.currentPos?.[0], journeyResult.transferJourney.leg2Bus.bus?.currentPos?.[1])) {
      points.push(journeyResult.transferJourney.leg2Bus.bus.currentPos);
    }

    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [currentStop, destinationStop, journeyResult]);

  // View Mode Handler: Toggle between 'Route Overview' (all buses on route) and 'Driver Mode' (focused on the approaching bus)
  const handleSetViewMode = useCallback(
    (mode: 'overview' | 'driver') => {
      setViewMode(mode);
      viewModeRef.current = mode;
      isUserInteractingWithMapRef.current = false;
      const map = mapInstanceRef.current;
      if (!map) return;

      if (mode === 'driver') {
        const activeFleet = fleetRef?.current || fleet;
        const targetBus =
          journeyResult?.primaryBus?.bus ||
          activeFleet.find((b) => b.routeId === (journeyResult?.primaryBus?.route?.id || journeyResult?.transferJourney?.leg1Route?.id || 'route_24b')) ||
          activeFleet[0];
        if (targetBus) {
          map.setView(targetBus.currentPos, 16, { animate: true });
        }
      } else {
        handleFitBounds();
      }
    },
    [journeyResult, fleet, fleetRef, handleFitBounds]
  );

  const toggleViewMode = useCallback(() => {
    handleSetViewMode(viewMode === 'overview' ? 'driver' : 'overview');
  }, [viewMode, handleSetViewMode]);

  // Fit entire Kolkata transit network bounds (covering all 25 stops from Barasat to Ruby)
  const handleFitNetwork = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    // Kolkata network bounds: from Barasat (22.722, 88.48) down to Ruby (22.515, 88.395) and Howrah (22.585, 88.342)
    const networkBounds = L.latLngBounds([
      [22.725, 88.34], // Northwest
      [22.51, 88.485], // Southeast
    ]);
    map.fitBounds(networkBounds, { padding: [30, 30] });
  }, []);

  // Handle Start, Destination, and Transfer Stop markers & Journey Polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Departure Stop Marker
    if (currentStopMarkerRef.current) {
      currentStopMarkerRef.current.remove();
    }
    const stopLabel = currentStop.name.includes('Bay')
      ? currentStop.name
      : currentStop.id === 'howrah'
      ? 'Howrah Station (Bay 4)'
      : currentStop.name;

    const currentStopHtml = `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none">
        <div class="w-7 h-7 rounded-full bg-blue-600 border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] flex items-center justify-center text-white">
          <div class="w-2.5 h-2.5 rounded-full bg-white"></div>
        </div>
        <div class="absolute -bottom-6 whitespace-nowrap bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-md tracking-tight">
          ${stopLabel}
        </div>
      </div>
    `;
    if (isValidCoordinate(currentStop.lat, currentStop.lng)) {
      currentStopMarkerRef.current = L.marker([Number(currentStop.lat), Number(currentStop.lng)], {
        icon: L.divIcon({
          className: 'current-stop-icon',
          html: currentStopHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
        zIndexOffset: 800,
      }).addTo(map);
    }

    // 2. Destination Stop Marker (if selected)
    if (destStopMarkerRef.current) {
      destStopMarkerRef.current.remove();
      destStopMarkerRef.current = null;
    }
    if (destinationStop && isValidCoordinate(destinationStop.lat, destinationStop.lng)) {
      const destStopHtml = `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
          <div class="w-9 h-9 rounded-2xl bg-emerald-600 border-3 border-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] flex items-center justify-center text-white font-black text-[11px]">
            DEST
          </div>
          <div class="absolute -bottom-6 whitespace-nowrap bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-black shadow-md">
            ${destinationStop.name}
          </div>
        </div>
      `;
      destStopMarkerRef.current = L.marker([Number(destinationStop.lat), Number(destinationStop.lng)], {
        icon: L.divIcon({
          className: 'dest-stop-icon',
          html: destStopHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
        zIndexOffset: 800,
      }).addTo(map);
    }

    // 3. Transfer Interchange Stop Marker (if 1-transfer journey)
    if (transferStopMarkerRef.current) {
      transferStopMarkerRef.current.remove();
      transferStopMarkerRef.current = null;
    }

    if (journeyResult?.transferJourney) {
      const ts = journeyResult.transferJourney.transferStop;
      if (isValidCoordinate(ts.lat, ts.lng)) {
        const leg2RouteNum = journeyResult.transferJourney.leg2Route.number;
        const transferHtml = `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
            <span class="absolute w-8 h-8 rounded-full bg-amber-500/40 animate-ping"></span>
            <div class="w-8 h-8 rounded-2xl bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center text-slate-950 font-black text-[10px]">
              ⇄
            </div>
            <div class="absolute -bottom-6 whitespace-nowrap bg-amber-950 text-amber-300 border border-amber-600 px-2 py-0.5 rounded-md text-[9px] font-black shadow-md">
              Transfer: ${ts.name} (Take ${leg2RouteNum})
            </div>
          </div>
        `;
        transferStopMarkerRef.current = L.marker([Number(ts.lat), Number(ts.lng)], {
          icon: L.divIcon({
            className: 'transfer-stop-icon',
            html: transferHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
          zIndexOffset: 850,
        }).addTo(map);
      }
    }

    // 4. Highlighted Route Polylines for Selected Journey
    // Only rebuild polylines if origin, destination, or journey route identity actually changes
    const polylineKey = `${currentStop.id}->${destinationStop?.id || 'none'}:${
      journeyResult?.transferJourney
        ? `${journeyResult.transferJourney.leg1Route.id}+${journeyResult.transferJourney.leg2Route.id}`
        : journeyResult?.primaryBus
        ? journeyResult.primaryBus.route.id
        : 'direct'
    }`;

    const isPolylineKeySame = lastRenderedPolylineKeyRef.current === polylineKey;

    if (!isPolylineKeySame) {
      lastRenderedPolylineKeyRef.current = polylineKey;

      if (journeyLineCasingRef.current) {
        journeyLineCasingRef.current.remove();
        journeyLineCasingRef.current = null;
      }
      if (journeyLineRef.current) {
        journeyLineRef.current.remove();
        journeyLineRef.current = null;
      }
      if (leg2LineCasingRef.current) {
        leg2LineCasingRef.current.remove();
        leg2LineCasingRef.current = null;
      }
      if (leg2LineRef.current) {
        leg2LineRef.current.remove();
        leg2LineRef.current = null;
      }

      const casingColor = '#ffffff';

    if (journeyResult?.transferJourney) {
      // Leg 1: Underneath white casing outline (9.5px) + bold blue line (6px)
      const leg1Base = journeyResult.transferJourney.leg1Bus.pathFromStartToDest;
      const leg1Path = sanitizePolyline(leg1Base);
      if (leg1Path.length >= 2) {
        journeyLineCasingRef.current = L.polyline(leg1Path, {
          color: casingColor,
          weight: 9.5,
          opacity: 0.95,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(map);

        journeyLineRef.current = L.polyline(leg1Path, {
          color: '#1d4ed8', // Bold vibrant blue
          weight: 6,
          opacity: 1.0,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(map);
      }

      // Leg 2: Underneath white casing outline (9.5px) + bold green dashed line (6px)
      const leg2Base = journeyResult.transferJourney.leg2Bus.pathFromStartToDest;
      const leg2Path = sanitizePolyline(leg2Base);
      if (leg2Path.length >= 2) {
        leg2LineCasingRef.current = L.polyline(leg2Path, {
          color: casingColor,
          weight: 9.5,
          opacity: 0.95,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(map);

        leg2LineRef.current = L.polyline(leg2Path, {
          color: '#16a34a', // Bold vibrant green
          weight: 6,
          opacity: 1.0,
          dashArray: '8, 6',
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(map);

        if (destinationStop && isValidCoordinate(destinationStop.lat, destinationStop.lng)) {
          const endPt = leg2Path[leg2Path.length - 1];
          const distToDest = computeDistanceMeters(endPt, [Number(destinationStop.lat), Number(destinationStop.lng)]);
          if (distToDest > 50) {
            console.warn(
              `[Polyline Slicing Alert] Leg 2 polyline end point is ${Math.round(distToDest)}m away from destination marker "${destinationStop.name}" (> 50m threshold)!`
            );
          }
        }
      }
    } else if (journeyResult?.primaryBus) {
      const rawCoords = journeyResult.primaryBus.pathFromStartToDest;
      const pathCoords = sanitizePolyline(rawCoords);

      if (pathCoords.length >= 2) {
        // Underneath white casing outline (9.5px) + bold solid polyline (6px)
        journeyLineCasingRef.current = L.polyline(pathCoords, {
          color: casingColor,
          weight: 9.5,
          opacity: 0.95,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(map);

        journeyLineRef.current = L.polyline(pathCoords, {
          color: '#1d4ed8', // Bold vibrant Google blue (6px)
          weight: 6,
          opacity: 1.0,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(map);

        if (destinationStop && isValidCoordinate(destinationStop.lat, destinationStop.lng)) {
          const endPt = pathCoords[pathCoords.length - 1];
          const distToDest = computeDistanceMeters(endPt, [Number(destinationStop.lat), Number(destinationStop.lng)]);
          if (distToDest > 50) {
            console.warn(
              `[Polyline Slicing Alert] Rendered polyline end point is ${Math.round(distToDest)}m away from destination marker "${destinationStop.name}" (> 50m threshold)!`
            );
          }
        }
      }
    } else if (destinationStop) {
      // Destination is selected but no active journeyResult match:
      // Search for any route connecting origin and destination, and render strictly the sliced segment
      const activeRoutes = routes && routes.length > 0 ? routes : PERSISTENT_ROUTES;
      const directRoute = activeRoutes.find((r) => {
        const stopsList = (r as any).stops || (r as any).stop_sequence || r.outboundStopIds || [];
        const inStops = r.inboundStopIds || [];
        const hasOrigin = stopsList.includes(currentStop.id) || inStops.includes(currentStop.id);
        const hasDest = stopsList.includes(destinationStop.id) || inStops.includes(destinationStop.id);
        return hasOrigin && hasDest;
      });

      if (directRoute) {
        const baseGeom: [number, number][] =
          (directRoute as any).road_geometry && (directRoute as any).road_geometry.length >= 2
            ? (directRoute as any).road_geometry
            : (getRouteRoadGeometry(directRoute.id) ||
               ((directRoute as any).number ? getRouteRoadGeometry((directRoute as any).number) : null) ||
               (directRoute.outboundPath && directRoute.outboundPath.length >= 2 ? directRoute.outboundPath : []));

        if ((directRoute as any).number === '7A' || directRoute.id === '7A') {
          console.log(
            `[LiveBusMap] Route 7A rendering with ${baseGeom.length} road coordinates (using Supabase road_geometry: ${Boolean((directRoute as any).road_geometry)})`
          );
        }

        const sliced = sliceRouteRoadGeometry(baseGeom, currentStop, destinationStop);
        const cleanPath = sanitizePolyline(sliced);

        if (cleanPath.length >= 2) {
          journeyLineCasingRef.current = L.polyline(cleanPath, {
            color: casingColor,
            weight: 8,
            opacity: 0.9,
            lineJoin: 'round',
            lineCap: 'round',
          }).addTo(map);

          journeyLineRef.current = L.polyline(cleanPath, {
            color: directRoute.color || '#2563eb',
            weight: 5,
            opacity: 0.95,
            lineJoin: 'round',
            lineCap: 'round',
          }).addTo(map);

          if (isValidCoordinate(destinationStop.lat, destinationStop.lng)) {
            const endPt = cleanPath[cleanPath.length - 1];
            const distToDest = computeDistanceMeters(endPt, [Number(destinationStop.lat), Number(destinationStop.lng)]);
            if (distToDest > 50) {
              console.warn(
                `[Polyline Slicing Alert] Direct fallback polyline end point is ${Math.round(distToDest)}m away from destination marker "${destinationStop.name}" (> 50m threshold)!`
              );
            }
          }
        }
      }
    } else {
      // When destinationStop is null (browsing / no destination selected),
      // render NO journey polyline at all (just the origin marker).
      if (journeyLineCasingRef.current) {
        journeyLineCasingRef.current.remove();
        journeyLineCasingRef.current = null;
      }
      if (journeyLineRef.current) {
        journeyLineRef.current.remove();
        journeyLineRef.current = null;
      }
    }
    }

    // Only auto-fit bounds when origin stop or destination stop actually changes (or on initial load)
    // Never auto-fit bounds on continuous 250ms journeyResult telemetry updates,
    // which allows the user to freely zoom in/out, pinch, and pan anywhere without rubber-banding!
    const routeKey = `${currentStop.id}->${destinationStop?.id || 'none'}`;
    if (lastFittedRouteKeyRef.current !== routeKey) {
      lastFittedRouteKeyRef.current = routeKey;
      if (viewModeRef.current === 'driver') {
        const pb = journeyResult?.primaryBus?.bus;
        if (pb) {
          map.setView(pb.currentPos, 16);
        } else {
          handleFitBounds();
        }
      } else {
        handleFitBounds();
      }
    }
  }, [currentStop, destinationStop, journeyResult, routes, handleFitBounds]);

  // User Commuter GPS Marker & Walking Dash Line
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // When boarded, hide the GPS dot entirely — the purple bus marker already
    // shows the commuter's position as "ON BOARD" on the bus.
    if (hasBoarded) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (userWalkLineRef.current) {
        userWalkLineRef.current.remove();
        userWalkLineRef.current = null;
      }
      return;
    }

    if (userLocation) {
      const userHtml = `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <span class="absolute w-8 h-8 rounded-full bg-blue-500/40 animate-ping"></span>
          <div class="w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
            <span class="w-2.5 h-2.5 rounded-full bg-white"></span>
          </div>
          <div class="absolute -bottom-5 whitespace-nowrap bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
            You (Walking)
          </div>
        </div>
      `;
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: userHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
          icon: userIcon,
          zIndexOffset: 950,
        }).addTo(map);
      } else {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        userMarkerRef.current.setIcon(userIcon);
      }

      // Walking dashed line to stop (not yet boarded)
      if (currentStop) {
        const walkPoints: [number, number][] = [
          [userLocation.lat, userLocation.lng],
          [currentStop.lat, currentStop.lng],
        ];
        if (!userWalkLineRef.current) {
          userWalkLineRef.current = L.polyline(walkPoints, {
            color: '#3B82F6',
            weight: 3,
            dashArray: '6, 6',
            opacity: 0.8,
          }).addTo(map);
        } else {
          userWalkLineRef.current.setLatLngs(walkPoints);
        }
      }
    } else {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (userWalkLineRef.current) {
        userWalkLineRef.current.remove();
        userWalkLineRef.current = null;
      }
    }
  }, [userLocation, hasBoarded, currentStop]);

  // Requirement 3 & 6: Smooth 60fps interpolation loop (Leaflet-MovingMarker physics)
  // Glides persistent buses smoothly along their real polylines
  // Strict filtering: Highlight only buses running on that route, and hide the rest!
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let isSubscribed = true;

    const tickMapMarkers = (now: number) => {
      if (!isSubscribed) return;

      const activeFleet = fleetRef?.current || fleetPropRef.current;
      const currentJourney = journeyResultRef.current;
      const currentMatching = matchingBusIdsRef.current;
      const currStop = currentStopRef.current;
      const currentOnTelemetry = onTelemetryUpdateRef.current;
      const currentHasBoarded = hasBoardedRef.current;
      const primaryBusId = currentJourney?.primaryBus?.bus.id || null;
      const isDriverMode = viewModeRef.current === 'driver';

      const currentDestStop = destinationStopRef.current;
      const isDestinationActive = Boolean(currentDestStop);

      // Determine allowed buses:
      // - When BOARDED: strictly show ONLY the single boarded bus (primaryBusId).
      // - When DESTINATION SELECTED: strictly show ONLY the bus(es) actually serving that
      //   origin->destination journey (never unrelated passing fleet like S-47, etc.).
      // - When NO DESTINATION (browsing origin): show up to 3-4 nearest passing buses.
      const allowedBusIds = new Set<string>();
      const busRankMap = new Map<string, number>();

      if (currentHasBoarded) {
        // Commuter is on board: strictly show ONLY the boarded bus
        if (primaryBusId) {
          allowedBusIds.add(primaryBusId);
          busRankMap.set(primaryBusId, 0);
        } else if (currentJourney?.primaryBus) {
          allowedBusIds.add(currentJourney.primaryBus.bus.id);
          busRankMap.set(currentJourney.primaryBus.bus.id, 0);
        } else if (currentMatching && currentMatching.length > 0) {
          allowedBusIds.add(currentMatching[0]);
          busRankMap.set(currentMatching[0], 0);
        }
      } else if (isDestinationActive) {
        // Destination is selected: strictly show ONLY the buses serving this journey!
        if (currentJourney?.transferJourney) {
          // Transfer journey: show up to 2 buses from Leg 1 and up to 1 bus from Leg 2
          const leg1RouteId = currentJourney.transferJourney.leg1Route.id;
          const leg1Buses = currentJourney.matchingBuses
            .filter((m) => m.route.id === leg1RouteId)
            .slice(0, 2);
          leg1Buses.forEach((m, idx) => {
            allowedBusIds.add(m.bus.id);
            busRankMap.set(m.bus.id, idx);
          });

          if (currentJourney.transferJourney.leg2Bus) {
            allowedBusIds.add(currentJourney.transferJourney.leg2Bus.bus.id);
            busRankMap.set(currentJourney.transferJourney.leg2Bus.bus.id, 2);
          }
        } else if (currentJourney?.matchingBuses && currentJourney.matchingBuses.length > 0) {
          // Direct matched route: get the specific route serving this journey
          const matchedRouteId = currentJourney.primaryBus?.route.id || currentJourney.matchingBuses[0].route.id;
          const routeMatchedBuses = currentJourney.matchingBuses.filter(
            (m) => m.route.id === matchedRouteId
          );

          if (currentJourney.primaryBus) {
            allowedBusIds.add(currentJourney.primaryBus.bus.id);
            busRankMap.set(currentJourney.primaryBus.bus.id, 0);
          }

          routeMatchedBuses.slice(0, 3).forEach((m, idx) => {
            if (!allowedBusIds.has(m.bus.id)) {
              allowedBusIds.add(m.bus.id);
              busRankMap.set(m.bus.id, idx + (allowedBusIds.has(currentJourney.primaryBus?.bus.id || '') ? 1 : 0));
            }
          });
        } else if (currentMatching && currentMatching.length > 0) {
          currentMatching.slice(0, 3).forEach((id, idx) => {
            allowedBusIds.add(id);
            busRankMap.set(id, idx);
          });
        }
        // NOTE: If destination is active, NEVER fall back to unrelated routes/fleet!
      } else {
        // Browsing mode (no destination selected): show nearest passing buses to currentStop
        const effectiveRoutes = routesRef.current && routesRef.current.length > 0 ? routesRef.current : PERSISTENT_ROUTES;
        const passingRouteIds = new Set<string>();
        effectiveRoutes
          .filter(
            (r) =>
              r.outboundStopIds.includes(currStop.id) ||
              r.inboundStopIds.includes(currStop.id)
          )
          .forEach((r) => {
            passingRouteIds.add(r.id);
            passingRouteIds.add(String(r.id));
            if (r.number) {
              passingRouteIds.add(r.number);
              passingRouteIds.add(r.number.toLowerCase());
            }
          });

        let candidates = activeFleet.filter(
          (b) =>
            passingRouteIds.has(b.routeId) ||
            passingRouteIds.has(String(b.routeId)) ||
            (b.routeNumber && passingRouteIds.has(b.routeNumber))
        );

        if (candidates.length === 0 && activeFleet.length > 0) {
          candidates = activeFleet.slice();
        }

        candidates.sort((a, b) => {
          const distA = computeDistanceMeters(a.currentPos, [currStop.lat, currStop.lng]);
          const distB = computeDistanceMeters(b.currentPos, [currStop.lat, currStop.lng]);
          return distA - distB;
        });
        candidates.slice(0, 4).forEach((b, idx) => {
          allowedBusIds.add(b.id);
          busRankMap.set(b.id, idx);
        });

        // Safety fallback only for browsing mode when no destination is chosen
        if (allowedBusIds.size === 0 && activeFleet.length > 0) {
          const sorted = activeFleet.slice().sort((a, b) => {
            const distA = computeDistanceMeters(a.currentPos, [currStop.lat, currStop.lng]);
            const distB = computeDistanceMeters(b.currentPos, [currStop.lat, currStop.lng]);
            return distA - distB;
          });
          sorted.slice(0, 4).forEach((b, idx) => {
            allowedBusIds.add(b.id);
            busRankMap.set(b.id, idx);
          });
        }
      }

      // Hide and remove markers for any bus not running on this route!
      fleetMarkersMapRef.current.forEach((marker, busId) => {
        if (!allowedBusIds.has(busId)) {
          marker.remove();
          fleetMarkersMapRef.current.delete(busId);
          markerPropsCacheRef.current.delete(busId);
        }
      });

      // Render & glide only the 3 to 4 allowed buses on this route
      for (let i = 0; i < activeFleet.length; i++) {
        const bus = activeFleet[i];
        if (!allowedBusIds.has(bus.id)) continue;

        const isMatching = currentMatching.includes(bus.id) || bus.id === primaryBusId;
        const isPrimary = bus.id === primaryBusId;
        const isBoarded = currentHasBoarded && isPrimary;
        const rankIdx = busRankMap.get(bus.id) ?? 0;

        let marker = fleetMarkersMapRef.current.get(bus.id);
        const cached = markerPropsCacheRef.current.get(bus.id);
        const bearingRounded = Math.round(bus.bearing);

        if (!marker) {
          // Create marker once for this persistent bus with distinct rotating bus icon
          const icon = L.divIcon({
            className: 'persistent-bus-marker',
            html: createBusMarkerHtml(bus, isMatching, isPrimary, rankIdx, isDriverMode, isBoarded),
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          });

          marker = L.marker(bus.currentPos, {
            icon,
            zIndexOffset: isBoarded ? 1000 : isPrimary ? 950 : isMatching ? 850 : 700,
          }).addTo(map);

          markerPropsCacheRef.current.set(bus.id, {
            bearing: bearingRounded,
            isPrimary,
            isMatching,
            isDriverMode,
            rankIdx,
            isBoarded,
          });

          marker.on('click', () => {
            setSelectedBusId(bus.id);
          });

          fleetMarkersMapRef.current.set(bus.id, marker);
        } else {
          // Hardware-accelerated 60fps glide along road polyline
          marker.setLatLng(bus.currentPos);

          // Fast direct heading rotation update on the .moving-bus-marker element
          const markerEl = marker.getElement();
          if (markerEl) {
            const movingBusEl = markerEl.querySelector('.moving-bus-marker') as HTMLElement | null;
            if (movingBusEl) {
              movingBusEl.style.transform = `rotate(${bearingRounded}deg)`;
            }
          }

          // Only rebuild HTML icon when visual state or rank changes (includes boarding state)
          const needIconUpdate =
            !cached ||
            cached.isPrimary !== isPrimary ||
            cached.isMatching !== isMatching ||
            cached.isDriverMode !== isDriverMode ||
            cached.rankIdx !== rankIdx ||
            cached.isBoarded !== isBoarded;

          if (needIconUpdate) {
            const icon = L.divIcon({
              className: 'persistent-bus-marker',
              html: createBusMarkerHtml(bus, isMatching, isPrimary, rankIdx, isDriverMode, isBoarded),
              iconSize: [44, 44],
              iconAnchor: [22, 22],
            });
            marker.setIcon(icon);
            marker.setZIndexOffset(isBoarded ? 1000 : isPrimary ? 950 : isMatching ? 850 : 700);

            markerPropsCacheRef.current.set(bus.id, {
              bearing: bearingRounded,
              isPrimary,
              isMatching,
              isDriverMode,
              rankIdx,
              isBoarded,
            });
          }
        }
      }

      // -------------------------------------------------------------
      // DOTTED GREEN APPROACH LINES
      // For every incoming bus heading toward user's origin stop,
      // draw a live dotted green line from bus.currentPos to currentStop
      // -------------------------------------------------------------
      const currentOriginCoords: [number, number] | null = isValidCoordinate(currStop.lat, currStop.lng)
        ? [Number(currStop.lat), Number(currStop.lng)]
        : null;

      const activeApproachBusIds = new Set<string>();

      if (currentOriginCoords && !currentHasBoarded) {
        for (let i = 0; i < activeFleet.length; i++) {
          const bus = activeFleet[i];
          if (!allowedBusIds.has(bus.id)) continue;

          // Check if this bus is approaching the origin stop
          const matchingInfo = currentJourney?.matchingBuses?.find((m) => m.bus.id === bus.id);
          const hasPassed = matchingInfo ? matchingInfo.hasPassedStartStop : false;

          const distMeters = computeDistanceMeters(bus.currentPos, currentOriginCoords);
          const isApproaching = !hasPassed && distMeters > 30;

          if (isApproaching && isValidCoordinate(bus.currentPos[0], bus.currentPos[1])) {
            activeApproachBusIds.add(bus.id);
            const lineCoords: [number, number][] = [
              [bus.currentPos[0], bus.currentPos[1]],
              currentOriginCoords,
            ];

            let line = approachLinesMapRef.current.get(bus.id);
            if (!line) {
              line = L.polyline(lineCoords, {
                color: '#16a34a',
                weight: 3.5,
                dashArray: '6, 8',
                opacity: 0.88,
                lineJoin: 'round',
                lineCap: 'round',
              }).addTo(map);
              approachLinesMapRef.current.set(bus.id, line);
            } else {
              line.setLatLngs(lineCoords);
            }
          }
        }
      }

      // Cleanup approach lines for buses that have arrived, passed, or are no longer tracked
      approachLinesMapRef.current.forEach((line, busId) => {
        if (!activeApproachBusIds.has(busId)) {
          line.remove();
          approachLinesMapRef.current.delete(busId);
        }
      });

      // Auto-follow the boarded bus: when commuter is on the bus, continuously pan
      // the map to track it smoothly. Respect manual interaction pauses (3s timeout).
      if (currentHasBoarded && !isUserInteractingWithMapRef.current) {
        const boardedBus = currentJourney?.primaryBus?.bus ||
          (primaryBusId ? activeFleet.find((b) => b.id === primaryBusId) : null);
        if (boardedBus && isValidCoordinate(boardedBus.currentPos[0], boardedBus.currentPos[1])) {
          map.panTo(boardedBus.currentPos, { animate: true, duration: 0.5 });
        }
      } else if (isDriverMode && !isUserInteractingWithMapRef.current) {
        // Driver Mode (non-boarded): focus on the approaching primary bus
        const targetBus =
          currentJourney?.primaryBus?.bus ||
          (allowedBusIds.size > 0 ? activeFleet.find((b) => allowedBusIds.has(b.id)) : null);
        if (targetBus) {
          map.panTo(targetBus.currentPos, { animate: true, duration: 0.25 });
        }
      }

      // Telemetry callback to App.tsx
      if (now - lastTelemetrySentTimeRef.current >= 300) {
        lastTelemetrySentTimeRef.current = now;

        if (currentJourney?.primaryBus) {
          const pb = currentJourney.primaryBus;
          setCurrentRoadName(pb.bus.currentRoadName);

          if (currentOnTelemetry) {
            let phase: SimulationPhase = pb.tripPhase || 'approaching';
            let distKm = pb.distanceToStartMeters / 1000;
            let eta = pb.etaToStartMinutes;
            let status = pb.statusNote;

            const isArrived =
              pb.tripPhase === 'arrived_dest' ||
              (currentHasBoarded && pb.distanceToDestMeters != null && pb.distanceToDestMeters <= 50);

            if (isArrived) {
              phase = 'arrived_dest';
              distKm = 0;
              eta = 0;
              status = `Arrived at ${destinationStop?.name || 'destination'}! Trip completed.`;
            } else if (phase === 'in_transit' || currentHasBoarded) {
              phase = 'in_transit';
              distKm = (pb.distanceToDestMeters ?? pb.distanceStartToDestMeters) / 1000;
              eta = pb.etaToDestMinutes ?? pb.travelTimeMinutes;
              status = pb.bus.isDwelling
                ? `Onboard ${pb.bus.licensePlate} • Paused at Station (${pb.bus.currentRoadName})`
                : `Onboard ${pb.bus.licensePlate} • On ${pb.bus.currentRoadName}`;
            } else if (phase === 'boarding' || pb.etaToStartMinutes <= 0.4) {
              phase = 'boarding';
              status = `Bus at ${currStop.name} platform — Boarding now!`;
            }

            currentOnTelemetry(eta, distKm, status, phase, pb.bus.currentPos);
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(tickMapMarkers);
    };

    animFrameIdRef.current = requestAnimationFrame(tickMapMarkers);

    return () => {
      isSubscribed = false;
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      approachLinesMapRef.current.forEach((line) => line.remove());
      approachLinesMapRef.current.clear();
    };
  }, [createBusMarkerHtml]);

  // Render WBTC Fleet Layer (auxiliary real-time feed if enabled)
  // When a destination is selected or commuter has boarded, suppress WBTC auxiliary fleet to prevent map clutter
  useEffect(() => {
    const layer = wbtcMarkersLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    if (!showWbtcFleet || !wbtcFleet || wbtcFleet.length === 0 || destinationStop || hasBoarded) return;

    wbtcFleet.forEach((wBus) => {
      const isElectric = wBus.busType.toLowerCase().includes('ev') || wBus.busType.toLowerCase().includes('electric');
      const badgeBg = isElectric ? 'bg-emerald-600' : 'bg-slate-700';

      const wbtcHtml = `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
          <div class="w-7 h-7 rounded-xl ${badgeBg} border-2 border-white shadow-md flex items-center justify-center text-white font-black text-[9px] transition-transform hover:scale-110">
            ${wBus.routeNumber}
          </div>
          <div class="absolute -bottom-4 whitespace-nowrap bg-slate-900/90 text-white text-[8px] px-1 py-0.2 rounded shadow opacity-90">
            ${wBus.speedKmh} km/h
          </div>
        </div>
      `;

      const wbtcIcon = L.divIcon({
        className: 'wbtc-fleet-marker',
        html: wbtcHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([wBus.latitude, wBus.longitude], {
        icon: wbtcIcon,
        zIndexOffset: 600,
      })
        .bindPopup(`
          <div class="p-2 text-xs font-sans">
            <strong>WBTC ${wBus.routeNumber}</strong> (${wBus.registration})<br/>
            ${wBus.routeName}<br/>
            Speed: ${wBus.speedKmh} km/h • Status: ${wBus.scheduleStatus}
          </div>
        `)
        .addTo(layer);
    });
  }, [wbtcFleet, showWbtcFleet]);

  const activeMatchingCount = matchingBusIds.length;

  const isFullscreen = mapSize === 'fullscreen';

  const mapContainerClasses = isFullscreen
    ? 'fixed inset-0 z-50 h-screen w-screen bg-slate-100'
    : 'relative w-full h-[260px] sm:h-[280px] bg-slate-100 overflow-hidden transition-all duration-300';

  return (
    <div className={mapContainerClasses}>
      {/* Map Interactive Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'pan-x pan-y' }}
      />

      {/* Embedded Map Controls (Matching reference image) */}
      {!isFullscreen ? (
        <>
          {/* Arrival Status & BOARD CTA Overlay on map when primary bus reaches origin platform */}
          {journeyResult?.primaryBus &&
            (journeyResult.primaryBus.tripPhase === 'boarding' ||
              journeyResult.primaryBus.distanceToStartMeters <= 50 ||
              journeyResult.primaryBus.etaToStartMinutes <= 0.2) &&
            !hasBoarded && (
              <div className="absolute top-3 left-3 z-30 pointer-events-auto">
                <button
                  id="map-board-cta-button"
                  type="button"
                  onClick={() => {
                    if (onBoardBus && journeyResult.primaryBus?.bus) {
                      onBoardBus(journeyResult.primaryBus.bus);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs tracking-wide rounded-full shadow-lg shadow-emerald-600/40 border border-emerald-400 flex items-center gap-1.5 cursor-pointer transition-all animate-pulse"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>BOARD {journeyResult.primaryBus.route.number}</span>
                </button>
              </div>
            )}

          {/* Top-Right Circular Floating Buttons: Recenter & Refresh */}
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2 pointer-events-auto">
            {/* Recenter Button */}
            <button
              id="map-recenter-button"
              type="button"
              onClick={handleFitBounds}
              title="Recenter Map"
              aria-label="Recenter Map"
              className="w-8 h-8 rounded-full bg-white shadow-md border border-slate-200/90 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            >
              <Maximize2 className="w-4 h-4 text-slate-700" />
            </button>

            {/* Refresh Button */}
            <button
              id="map-refresh-button"
              type="button"
              onClick={() => {
                setIsRefreshing(true);
                setTimeout(() => setIsRefreshing(false), 600);
                if (onRefreshTelemetry) {
                  onRefreshTelemetry();
                }
                const map = mapInstanceRef.current;
                if (map) map.invalidateSize();
              }}
              title="Refresh Live Telemetry"
              aria-label="Refresh Live Telemetry"
              className="w-8 h-8 rounded-full bg-white shadow-md border border-slate-200/90 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 text-slate-700 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Bottom-Right Circular Locate Button */}
          <div className="absolute bottom-3 right-3 z-30 pointer-events-auto">
            <button
              id="map-locate-stop-button"
              type="button"
              onClick={() => {
                const map = mapInstanceRef.current;
                if (map && currentStop) {
                  map.setView([currentStop.lat, currentStop.lng], 15, { animate: true });
                }
              }}
              title="Focus on Stop"
              aria-label="Focus on Stop"
              className="w-8 h-8 rounded-full bg-white shadow-md border border-slate-200/90 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            >
              <Crosshair className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        </>
      ) : (
        /* Fullscreen Map Controls */
        <>
          {/* Exit Fullscreen Floating Button */}
          <button
            id="exit-fullscreen-btn"
            type="button"
            onClick={() => {
              setMapSize('standard');
              if (onToggleFullscreen) onToggleFullscreen();
            }}
            className="absolute top-6 right-6 z-40 bg-slate-950/95 text-white px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-1.5 text-xs font-bold border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Exit Fullscreen</span>
          </button>

          {/* View Mode Toggle Button */}
          <div className="absolute top-6 left-6 z-30 flex items-center bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-slate-200/90 shadow-md pointer-events-auto">
            <button
              id="map-mode-overview-button"
              type="button"
              onClick={() => handleSetViewMode('overview')}
              title="Route Overview"
              aria-label="Route Overview mode"
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'overview'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
            <button
              id="map-mode-driver-button"
              type="button"
              onClick={() => handleSetViewMode('driver')}
              title="Driver Mode"
              aria-label="Driver Mode"
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'driver'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 fill-current" />
              <span>Driver</span>
            </button>
          </div>

          {/* Dedicated Zoom & Map Navigation Controls */}
          <div className="absolute bottom-6 left-6 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-slate-200 shadow-lg">
            <button
              id="map-zoom-in-button"
              type="button"
              onClick={handleZoomIn}
              title="Zoom in (+)"
              aria-label="Zoom in"
              className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 text-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
            <div className="text-[10px] font-mono font-bold text-slate-500 px-1 select-none">
              {currentZoom}x
            </div>
            <button
              id="map-zoom-out-button"
              type="button"
              onClick={handleZoomOut}
              title="Zoom out (-)"
              aria-label="Zoom out"
              className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 text-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4 stroke-[2.5]" />
            </button>
            <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />
            <button
              id="map-fit-network-button"
              type="button"
              onClick={handleFitNetwork}
              title="View entire Kolkata network"
              aria-label="Fit network view"
              className="px-2 h-8 flex items-center gap-1 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Network</span>
            </button>
          </div>

          {/* Bottom Right Map Floating Controls */}
          <div className="absolute bottom-6 right-6 z-30 flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-slate-200 shadow-lg">
            <button
              id="map-fit-route-button"
              type="button"
              onClick={handleFitBounds}
              title="Fit view to current route"
              className="p-2 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <LocateFixed className="w-4 h-4 text-blue-600" />
            </button>
            <button
              id="map-wbtc-toggle-button"
              type="button"
              onClick={() => setShowWbtcFleet((prev) => !prev)}
              title={showWbtcFleet ? 'Hide WBTC Fleet' : 'Show WBTC City Fleet'}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                showWbtcFleet ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>
            {onTogglePause && (
              <button
                id="map-pause-toggle-button"
                type="button"
                onClick={onTogglePause}
                title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
                className="p-2 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                {isPaused ? <Play className="w-4 h-4 text-emerald-600" /> : <Pause className="w-4 h-4 text-amber-600" />}
              </button>
            )}
            {onSetSimSpeed && (
              <button
                id="map-sim-speed-button"
                type="button"
                onClick={() => {
                  const nextSpeed = simSpeed === 1 ? 2 : simSpeed === 2 ? 4 : 1;
                  onSetSimSpeed(nextSpeed);
                }}
                title="Simulation Speed"
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-black transition-colors cursor-pointer flex items-center gap-0.5"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>{simSpeed}x</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
});

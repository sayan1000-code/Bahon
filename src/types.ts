export interface Stop {
  id: string;
  name: string;
  code: string;
  platform: string;
  lat: number;
  lng: number;
  description: string;
  road_corridor?: string;
}

export type BusType = 'Regular' | 'AC Express' | 'Electric';

export interface BusRoute {
  id: string;
  number: string;
  name: string;
  type: BusType;
  color: string;
  bgBadge: string;
  textBadge: string;
  stops: string[]; // sequence of stop IDs
  baseFare: number;
  farePerStop: number;
  road_geometry?: [number, number][]; // road-snapped coordinates [lat, lng][] from OSRM
}

export interface PersistentBus {
  id: string;
  licensePlate: string;
  routeId: string;
  routeNumber: string;
  routeName: string;
  routeColor: string;
  type: BusType;
  speedKmh: number;
  crowdLevel: 'Low' | 'Moderate' | 'Crowded';
  currentPos: [number, number]; // [lat, lng]
  bearing: number;
  currentRoadName: string;
  direction: 'outbound' | 'inbound' | 'turnaround_at_destination' | 'turnaround_at_origin';
  currentDistanceMeters: number;
  totalLoopDistanceMeters: number;
  loopProgress: number; // 0.0 - 1.0
  nextStopId: string;
  lastPassedStopId: string;
  isDwelling?: boolean;
  dwellRemainingSeconds?: number;
  lastDwelledStopId?: string;
  isLiveGps?: boolean;
  reportedAt?: string;
}

export interface PersistentRoute extends BusRoute {
  outboundStopIds: string[];
  inboundStopIds: string[];
  outboundPath: [number, number][];
  inboundPath: [number, number][];
  fullLoopPath: [number, number][];
  cumDistances: number[];
  totalLoopDistanceMeters: number;
  stopDistances: Record<string, { outboundDist?: number; inboundDist?: number }>;
}

export interface MatchedBusInfo {
  bus: PersistentBus;
  route: BusRoute;
  direction: 'outbound' | 'inbound';
  hasPassedStartStop: boolean;
  isPastDest?: boolean;
  distanceToStartMeters: number;
  etaToStartMinutes: number;
  distanceStartToDestMeters: number;
  travelTimeMinutes: number;
  fare: number;
  statusNote: string;
  stopsRemainingToStart: number;
  stopsSpanToDest: number;
  pathFromStartToDest: [number, number][];
  intermediateStops?: Stop[];
  tripPhase?: SimulationPhase;
  distanceToDestMeters?: number;
  etaToDestMinutes?: number;
  stopsRemainingToDest?: number;
  destinationStop?: Stop;
}

export interface TransferJourneyInfo {
  isTransfer: true;
  transferStop: Stop;
  leg1Bus: MatchedBusInfo;
  leg2Bus: MatchedBusInfo;
  leg1Route: BusRoute;
  leg2Route: BusRoute;
  totalFare: number;
  totalTravelTimeMinutes: number;
  combinedPath: [number, number][];
  leg1IntermediateStops?: Stop[];
  leg2IntermediateStops?: Stop[];
}

export interface JourneyQueryResult {
  startStop: Stop;
  destStop: Stop;
  matchingBuses: MatchedBusInfo[];
  primaryBus: MatchedBusInfo | null;
  allMatchingBusIds: string[];
  transferJourney?: TransferJourneyInfo | null;
}

export interface RouteRecommendation {
  route: BusRoute;
  currentStop: Stop;
  destinationStop: Stop;
  fare: number;
  initialEtaMinutes: number;
  stopsRemaining: number;
  distanceKm: number;
  isDirect: boolean;
  busNumberPlate: string;
  crowdLevel: 'Low' | 'Moderate' | 'Crowded';
  pathCoordinates: [number, number][]; // complete path from current to destination
  approachPath: [number, number][]; // path the incoming bus travels to reach current stop
  intermediateStops?: Stop[];
  transferJourney?: TransferJourneyInfo | null;
  transferStop?: Stop | null;
  secondLegRoute?: BusRoute | null;
  secondLegBusPlate?: string;
  currentRoadName?: string;
}

export type SimulationPhase = 'approaching' | 'boarding' | 'in_transit' | 'arrived_dest';

export interface WbtcBus {
  busId: string;
  registration: string;
  routeNumber: string;
  routeName: string;
  depot: string;
  busType: string;
  currentRoad: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  occupancy: string;
  nextStop: string;
  etaMinutes: number;
  delayMinutes: number;
  scheduleStatus: 'ON_TIME' | 'SLIGHT_DELAY' | 'EXPEDITE';
  lastPing: string;
}

export interface RouteGeometryResponse {
  source: 'google-maps-routes-api' | 'wbtc-road-network';
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
  roadSegments?: Array<{ name: string; coordinates: [number, number][] }>;
}

export interface UserLocationPing {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
}

export interface UserJourneyState {
  userLocation: UserLocationPing | null;
  distanceToStopMeters: number;
  walkTimeMinutes: number;
  hasBoarded: boolean;
  boardedAt: number | null;
  elapsedTravelTimeSeconds: number;
  isNearStop: boolean;
  gpsStatus: 'idle' | 'prompt' | 'active' | 'denied' | 'simulated' | 'unavailable';
  gpsError: string | null;
  isSimulated: boolean;
}


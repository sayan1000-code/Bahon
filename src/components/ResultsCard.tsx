import React, { useState } from 'react';
import {
  Bus,
  Clock,
  Users,
  Navigation,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  AlertTriangle,
  CheckCircle2,
  RotateCw,
  ArrowRightLeft,
  Route as RouteIcon,
  MapPin,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
} from 'lucide-react';
import { RouteRecommendation, SimulationPhase, MatchedBusInfo, TransferJourneyInfo } from '../types';

interface ResultsCardProps {
  recommendation: RouteRecommendation;
  currentEtaMinutes: number;
  currentDistanceRemainingKm: number;
  liveDistanceKm?: number;
  busStatusText: string;
  currentRoadName?: string;
  simPhase?: SimulationPhase;
  isRouteSaved?: boolean;
  onToggleSaveRoute?: () => void;
  matchingBuses?: MatchedBusInfo[];
  transferJourney?: TransferJourneyInfo | null;
  onStartRoute?: () => void;
  onResetTrip?: () => void;
  isDarkMode?: boolean;
}

export const ResultsCard: React.FC<ResultsCardProps> = ({
  recommendation,
  currentEtaMinutes,
  currentDistanceRemainingKm,
  liveDistanceKm,
  busStatusText,
  currentRoadName,
  simPhase = 'approaching',
  isRouteSaved,
  onToggleSaveRoute,
  matchingBuses = [],
  transferJourney,
  onStartRoute,
  onResetTrip,
  isDarkMode = false,
}) => {
  const { route, currentStop, destinationStop, fare, isDirect, busNumberPlate, crowdLevel } =
    recommendation;

  const activeRoadName =
    currentRoadName ||
    recommendation.currentRoadName ||
    recommendation.route.road_corridor ||
    'Transit Corridor';

  const [showStopsList, setShowStopsList] = useState(true);

  const isBoarding = simPhase === 'boarding';
  const isInTransit = simPhase === 'in_transit';
  const isArrivedDest = simPhase === 'arrived_dest';
  const isApproaching = simPhase === 'approaching';
  const isUrgentBoarding = isApproaching && currentEtaMinutes <= 2.0;

  // Visual Journey Progress Bar calculation using liveDistanceKm and total journey distance
  const effectiveLiveDist = liveDistanceKm !== undefined ? liveDistanceKm : currentDistanceRemainingKm;
  const totalJourneyKm = Math.max(0.4, recommendation.distanceKm || 1);
  let progressPercent = 0;
  let remainingDistanceKm = effectiveLiveDist;
  let completedDistanceKm = 0;
  let progressStageLabel = '';

  if (isArrivedDest) {
    progressPercent = 100;
    remainingDistanceKm = 0;
    completedDistanceKm = totalJourneyKm;
    progressStageLabel = 'Arrived at Destination';
  } else if (isBoarding) {
    progressPercent = 0;
    remainingDistanceKm = totalJourneyKm;
    completedDistanceKm = 0;
    progressStageLabel = 'Ready at Origin Platform';
  } else if (isInTransit) {
    remainingDistanceKm = Math.max(0, Math.min(totalJourneyKm, effectiveLiveDist));
    completedDistanceKm = Math.max(0, totalJourneyKm - remainingDistanceKm);
    progressPercent = Math.min(99, Math.max(2, Math.round((completedDistanceKm / totalJourneyKm) * 100)));
    progressStageLabel = `${remainingDistanceKm.toFixed(1)} km remaining (${completedDistanceKm.toFixed(1)} km completed)`;
  } else {
    // Approaching pickup stop
    remainingDistanceKm = effectiveLiveDist;
    progressPercent = Math.max(5, Math.min(95, Math.round((1 - Math.min(1, effectiveLiveDist / 2.5)) * 100)));
    progressStageLabel = `Pickup bus is ${effectiveLiveDist.toFixed(1)} km away`;
  }

  const formattedEta = isBoarding
    ? 'NOW'
    : isArrivedDest
    ? 'END'
    : String(Math.max(1, Math.round(currentEtaMinutes))).padStart(2, '0');

  const etaSubtitle = isBoarding
    ? 'Boarding Bay 4'
    : isArrivedDest
    ? 'Trip Complete'
    : isInTransit
    ? 'Mins to Dest'
    : currentEtaMinutes <= 0.5
    ? 'At Stop'
    : 'Mins';

  const distanceSubtitle = isBoarding
    ? `At ${currentStop.name}`
    : isArrivedDest
    ? `Arrived at ${destinationStop.name}`
    : isInTransit
    ? `(${currentDistanceRemainingKm.toFixed(1)} km to destination)`
    : `(${currentDistanceRemainingKm.toFixed(1)} km away)`;

  return (
    <div id="results-view-card" className="p-4 sm:p-5 bg-slate-50 space-y-3">
      {/* Visual Alert Indicators for Commuters */}
      {isUrgentBoarding && (
        <div
          id="urgent-boarding-alert"
          className="bg-amber-500 text-slate-950 font-black px-3.5 py-2.5 rounded-2xl border border-amber-600 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-slate-950 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
            <span>Prepare for Boarding — Bus is arriving at {currentStop.name}!</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="bg-slate-950 text-amber-400 text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider">
              Bay 4
            </span>
            {onStartRoute && (
              <button
                onClick={onStartRoute}
                className="bg-slate-950 hover:bg-slate-800 text-amber-400 text-xs font-black px-2.5 py-1 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
                title="Board now and start the bus along the route"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Start Route Now</span>
              </button>
            )}
          </div>
        </div>
      )}

      {isBoarding && (
        <div
          id="boarding-now-alert"
          className="bg-emerald-600 text-white font-black px-3.5 py-2.5 rounded-2xl border border-emerald-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-white text-emerald-700">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span>Bus Docked at {currentStop.name} Platform — Board Now at Bay 4!</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="bg-white text-emerald-800 text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider">
              Doors Open
            </span>
            {onStartRoute && (
              <button
                onClick={onStartRoute}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black px-3 py-1 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Route Now</span>
              </button>
            )}
          </div>
        </div>
      )}

      {isInTransit && (
        <div
          id="in-transit-alert"
          className="bg-blue-600 text-white font-black px-3.5 py-2.5 rounded-2xl border border-blue-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
        >
          <div className="flex items-center gap-2">
            <Navigation className="w-3.5 h-3.5 text-amber-300" />
            <span>Trip in Progress • Heading towards {destinationStop.name}</span>
          </div>
          <span
            className="bg-blue-900/80 text-blue-200 text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider truncate max-w-[200px]"
            title={activeRoadName}
          >
            {activeRoadName}
          </span>
        </div>
      )}

      {isArrivedDest && (
        <div
          id="arrived-dest-alert"
          className="bg-emerald-700 text-white font-black px-3.5 py-2.5 rounded-2xl border border-emerald-800 shadow-sm flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Trip Completed — You have reached {destinationStop.name}!</span>
          </div>
          {onResetTrip && (
            <button
              onClick={onResetTrip}
              className="bg-white hover:bg-emerald-50 text-emerald-900 text-xs font-black px-2.5 py-1 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Track Next Bus</span>
            </button>
          )}
        </div>
      )}

      {/* Sleek Primary Route & ETA Card matching Design Theme */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center relative overflow-hidden">
        {/* Accent vertical bar */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-2 ${
            isBoarding
              ? 'bg-emerald-500'
              : isInTransit
              ? 'bg-blue-600'
              : isArrivedDest
              ? 'bg-emerald-600'
              : 'bg-amber-400'
          }`}
        />

        {/* Left column: Route info & ETA */}
        <div className="pl-2.5">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="bg-slate-900 text-white px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wide flex items-center gap-1">
              <Bus className="w-3 h-3 text-amber-400" />
              ROUTE {route.number}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
              {route.type} • {busNumberPlate}
            </span>
            {onToggleSaveRoute && (
              <button
                type="button"
                onClick={onToggleSaveRoute}
                title={isRouteSaved ? 'Saved in Firebase' : 'Save commute route'}
                className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  isRouteSaved
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isRouteSaved ? (
                  <>
                    <BookmarkCheck className="w-3 h-3 text-amber-600" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3 h-3" />
                    <span>Save</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-baseline">
            <p className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
              {formattedEta}
            </p>
            <span className="text-sm font-bold text-slate-500 uppercase ml-1.5">
              {etaSubtitle}
            </span>
            <span className="text-xs text-slate-400 font-medium ml-3 hidden xs:inline">
              {distanceSubtitle}
            </span>
          </div>
        </div>

        {/* Right column: Fare Price */}
        <div className="text-right flex-shrink-0 pl-3">
          <p className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight">
            ₹{fare}
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Fare Price
          </p>
        </div>
      </div>

      {/* Sleek Live Status, Progress Bar & Transit Pathway */}
      <div className={`px-4 py-3.5 rounded-2xl border shadow-xs flex flex-col gap-3 ${
        isDarkMode
          ? 'bg-slate-900/90 border-slate-800 text-slate-200'
          : 'bg-white border-slate-200/80 text-slate-800'
      }`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                isBoarding ? 'bg-emerald-500' : isInTransit ? 'bg-blue-600' : 'bg-emerald-500'
              }`}
            />
            <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Status:</span>
            <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'} font-medium truncate max-w-[200px] sm:max-w-none`}>
              {busStatusText}
            </span>
          </div>
          <div className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>
            Crowd: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>{crowdLevel}</strong>
          </div>
        </div>

        {/* Visual Progress Bar Component (Calculates Distance Remaining on Active Route) */}
        <div
          id="bus-distance-progress-bar-container"
          className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 transition-all shadow-xs ${
            isDarkMode
              ? 'bg-slate-800/80 border-slate-700/80 text-slate-100'
              : 'bg-slate-50 border-slate-200/80 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-black flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <Bus className="w-4 h-4 animate-bounce" />
              <span>Route Distance Progress</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {totalJourneyKm.toFixed(1)} km total
              </span>
              <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-md bg-blue-600 text-white shadow-2xs">
                {progressPercent}%
              </span>
            </div>
          </div>

          {/* Dynamic Progress Track & Animated Marker */}
          <div className="relative h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
            <div
              id="bus-journey-progress-indicator"
              className={`h-full transition-all duration-700 ease-out rounded-full relative ${
                isArrivedDest
                  ? 'bg-emerald-500'
                  : isInTransit
                  ? 'bg-linear-to-r from-blue-600 to-indigo-500'
                  : 'bg-linear-to-r from-amber-500 to-orange-500'
              }`}
              style={{ width: `${Math.max(4, Math.min(100, progressPercent))}%` }}
            >
              {/* Pulsing leading edge light */}
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/60 rounded-full animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-medium">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-black text-slate-400">Origin</span>
              <span className="truncate max-w-[100px] sm:max-w-[120px] font-bold text-slate-800 dark:text-slate-200">
                {currentStop.name}
              </span>
            </div>
            <div className="text-center px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-slate-700/60 border border-blue-200/60 dark:border-slate-600">
              <span className="font-bold text-blue-700 dark:text-blue-300 block text-[11px]">
                {progressStageLabel}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase font-black text-emerald-500">Destination</span>
              <span className="truncate max-w-[100px] sm:max-w-[120px] font-bold text-emerald-600 dark:text-emerald-400">
                {destinationStop.name}
              </span>
            </div>
          </div>
        </div>

        {/* Path connector line */}
        <div className={`pt-2 border-t ${isDarkMode ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-600'} flex items-center justify-between text-xs`}>
          <div className="flex items-center gap-1.5 font-bold text-slate-900 truncate">
            <span
              className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${
                isBoarding ? 'bg-amber-400 ring-2 ring-amber-200' : 'bg-blue-600'
              }`}
            />
            <span className="truncate max-w-[120px] sm:max-w-none">{currentStop.name}</span>
          </div>
          <div className="flex-1 mx-3 flex items-center gap-1">
            <div className="h-0.5 flex-1 bg-slate-200 relative">
              <span className="absolute left-1/2 -top-2.5 -translate-x-1/2 bg-slate-100 text-slate-600 rounded px-1 text-[9px] font-mono font-bold">
                {recommendation.distanceKm} km
              </span>
            </div>
            <Navigation
              className={`w-3 h-3 rotate-90 flex-shrink-0 ${
                isInTransit ? 'text-emerald-600 font-bold' : 'text-slate-400'
              }`}
            />
          </div>
          <div className="flex items-center gap-1.5 font-bold text-emerald-700 truncate">
            <span
              className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${
                isArrivedDest ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-emerald-600'
              }`}
            />
            <span className="truncate max-w-[120px] sm:max-w-none">{destinationStop.name}</span>
          </div>
        </div>

        {/* Real road routing compliance badge */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
          <span className="flex items-center gap-1 font-semibold text-emerald-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Road-Aligned Path (Google Maps & WBTC AVL)
          </span>
          <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
            Real Roads
          </span>
        </div>

        {/* Bus Stoppages Breakdown: Sequential bus stops in between */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <RouteIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>
                Bus Stoppages (
                {recommendation.intermediateStops && recommendation.intermediateStops.length > 0
                  ? `${recommendation.intermediateStops.length} stops in between`
                  : 'Direct non-stop segment'}
                )
              </span>
            </span>
            {recommendation.intermediateStops && recommendation.intermediateStops.length > 0 && (
              <button
                type="button"
                onClick={() => setShowStopsList((prev) => !prev)}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer bg-blue-50 px-2 py-0.5 rounded-full transition-colors"
              >
                <span>{showStopsList ? 'Hide sequence' : 'View all stops'}</span>
                {showStopsList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Sequential Stoppage Route Track */}
          {recommendation.intermediateStops && recommendation.intermediateStops.length > 0 && showStopsList && (
            <div className="mt-2 bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                <span>Route {recommendation.route.number} Intermediate Stoppages</span>
                <span>{recommendation.intermediateStops.length + 2} Total Stations</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="inline-flex items-center gap-1 bg-blue-600 text-white font-bold px-2 py-0.5 rounded-md shadow-2xs">
                  <MapPin className="w-2.5 h-2.5" />
                  {currentStop.name} (Board)
                </span>
                {recommendation.intermediateStops.map((stop, idx) => (
                  <React.Fragment key={stop.id}>
                    <span className="text-slate-400 font-bold">→</span>
                    <span className="bg-white text-slate-700 font-medium px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
                      {idx + 1}. {stop.name}
                    </span>
                  </React.Fragment>
                ))}
                <span className="text-slate-400 font-bold">→</span>
                <span className="inline-flex items-center gap-1 bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-md shadow-2xs">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {destinationStop.name} (Alight)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 1-Transfer Journey Itinerary (When no direct route exists between start and dest) */}
      {transferJourney && (
        <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-3.5 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-black text-amber-950 uppercase tracking-wider">
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-700" />
              1-Transfer Route Plan
            </span>
            <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-black">
              Total ₹{transferJourney.totalFare} • ~{transferJourney.totalTravelTimeMinutes} min
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Leg 1 */}
            <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded">
                    LEG 1
                  </span>
                  <div>
                    <div className="font-black text-slate-900">
                      Route {transferJourney.leg1Route.number}: {currentStop.name} → {transferJourney.transferStop.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Bus: {transferJourney.leg1Bus.bus.licensePlate} ({transferJourney.leg1Bus.bus.type})
                    </div>
                  </div>
                </div>
                <span className="text-blue-700 font-bold text-xs whitespace-nowrap">
                  ~{transferJourney.leg1Bus.travelTimeMinutes}m
                </span>
              </div>
              {transferJourney.leg1IntermediateStops && transferJourney.leg1IntermediateStops.length > 0 && (
                <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1 flex-wrap">
                  <span className="font-bold text-slate-700">Stops in between:</span>
                  <span>{transferJourney.leg1IntermediateStops.map((s) => s.name).join(' → ')}</span>
                </div>
              )}
            </div>

            {/* Interchange Point */}
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-100/80 rounded-lg text-amber-900 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>
              <span>
                Switch buses at <strong>{transferJourney.transferStop.name}</strong> (~5m transfer window)
              </span>
            </div>

            {/* Leg 2 */}
            <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded">
                    LEG 2
                  </span>
                  <div>
                    <div className="font-black text-slate-900">
                      Route {transferJourney.leg2Route.number}: {transferJourney.transferStop.name} → {destinationStop.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Bus: {transferJourney.leg2Bus.bus.licensePlate} ({transferJourney.leg2Bus.bus.type})
                    </div>
                  </div>
                </div>
                <span className="text-emerald-700 font-bold text-xs whitespace-nowrap">
                  ~{transferJourney.leg2Bus.travelTimeMinutes}m
                </span>
              </div>
              {transferJourney.leg2IntermediateStops && transferJourney.leg2IntermediateStops.length > 0 && (
                <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1 flex-wrap">
                  <span className="font-bold text-slate-700">Stops in between:</span>
                  <span>{transferJourney.leg2IntermediateStops.map((s) => s.name).join(' → ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

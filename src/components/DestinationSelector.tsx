import React, { useState, useMemo } from 'react';
import { ChevronDown, Check, Search, X, Zap, Bus, Clock, ArrowRight, Compass } from 'lucide-react';
import { Stop, PersistentBus, PersistentRoute } from '../types';
import { STOPS } from '../data/transitData';
import { findAvailableRoutesFromStop, findClosestBusRoutePossible } from '../data/persistentFleet';
import {
  buildCanonicalDestinationOptions,
  getCanonicalDisplayName,
  CanonicalDestinationOption,
} from '../data/canonicalStops';

interface DestinationSelectorProps {
  currentStop: Stop;
  selectedDestinationId: string;
  onSelectDestination: (destinationId: string) => void;
  fleet?: PersistentBus[];
  stops?: Stop[];
}

export const DestinationSelector: React.FC<DestinationSelectorProps> = ({
  currentStop,
  selectedDestinationId,
  onSelectDestination,
  fleet = [],
  stops,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllChips, setShowAllChips] = useState(false);
  const [showRoutesDrawer, setShowRoutesDrawer] = useState(false);

  const stopList = stops && stops.length > 0 ? stops : STOPS;

  const availableDestinations = useMemo(
    () => stopList.filter((stop) => stop.id !== currentStop.id),
    [currentStop.id, stopList]
  );

  // Canonical options: deduplicate so commuter sees only 1 entry per canonical hub
  const canonicalOptions: CanonicalDestinationOption[] = useMemo(() => {
    return buildCanonicalDestinationOptions(availableDestinations);
  }, [availableDestinations]);

  const filteredDestinations = useMemo(() => {
    if (!searchQuery.trim()) return canonicalOptions;
    const q = searchQuery.toLowerCase().trim();
    return canonicalOptions.filter((opt) => {
      const matchDisplay = opt.displayName.toLowerCase().includes(q);
      const matchSubtitle = opt.subtitle?.toLowerCase().includes(q);
      const matchAliases = opt.representativeStop.name.toLowerCase().includes(q);
      return matchDisplay || matchSubtitle || matchAliases;
    });
  }, [canonicalOptions, searchQuery]);

  // Key transport interchange hubs for Kolkata
  const POPULAR_CANONICAL_NAMES = [
    'Howrah',
    'Esplanade',
    'Park Street',
    'Ruby',
    'Sector V',
    'Airport',
    'Ultadanga',
    'Barasat',
    'Garia',
    'Jadavpur',
    'Behala',
    'Taratala',
    'Salt Lake',
    'New Town',
  ];

  const popularDestinations = useMemo(() => {
    return canonicalOptions.filter((opt) =>
      POPULAR_CANONICAL_NAMES.some(
        (pop) => opt.canonicalName.toLowerCase() === pop.toLowerCase()
      )
    );
  }, [canonicalOptions]);

  const displayedChips = searchQuery.trim()
    ? filteredDestinations
    : showAllChips
    ? canonicalOptions
    : popularDestinations;

  // Real-time calculation of closest approaching bus route from current stop
  const closestBusRoute = useMemo(() => {
    if (!fleet || fleet.length === 0) return null;
    return findClosestBusRoutePossible(currentStop.id, fleet);
  }, [currentStop.id, fleet]);

  // All direct bus routes available from current stop mapped with terminus destination and metadata
  const routesFromHere = useMemo(() => {
    const rawRoutes = findAvailableRoutesFromStop(currentStop.id);
    const stopsMap = new Map(STOPS.map((s) => [s.id, s]));

    const result: {
      route: PersistentRoute;
      primaryDestination: Stop;
      downstreamStopsCount: number;
      frequencyMinutes: number;
    }[] = [];

    for (const route of rawRoutes) {
      let destStop: Stop | undefined;
      let downstreamCount = 0;

      // Determine forward destination based on whether current stop is on outbound or inbound path
      const outIdx = route.outboundStopIds.indexOf(currentStop.id);
      if (outIdx >= 0 && outIdx < route.outboundStopIds.length - 1) {
        const destId = route.outboundStopIds[route.outboundStopIds.length - 1];
        destStop = stopsMap.get(destId);
        downstreamCount = route.outboundStopIds.length - 1 - outIdx;
      } else {
        const inIdx = route.inboundStopIds.indexOf(currentStop.id);
        if (inIdx >= 0 && inIdx < route.inboundStopIds.length - 1) {
          const destId = route.inboundStopIds[route.inboundStopIds.length - 1];
          destStop = stopsMap.get(destId);
          downstreamCount = route.inboundStopIds.length - 1 - inIdx;
        } else {
          // If at terminus, look towards the other terminus
          const destId =
            route.outboundStopIds[route.outboundStopIds.length - 1] !== currentStop.id
              ? route.outboundStopIds[route.outboundStopIds.length - 1]
              : route.inboundStopIds[route.inboundStopIds.length - 1];
          destStop = stopsMap.get(destId);
          downstreamCount = Math.max(1, (route.stops?.length || 2) - 1);
        }
      }

      if (destStop && destStop.id !== currentStop.id) {
        // Average frequency by route type
        const freq = route.type === 'AC Express' ? 12 : route.type === 'Electric' ? 10 : 8;
        result.push({
          route,
          primaryDestination: destStop,
          downstreamStopsCount: Math.max(1, downstreamCount),
          frequencyMinutes: freq,
        });
      }
    }

    return result;
  }, [currentStop.id]);

  return (
    <div className="bg-white border-b border-slate-200 p-4 sm:p-5 shadow-xs">
      {/* 1. Closest Approaching Bus Route Banner (Quick Action) */}
      {closestBusRoute && closestBusRoute.route && closestBusRoute.destinationStop && (
        <div className="mb-3.5 bg-linear-to-r from-amber-50 to-orange-50 border border-amber-300/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black flex-shrink-0 shadow-xs">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded">
                  Closest Approaching Bus
                </span>
                <span className="text-xs font-black text-slate-900">
                  Route {closestBusRoute.route.number}
                </span>
                <span className="text-[11px] text-slate-600 font-medium">
                  towards <strong className="text-slate-900">{closestBusRoute.destinationStop.name}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-0.5 font-medium">
                <span className="text-amber-700 font-black flex items-center gap-0.5">
                  <Clock className="w-3 h-3" /> Arriving in ~{closestBusRoute.etaMinutes} min
                </span>
                <span>•</span>
                <span>{closestBusRoute.distanceMeters}m away</span>
                <span>•</span>
                <span>{closestBusRoute.bus?.speedKmh ?? 32} km/h</span>
              </div>
              {closestBusRoute.intermediateStops && closestBusRoute.intermediateStops.length > 0 && (
                <div className="flex items-center gap-1 text-[10.5px] text-slate-600 mt-1 flex-wrap">
                  <span className="font-bold text-amber-900 bg-amber-200/60 px-1 py-0.2 rounded text-[9.5px]">
                    {closestBusRoute.intermediateStops.length} stops in between:
                  </span>
                  <span className="text-slate-700">
                    {closestBusRoute.intermediateStops.slice(0, 3).map((s) => s.name).join(' → ')}
                    {closestBusRoute.intermediateStops.length > 3
                      ? ` → +${closestBusRoute.intermediateStops.length - 3} more`
                      : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectDestination(closestBusRoute.destinationStop.id)}
            className="self-start sm:self-center bg-slate-950 hover:bg-slate-800 text-amber-400 text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap"
          >
            <span>Take This Bus</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Sleek Floating-Label Dropdown */}
      <div className="relative pt-1">
        <label
          htmlFor="destination-dropdown"
          className="text-[10px] absolute -top-1.5 left-3 bg-white text-blue-600 px-2 font-black uppercase tracking-wider z-10 rounded-full border border-blue-200"
        >
          WHERE ARE YOU GOING?
        </label>

        <div className="relative">
          <select
            id="destination-dropdown"
            value={selectedDestinationId}
            onChange={(e) => onSelectDestination(e.target.value)}
            aria-label="Where are you going? Select destination stop"
            className="w-full bg-white text-slate-900 rounded-2xl p-3.5 sm:p-4 pr-12 font-bold text-base sm:text-lg border-2 border-blue-400 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs transition-all cursor-pointer"
          >
            <option value="" disabled className="text-slate-400 font-medium">
              Choose destination ({canonicalOptions.length} destinations available)...
            </option>
            {canonicalOptions.map((opt) => (
              <option
                key={opt.id}
                value={opt.id}
                className="text-slate-900 font-bold py-2 text-base"
              >
                {opt.displayName} {opt.rawStopCount > 1 ? `(${opt.rawStopCount} locations)` : `(${opt.representativeStop.code})`}
              </option>
            ))}
          </select>

          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-blue-600">
            <ChevronDown className="w-5 h-5 stroke-[3]" />
          </div>
        </div>
      </div>

      {/* Direct Bus Routes departing from currentStop */}
      {routesFromHere.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
              <Bus className="w-3.5 h-3.5 text-blue-600" />
              <span>Bus Routes Passing Here ({routesFromHere.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setShowRoutesDrawer(!showRoutesDrawer)}
              className="text-blue-600 text-[10px] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <Compass className="w-3 h-3" />
              {showRoutesDrawer ? 'Hide route directory' : 'View all departing routes'}
            </button>
          </div>

          {/* Quick Route Badges preview */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {routesFromHere.map((item) => (
              <button
                key={item.route.id}
                type="button"
                onClick={() => onSelectDestination(item.primaryDestination.id)}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg px-2 py-1 text-xs transition-all flex-shrink-0 cursor-pointer text-left group"
              >
                <span className="font-black bg-blue-700 text-white text-[10px] px-1.5 py-0.5 rounded group-hover:bg-blue-800">
                  {item.route.number}
                </span>
                <span className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">
                  → {item.primaryDestination?.name ? item.primaryDestination.name.split(' ')[0] : 'Terminus'}
                </span>
              </button>
            ))}
          </div>

          {/* Detailed Routes Directory Drawer */}
          {showRoutesDrawer && (
            <div className="mt-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Direct Routes from {currentStop.name}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {routesFromHere.map((item) => (
                  <div
                    key={item.route.id}
                    className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between gap-2 shadow-2xs hover:border-blue-300 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-blue-700 text-white font-black text-xs px-2 py-0.5 rounded-md">
                            {item.route.number}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {item.route.type}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          ₹{item.route.baseFare}+
                        </span>
                      </div>
                      <div className="text-xs font-black text-slate-900">
                        {item.route.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Every {item.frequencyMinutes} min • {item.downstreamStopsCount} stops downstream
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectDestination(item.primaryDestination.id)}
                      className="w-full bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Go to {item.primaryDestination.name}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Search & Stop Filter */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          <span>{searchQuery ? `Search Results (${filteredDestinations.length})` : 'Popular Destinations'}</span>
          <button
            type="button"
            onClick={() => setShowAllChips(!showAllChips)}
            className="text-blue-600 text-[10px] font-bold lowercase hover:underline cursor-pointer"
          >
            {showAllChips ? 'show key hubs' : `show all ${availableDestinations.length} stops`}
          </button>
        </div>

        {/* Quick Search Input */}
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type stop name (e.g. Airport, Ruby, Barasat)..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-8 py-1.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Destination Chips */}
        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto no-scrollbar pr-0.5">
          {displayedChips.map((opt) => {
            const isChosen =
              selectedDestinationId === opt.id ||
              opt.stopIds.includes(selectedDestinationId);
            return (
              <button
                key={opt.id}
                id={`quick-dest-${opt.id}`}
                type="button"
                onClick={() => onSelectDestination(opt.id)}
                className={`min-h-[42px] px-3 py-1.5 rounded-xl font-bold text-xs text-left flex items-center justify-between border transition-all cursor-pointer ${
                  isChosen
                    ? 'bg-blue-50 text-blue-700 border-blue-500 shadow-xs ring-1 ring-blue-500/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <div className="truncate">
                  <div className="truncate font-black">{opt.displayName}</div>
                  <div className={`text-[10px] truncate ${isChosen ? 'text-blue-600' : 'text-slate-400'}`}>
                    {opt.subtitle}
                  </div>
                </div>
                {isChosen && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3] flex-shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

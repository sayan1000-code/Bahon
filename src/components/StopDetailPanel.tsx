import React, { useState, useMemo, useEffect } from 'react';
import { Bus, Users, Clock, ArrowRight } from 'lucide-react';
import { Stop, PersistentBus, PersistentRoute } from '../types';
import { computeStopDepartures, StopDeparture } from '../utils/departureHelper';

interface StopDetailPanelProps {
  currentStop: Stop;
  fleet: PersistentBus[];
  selectedDestinationId?: string;
  onSelectDeparture: (departure: StopDeparture) => void;
  onViewFullMap: () => void;
  onOpenSchedule: () => void;
  onBoardBus?: (departure: StopDeparture) => void;
  routes?: PersistentRoute[];
  stops?: Stop[];
}

export const StopDetailPanel: React.FC<StopDetailPanelProps> = React.memo(({
  currentStop,
  fleet,
  selectedDestinationId,
  onSelectDeparture,
  onViewFullMap,
  onOpenSchedule,
  onBoardBus,
  routes,
  stops,
}) => {
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('All');

  // Reset route filter pill whenever destination or current stop changes
  useEffect(() => {
    setSelectedRouteFilter('All');
  }, [currentStop.id, selectedDestinationId]);

  // Compute departures and serving route numbers based on the single source of truth
  const { allDepartures, servingRouteNumbers } = useMemo(() => {
    return computeStopDepartures(currentStop.id, fleet, selectedDestinationId, routes, stops);
  }, [currentStop.id, fleet, selectedDestinationId, routes, stops]);

  // Filter departures based on active route pill
  const filteredDepartures = useMemo(() => {
    let list = allDepartures;
    if (selectedRouteFilter !== 'All') {
      list = list.filter((d) => d.routeNumber === selectedRouteFilter);
    }
    // Cap to soonest 5-6 buses by ETA, sorted ascending (soonest first)
    return list.slice(0, 6);
  }, [allDepartures, selectedRouteFilter]);

  return (
    <div
      id="stop-departures-container"
      className="bg-white rounded-t-3xl shadow-xl flex-1 flex flex-col pt-3 px-4 pb-3 transition-colors duration-200 z-30"
    >
      {/* Grab Handle */}
      <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-2.5" />

      {/* Title */}
      <h2 className="text-base font-bold text-slate-900 tracking-tight mb-2.5">
        Incoming Departures
      </h2>

      {/* 4. FILTER PILLS: Horizontally scrollable row of pills */}
      <div
        id="route-filter-pills-row"
        className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1.5 mb-3"
      >
        {/* "All" pill */}
        <button
          id="filter-pill-all"
          type="button"
          onClick={() => setSelectedRouteFilter('All')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedRouteFilter === 'All'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800'
          }`}
        >
          All
        </button>

        {/* Serving route pills */}
        {servingRouteNumbers.map((routeNum) => {
          const isSelected = selectedRouteFilter === routeNum;
          return (
            <button
              key={routeNum}
              id={`filter-pill-${routeNum.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              type="button"
              onClick={() => setSelectedRouteFilter(routeNum)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              {routeNum}
            </button>
          );
        })}
      </div>

      {/* 5. DEPARTURE LIST: Cards matching reference image */}
      <div
        id="incoming-departures-list"
        className="flex-1 flex flex-col space-y-2.5 overflow-y-auto max-h-[380px] no-scrollbar pr-0.5"
      >
        {filteredDepartures.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            {selectedDestinationId
              ? `No matching departures found for this destination.`
              : `No scheduled departures currently for route ${selectedRouteFilter}.`}
          </div>
        ) : (
          filteredDepartures.map((departure, index) => {
            const isTopSoonest = index === 0;

            // Urgency color calculation
            const etaColor =
              departure.etaMinutes < 5
                ? 'text-emerald-600'
                : departure.etaMinutes <= 10
                ? 'text-amber-600'
                : 'text-slate-500';

            return (
              <div
                key={departure.id}
                id={`departure-card-${departure.routeNumber.toLowerCase()}-${index}`}
                onClick={() => onSelectDeparture(departure)}
                className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isTopSoonest
                    ? 'bg-blue-50/75 border border-blue-200/90 shadow-2xs hover:bg-blue-50'
                    : 'bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                {/* Left: small bus icon + route number as colored badge */}
                <div className="shrink-0">
                  <span
                    style={
                      departure.routeNumber !== '24B' && departure.routeNumber !== 'AC39'
                        ? { backgroundColor: departure.routeColor || '#2563EB' }
                        : undefined
                    }
                    className={`text-xs font-bold px-2 py-0.5 rounded border flex items-center gap-1 shadow-2xs ${
                      departure.routeNumber === '24B'
                        ? 'bg-white border-slate-300 text-slate-800'
                        : departure.routeNumber === 'AC39'
                        ? 'bg-slate-100 border-slate-200 text-slate-700'
                        : 'text-white border-transparent'
                    }`}
                  >
                    <Bus className="w-3.5 h-3.5" />
                    <span>{departure.routeNumber}</span>
                  </span>
                </div>

                {/* Middle: destination name in bold + subtitle line */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 text-sm truncate">
                    {departure.destinationName}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                    <span>{departure.busType}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <Users className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{departure.seatsStatus}</span>
                    </span>
                  </div>
                </div>

                {/* Right: ETA / Arrival status or conditional BOARD pill */}
                <div className="text-right shrink-0 flex flex-col items-end">
                  {/* Requirement 3: BOARD pill button shown ONLY when bus has arrived at the origin stop */}
                  {(departure.etaMinutes <= 0.2 || departure.distanceMeters <= 50) ? (
                    <button
                      id={`board-pill-${departure.busId}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onBoardBus) {
                          onBoardBus(departure);
                        } else {
                          onSelectDeparture(departure);
                        }
                      }}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs tracking-wider rounded-full shadow-md shadow-emerald-600/30 flex items-center gap-1 cursor-pointer transition-all animate-pulse"
                    >
                      <span>BOARD</span>
                    </button>
                  ) : (
                    <div className={`flex items-baseline justify-end gap-1 ${etaColor}`}>
                      <span className="text-lg font-black leading-none">{departure.etaMinutes}</span>
                      <span className="text-[10px] font-black uppercase">MIN</span>
                    </div>
                  )}
                  <div className="text-[11px] font-semibold text-slate-600 mt-1">
                    ₹{departure.fare}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. FOOTER: Two plain text links side by side */}
      <div
        id="stop-detail-footer-links"
        className="flex items-center justify-between pt-3 pb-1 px-1 text-xs font-semibold mt-auto border-t border-slate-100"
      >
        <button
          id="footer-view-full-map-btn"
          type="button"
          onClick={onViewFullMap}
          className="text-slate-600 hover:text-blue-600 cursor-pointer transition-colors"
        >
          View full map
        </button>

        <button
          id="footer-bus-schedule-btn"
          type="button"
          onClick={onOpenSchedule}
          className="text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
        >
          Bus Schedule
        </button>
      </div>
    </div>
  );
});

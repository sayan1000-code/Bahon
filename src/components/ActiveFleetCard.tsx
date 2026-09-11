import React, { useState } from 'react';
import { RotateCw, Bus, Clock, Users, ChevronDown, ChevronUp, Navigation2 } from 'lucide-react';
import { MatchedBusInfo, TransferJourneyInfo, PersistentRoute } from '../types';

interface ActiveFleetCardProps {
  matchingBuses: MatchedBusInfo[];
  routeNumber: string;
  transferJourney?: TransferJourneyInfo | null;
  onSelectBus?: (busId: string) => void;
}

export const ActiveFleetCard: React.FC<ActiveFleetCardProps> = ({
  matchingBuses,
  routeNumber,
  transferJourney,
  onSelectBus,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!matchingBuses || matchingBuses.length === 0) {
    return null;
  }

  return (
    <div id="active-fleet-container" className="bg-white border-t border-b border-slate-200 p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
            <Bus className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-black text-slate-900 text-sm">
              <RotateCw className="w-3.5 h-3.5 text-blue-600 animate-spin-slow" />
              <span>Route {routeNumber} Active Fleet</span>
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {matchingBuses.length} Buses
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Continuous city loop • ~3–5 min headway wait
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors cursor-pointer"
          aria-label={isExpanded ? 'Collapse fleet list' : 'Expand fleet list'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-1.5 max-h-72 overflow-y-auto no-scrollbar pr-0.5">
          {matchingBuses.map((m, idx) => {
            const isNext = idx === 0;
            const isSecond = idx === 1;
            const badgeLabel = isNext
              ? 'NEXT ARRIVAL'
              : isSecond
              ? 'FOLLOWING'
              : `#${idx + 1} EN ROUTE`;

            const badgeStyle = isNext
              ? 'bg-amber-400 text-slate-950 font-black ring-1 ring-amber-500/30'
              : isSecond
              ? 'bg-blue-100 text-blue-800 font-bold'
              : 'bg-slate-100 text-slate-700 font-semibold';

            return (
              <div
                key={m.bus.id}
                onClick={() => onSelectBus && onSelectBus(m.bus.id)}
                className={`p-2.5 rounded-xl text-xs flex items-center justify-between border transition-all cursor-pointer ${
                  isNext
                    ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200/90'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex flex-col items-center">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${badgeStyle}`}>
                      {badgeLabel}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                      {m.bus.speedKmh} km/h
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="font-mono font-black text-xs text-slate-900 flex items-center gap-1">
                      <span>{m.bus.licensePlate}</span>
                      <span className="text-[10px] font-sans font-normal text-slate-500 bg-slate-100 px-1 rounded">
                        {m.bus.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <Navigation2 className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{m.bus.currentRoadName}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-2">
                  <div className="font-black text-xs text-blue-700">
                    ~{Math.round(m.etaToStartMinutes)} min
                  </div>
                  <div className="text-[9px] text-slate-500 font-medium mt-0.5">
                    {m.hasPassedStartStop ? (
                      <span className="text-amber-700 font-bold">Loop return</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">Approaching</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

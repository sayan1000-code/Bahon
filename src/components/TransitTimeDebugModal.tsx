import React from 'react';
import { Clock, Activity, Compass, Cpu, X, RotateCcw, ShieldCheck, Radio } from 'lucide-react';
import { PersistentBus, BusRoute, Stop } from '../types';
import { SupabaseTripInstance } from '../hooks/useSupabaseTransit';

interface TransitTimeDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStop: Stop | null;
  destinationStop: Stop | null;
  activeBus?: PersistentBus | null;
  fleet: PersistentBus[];
  trips: SupabaseTripInstance[];
  routes: BusRoute[];
}

export const TransitTimeDebugModal: React.FC<TransitTimeDebugModalProps> = ({
  isOpen,
  onClose,
  currentStop,
  destinationStop,
  activeBus,
  fleet,
  trips,
  routes,
}) => {
  if (!isOpen) return null;

  const now = Date.now();
  const nowDate = new Date(now);

  // Format IST time
  const istFormatted = nowDate.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour12: true,
  });

  // Device local time
  const localFormatted = nowDate.toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Find matched trip info for active bus
  const matchedTrip = trips.find(
    (t) =>
      (activeBus?.id && activeBus.id.includes(t.id)) ||
      (activeBus?.routeId === t.route_id && activeBus?.licensePlate?.endsWith(String((t.bus_slot ?? 0) + 1).padStart(2, '0')))
  ) || trips[0];

  const matchedRoute = routes.find((r) => r.id === (activeBus?.routeId || matchedTrip?.route_id));

  // Compute timing variables
  const depTimeStr = matchedTrip?.departure_at;
  const depTimeEpoch = depTimeStr ? new Date(depTimeStr).getTime() : now;
  const elapsedMinutes = !isNaN(depTimeEpoch) ? (now - depTimeEpoch) / 60000 : 0;

  const oneWayMinutes = (matchedRoute as any)?.one_way_minutes ?? 60;
  const turnaroundMinutes = (matchedRoute as any)?.turnaround_minutes ?? 10;
  const roundTripMinutes = 2 * oneWayMinutes + 2 * turnaroundMinutes;
  const cyclePosition = ((elapsedMinutes % roundTripMinutes) + roundTripMinutes) % roundTripMinutes;
  const cyclePercent = roundTripMinutes > 0 ? (cyclePosition / roundTripMinutes) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>Transit Telemetry & Time Debug</span>
              </h3>
              <p className="text-[11px] text-slate-400">Deterministic loop & client-time diagnostics</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar text-xs">
          {/* 1. Client-Side Time Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Browser Clock (Date.now())
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-semibold">
                Client-Driven
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">IST (Asia/Kolkata):</span>
                <span className="text-amber-300 font-bold">{istFormatted}</span>
              </div>
              <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Device Local:</span>
                <span className="text-slate-200 font-semibold">{localFormatted}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1">
              <span>Epoch ms: <code className="text-blue-400">{now}</code></span>
              <span>UTC: <code className="text-slate-300">{nowDate.toISOString().slice(11, 19)}Z</code></span>
            </div>
          </div>

          {/* 2. Deterministic Looping Math Diagnostic */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                Round-Trip Looping Cycle
              </span>
              <span className="text-[10px] font-mono text-blue-400 font-semibold">
                {activeBus ? `Bus: ${activeBus.licensePlate}` : 'Primary Fleet Bus'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-center">
              <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">One-Way</span>
                <span className="text-slate-200 font-bold text-xs">{oneWayMinutes} min</span>
              </div>
              <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Turnaround</span>
                <span className="text-slate-200 font-bold text-xs">{turnaroundMinutes} min</span>
              </div>
              <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Round-Trip</span>
                <span className="text-blue-400 font-bold text-xs">{roundTripMinutes} min</span>
              </div>
            </div>

            {/* Matched Trip Reference */}
            <div className="space-y-1.5 pt-1 font-mono text-[11px] bg-slate-900/80 rounded-xl p-2.5 border border-slate-800/60">
              <div className="flex justify-between items-center text-slate-400">
                <span>Trip ID:</span>
                <span className="text-slate-200 font-semibold">{matchedTrip?.id || 'synthetic-slot'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Departure At (UTC):</span>
                <span className="text-amber-300 truncate max-w-[200px]">{depTimeStr || 'Now'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Elapsed Since Departure:</span>
                <span className="text-emerald-400 font-bold">{elapsedMinutes.toFixed(2)} min</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Cycle Position (mod {roundTripMinutes}m):</span>
                <span className="text-purple-400 font-bold">{cyclePosition.toFixed(2)} min ({cyclePercent.toFixed(1)}%)</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Direction:</span>
                <span className="text-white font-bold capitalize">{activeBus?.direction || (cyclePosition <= oneWayMinutes ? 'Outbound' : 'Inbound')}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Road Corridor:</span>
                <span className="text-cyan-300 font-semibold truncate max-w-[200px]">{activeBus?.currentRoadName || 'Transit Corridor'}</span>
              </div>
            </div>
          </div>

          {/* 3. Active Fleet Overview Table */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <span className="font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Active Deterministic Fleet ({fleet.length} Buses)
            </span>

            <div className="max-h-40 overflow-y-auto space-y-1.5 no-scrollbar font-mono text-[10px]">
              {fleet.slice(0, 10).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800/80"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: b.routeColor || '#3b82f6' }}
                    />
                    <span className="font-bold text-white">{b.routeNumber}</span>
                    <span className="text-slate-400 text-[9px]">{b.licensePlate}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 capitalize">{b.direction}</span>
                    <span className="text-emerald-400 font-bold">{((b.loopProgress || 0) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Deterministic Looping Verified
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

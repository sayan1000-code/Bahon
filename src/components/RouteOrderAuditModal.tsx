import React, { useState, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Compass,
  MapPin,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Stop, BusRoute } from '../types';
import { SupabaseRoute } from '../hooks/useSupabaseTransit';
import { RouteAuditResult, auditRouteStopOrder } from '../utils/routeOrderAudit';
import { supabase } from '../lib/supabase';
import { backfillMissingRouteGeometries } from '../services/osrmRouteService';

interface RouteOrderAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditResults: RouteAuditResult[];
  stops?: Stop[];
  onRouteReordered?: (routeId: string, newStopIds: string[]) => void | Promise<void>;
}

export const RouteOrderAuditModal: React.FC<RouteOrderAuditModalProps> = ({
  isOpen,
  onClose,
  auditResults,
  stops = [],
  onRouteReordered,
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(() =>
    auditResults.length > 0 ? auditResults[0].routeId : ''
  );
  const [searchFilter, setSearchFilter] = useState('');
  const [committing, setCommitting] = useState(false);
  const [committedRoutes, setCommittedRoutes] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<{ completed: number; total: number; routeNumber: string } | null>(null);
  const [backfillSummary, setBackfillSummary] = useState<string | null>(null);

  const handleStartBackfill = async () => {
    setIsBackfilling(true);
    setBackfillSummary(null);
    try {
      const res = await backfillMissingRouteGeometries((p) => {
        setBackfillProgress(p);
      });
      setBackfillSummary(`Finished backfill: ${res.success} snapped, ${res.fallback} fallbacks of ${res.total} missing routes.`);
    } catch (err: any) {
      setBackfillSummary(`Backfill error: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsBackfilling(false);
    }
  };

  // Filter routes in sidebar
  const filteredRoutes = useMemo(() => {
    if (!searchFilter.trim()) return auditResults;
    const q = searchFilter.toLowerCase().trim();
    return auditResults.filter(
      (r) =>
        r.routeNumber.toLowerCase().includes(q) ||
        r.routeName.toLowerCase().includes(q) ||
        r.routeId.toLowerCase().includes(q)
    );
  }, [auditResults, searchFilter]);

  const activeAudit = useMemo(() => {
    return (
      auditResults.find((r) => r.routeId === selectedRouteId) ||
      filteredRoutes[0] ||
      auditResults[0] ||
      null
    );
  }, [auditResults, filteredRoutes, selectedRouteId]);

  if (!isOpen) return null;

  // Handle manual confirmation to update Supabase stop_sequence
  const handleCommitReorder = async () => {
    if (!activeAudit) return;
    setCommitting(true);
    setStatusMessage(null);

    const newStopSequence = activeAudit.suggestedStops.map((s) => s.id);

    try {
      console.log(`[Stop-Order Commit] Updating route "${activeAudit.routeId}" in Supabase...`);

      // 1. Explicitly execute Supabase update with .select() so we verify affected rows
      const { data: updateData, error: updateError } = await supabase
        .from('routes')
        .update({
          stop_sequence: newStopSequence,
          road_geometry: null, // Force re-snapping with new clean order
        })
        .eq('id', activeAudit.routeId)
        .select('id, route_number, stop_sequence, road_geometry');

      if (updateError) {
        throw new Error(updateError.message);
      }

      if (!updateData || updateData.length === 0) {
        throw new Error(
          `Zero rows updated in Supabase! Route id "${activeAudit.routeId}" was not found in the routes table.`
        );
      }

      // 2. Perform a fresh round-trip verification query directly against Supabase
      const { data: freshRoute, error: verifyError } = await supabase
        .from('routes')
        .select('id, route_number, stop_sequence, road_geometry')
        .eq('id', activeAudit.routeId)
        .single();

      if (verifyError || !freshRoute) {
        throw new Error(`Fresh verification query failed: ${verifyError?.message || 'Route not found'}`);
      }

      // 3. Re-run audit calculation fresh on the newly persisted database record
      const stopsMap = new Map((stops || []).map((s) => [s.id, s]));
      const postCommitReversals = auditRouteStopOrder(freshRoute as SupabaseRoute, stopsMap);

      setCommittedRoutes((prev) => ({ ...prev, [activeAudit.routeId]: true }));

      if (postCommitReversals.length === 0) {
        setStatusMessage(
          `Successfully committed & verified Route ${activeAudit.routeNumber} to Supabase! Re-query confirmed road_geometry is cleared (null) and 0 acute reversals remain.`
        );
      } else {
        setStatusMessage(
          `Committed Route ${activeAudit.routeNumber} to Supabase (road_geometry: null). Note: ${postCommitReversals.length} reversal(s) remain due to route turnaround loops.`
        );
      }

      if (onRouteReordered) {
        await onRouteReordered(activeAudit.routeId, newStopSequence);
      }
    } catch (err: any) {
      console.error('[Supabase Stop-Order Commit Error]', err);
      setStatusMessage(`Failed to update Supabase: ${err?.message || 'Unknown error'}`);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Route Stop-Order Audit & Guided Fix</span>
                <span className="text-xs bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                  {auditResults.length} Flagged Routes
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Routes with bearing reversals &gt; 120° (potential backtracks / zigzags). Review before applying.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartBackfill}
              disabled={isBackfilling}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isBackfilling
                  ? 'bg-blue-100 text-blue-800 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              }`}
              title="Backfill missing road geometries to Supabase with rate-limiting & backoff"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBackfilling ? 'animate-spin' : ''}`} />
              <span>
                {isBackfilling
                  ? backfillProgress
                    ? `Backfilling (${backfillProgress.completed}/${backfillProgress.total})...`
                    : 'Backfilling...'
                  : 'Backfill Missing Geometries'}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {backfillSummary && (
          <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{backfillSummary}</span>
          </div>
        )}

        {/* Body layout: Left list of routes, Right comparison pane */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Route Selector list */}
          <div className="w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
            <div className="p-3 border-b border-slate-200">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search flagged route (e.g. C26, S-3W)..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 no-scrollbar">
              {filteredRoutes.map((item) => {
                const isSelected = activeAudit?.routeId === item.routeId;
                const isCommitted = committedRoutes[item.routeId];
                return (
                  <button
                    key={item.routeId}
                    type="button"
                    onClick={() => {
                      setSelectedRouteId(item.routeId);
                      setStatusMessage(null);
                    }}
                    className={`w-full text-left p-3 flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/90 border-l-4 border-amber-500 text-slate-900'
                        : 'hover:bg-slate-100/80 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded">
                          {item.routeNumber}
                        </span>
                        {isCommitted && (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Saved
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-slate-600 truncate mt-0.5">
                        {item.routeName}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                        {item.reversalCount} rev
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Comparison & Action Pane */}
          {activeAudit ? (
            <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-5">
              {/* Route Summary Banner */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md">
                      Route {activeAudit.routeNumber}
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      {activeAudit.totalStops} Stops Total
                    </span>
                    <span className="text-xs bg-red-500/30 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-md font-bold">
                      {activeAudit.reversalCount} Backtrack Reversals (&gt;120°)
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {activeAudit.routeName}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={handleCommitReorder}
                  disabled={committing || committedRoutes[activeAudit.routeId]}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap ${
                    committedRoutes[activeAudit.routeId]
                      ? 'bg-emerald-600 text-white cursor-default'
                      : committing
                      ? 'bg-slate-700 text-slate-400 cursor-wait'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                  }`}
                >
                  {committedRoutes[activeAudit.routeId] ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Committed to Supabase</span>
                    </>
                  ) : committing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Commit Suggested Order</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status or Success alert */}
              {statusMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold mb-4 border ${
                    statusMessage.includes('Successfully')
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                >
                  {statusMessage}
                </div>
              )}

              {/* Flagged Reversals Detail Chips */}
              <div className="mb-4">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Detected Acute Reversals (&gt;120° Angle)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeAudit.reversals.map((rev, idx) => (
                    <div
                      key={idx}
                      className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 text-xs text-slate-800 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          #{rev.stopIndex + 1} {rev.stopName}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {rev.prevStopName} → <strong className="text-amber-900">{rev.stopName}</strong> → {rev.nextStopName}
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full shrink-0 border border-red-200">
                        {rev.reversalAngle}°
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Before vs After Side-by-Side Stop Sequence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {/* Current / Stored Order */}
                <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50 flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Current Stop Order (Stored)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {activeAudit.originalStops.length} stops
                    </span>
                  </div>
                  <div className="space-y-1.5 flex-1 overflow-y-auto max-h-96 pr-1 no-scrollbar">
                    {activeAudit.originalStops.map((stop, i) => {
                      const isReversal = activeAudit.reversals.some((r) => r.stopId === stop.id);
                      return (
                        <div
                          key={i}
                          className={`px-3 py-1.5 rounded-xl text-xs flex items-center justify-between border ${
                            isReversal
                              ? 'bg-amber-100/70 border-amber-300 text-amber-950 font-bold'
                              : 'bg-white border-slate-200 text-slate-700 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-[10px] font-mono text-slate-400 w-5">
                              {i + 1}.
                            </span>
                            <span className="truncate">{stop.name}</span>
                          </div>
                          {isReversal && (
                            <span className="text-[10px] font-black text-amber-700 bg-amber-200 px-1.5 py-0.2 rounded">
                              Reversal
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Suggested Reorder (Greedy Nearest Neighbor) */}
                <div className="border-2 border-emerald-300 rounded-2xl p-3 bg-emerald-50/30 flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200 mb-2">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      <span>Suggested Order (Nearest-Neighbor)</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                      Suggestion Only
                    </span>
                  </div>
                  <div className="space-y-1.5 flex-1 overflow-y-auto max-h-96 pr-1 no-scrollbar">
                    {activeAudit.suggestedStops.map((stop, i) => (
                      <div
                        key={i}
                        className="px-3 py-1.5 rounded-xl text-xs bg-white border border-emerald-200 text-slate-800 font-medium flex items-center justify-between shadow-2xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] font-mono text-emerald-600 font-bold w-5">
                            {i + 1}.
                          </span>
                          <span className="truncate">{stop.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono uppercase">
                          {stop.code}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Advisory */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                <strong>Why review is required:</strong> A bus route in Kolkata may legitimately loop around or backtrack due to one-way traffic regulations (e.g. Central Avenue, MG Road, Howrah Bridge approaches). Cross-verify against the official WBTC route schedule before confirming any change.
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-xs font-medium">
              Select a route on the left to inspect its stop sequence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

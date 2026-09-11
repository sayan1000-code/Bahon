import React, { useState } from 'react';
import {
  Globe,
  MapPin,
  Bus,
  AlertTriangle,
  Send,
  ExternalLink,
  RotateCw,
  Clock,
  Users,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import {
  LiveBusFleetItem,
  SearchGroundingSource,
  MapsGroundingPlace,
} from '../hooks/useTransitIntelligence';
import { TransitAlertItem } from '../hooks/useFirebaseTransit';
import { Stop, WbtcBus } from '../types';

interface TransitIntelligenceSectionProps {
  currentStop: Stop;
  routeNumber?: string;
  liveFleet: LiveBusFleetItem[];
  wbtcFleet?: WbtcBus[];
  fleetLoading: boolean;
  onRefreshFleet: () => void;
  searchSummary: string;
  searchSources: SearchGroundingSource[];
  searchLoading: boolean;
  onRefreshSearch: () => void;
  mapsSummary: string;
  mapsPlaces: MapsGroundingPlace[];
  mapsLoading: boolean;
  onRefreshMaps: () => void;
  communityAlerts: TransitAlertItem[];
  onPostAlert: (stopId: string, routeNumber: string, message: string, severity: 'low' | 'medium' | 'high') => Promise<void>;
  isSignedIn: boolean;
  onSignIn: () => void;
}

export const TransitIntelligenceSection: React.FC<TransitIntelligenceSectionProps> = ({
  currentStop,
  routeNumber = '24A',
  liveFleet,
  wbtcFleet = [],
  fleetLoading,
  onRefreshFleet,
  searchSummary,
  searchSources,
  searchLoading,
  onRefreshSearch,
  mapsSummary,
  mapsPlaces,
  mapsLoading,
  onRefreshMaps,
  communityAlerts,
  onPostAlert,
  isSignedIn,
  onSignIn,
}) => {
  const [activeTab, setActiveTab] = useState<'grounding' | 'fleet' | 'alerts'>('grounding');
  const [fleetView, setFleetView] = useState<'wbtc' | 'all'>('wbtc');
  const [alertMsg, setAlertMsg] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [isPosting, setIsPosting] = useState(false);

  const handleSubmitAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertMsg.trim()) return;
    setIsPosting(true);
    try {
      await onPostAlert(currentStop.id, routeNumber, alertMsg.trim(), severity);
      setAlertMsg('');
    } catch (err: any) {
      // User cancellation or posting error handled gracefully
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="bg-white border-t border-slate-200 mt-2">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('grounding')}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'grounding'
              ? 'border-blue-600 text-blue-600 bg-white font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Live Insights</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fleet')}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'fleet'
              ? 'border-blue-600 text-blue-600 bg-white font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bus className="w-3.5 h-3.5" />
          <span>Real-time Fleet ({liveFleet.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'alerts'
              ? 'border-blue-600 text-blue-600 bg-white font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Alerts ({communityAlerts.length})</span>
        </button>
      </div>

      {/* Tab 1: Grounded Insights (Google Search & Google Maps Grounding) */}
      {activeTab === 'grounding' && (
        <div className="p-4 space-y-4 text-xs">
          {/* Google Search Grounding Box */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-blue-900 font-black">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Google Search Transit Grounding</span>
              </div>
              <button
                type="button"
                onClick={onRefreshSearch}
                disabled={searchLoading}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold text-[11px] cursor-pointer"
              >
                <RotateCw className={`w-3 h-3 ${searchLoading ? 'animate-spin' : ''}`} />
                <span>Update</span>
              </button>
            </div>

            {searchLoading ? (
              <div className="py-3 flex items-center justify-center text-slate-400 gap-2">
                <RotateCw className="w-4 h-4 animate-spin text-blue-500" />
                <span>Retrieving live web traffic & transit news...</span>
              </div>
            ) : (
              <>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {searchSummary || 'Searching for real-time traffic corridor advisories...'}
                </p>

                {searchSources.length > 0 && (
                  <div className="pt-2 border-t border-blue-100 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">
                      Verified Web Citations:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {searchSources.map((source, idx) => (
                        <a
                          key={source.uri || `search-source-${idx}`}
                          href={source.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-bold hover:bg-blue-100 transition-colors"
                        >
                          <span className="truncate max-w-[180px]">{source.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Google Maps Grounding Box */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-950 font-black">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Google Maps Location Grounding</span>
              </div>
              <button
                type="button"
                onClick={onRefreshMaps}
                disabled={mapsLoading}
                className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-bold text-[11px] cursor-pointer"
              >
                <RotateCw className={`w-3 h-3 ${mapsLoading ? 'animate-spin' : ''}`} />
                <span>Verify</span>
              </button>
            </div>

            {mapsLoading ? (
              <div className="py-3 flex items-center justify-center text-slate-400 gap-2">
                <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Grounding terminal location and amenities...</span>
              </div>
            ) : (
              <>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {mapsSummary || `Station facilities verified at ${currentStop.name}.`}
                </p>

                {mapsPlaces.length > 0 && (
                  <div className="pt-2 border-t border-emerald-100 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                      Direct Google Maps Places & Reviews:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {mapsPlaces.map((place, idx) => (
                        <a
                          key={place.uri || `map-place-${idx}`}
                          href={place.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                        >
                          <Compass className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{place.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Live Network Fleet & Schedules */}
      {activeTab === 'fleet' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              WBTC Real-Time Automated Vehicle Location (AVL)
            </span>
            <button
              type="button"
              onClick={onRefreshFleet}
              className="text-blue-600 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <RotateCw className={`w-3 h-3 ${fleetLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* WBTC Fleet Switcher */}
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setFleetView('wbtc')}
              className={`flex-1 py-1 px-2 rounded-lg text-center transition-colors cursor-pointer ${
                fleetView === 'wbtc' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              WBTC Smart Fleet ({wbtcFleet.length})
            </button>
            <button
              type="button"
              onClick={() => setFleetView('all')}
              className={`flex-1 py-1 px-2 rounded-lg text-center transition-colors cursor-pointer ${
                fleetView === 'all' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Route Dispatches ({liveFleet.length})
            </button>
          </div>

          <div className="space-y-2">
            {fleetView === 'wbtc' ? (
              wbtcFleet.map((bus, idx) => (
                <div
                  key={bus.busId || `wbtc-bus-${idx}`}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-start hover:bg-slate-100 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-900 text-amber-300 font-black text-xs px-2 py-0.5 rounded">
                        {bus.routeNumber}
                      </span>
                      <span className="font-bold text-slate-800 text-xs truncate max-w-[170px]">
                        {bus.routeName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 font-semibold flex items-center gap-1">
                      <Compass className="w-3 h-3 text-blue-600 flex-shrink-0" />
                      <span className="text-blue-950 font-bold">{bus.currentRoad}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-2">
                      <span>Depot: <strong>{bus.depot}</strong></span>
                      <span>• {bus.busType}</span>
                      <span>• Reg: {bus.registration || bus.busId}</span>
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-black text-emerald-600">
                      {bus.speedKmh} km/h
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded block mt-1">
                      {bus.occupancy}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              liveFleet.map((bus, idx) => (
                <div
                  key={bus.id || `live-bus-${idx}`}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-900 text-amber-300 font-black text-xs px-2 py-0.5 rounded">
                        {bus.routeNumber}
                      </span>
                      <span className="font-bold text-slate-800 text-xs truncate max-w-[170px]">
                        {bus.routeName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                      <span>Next: <strong>{bus.nextStop}</strong></span>
                      <span>• {bus.speedKmh} km/h</span>
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-black text-blue-600">
                      ~{bus.etaMinutes}m
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                      {bus.crowdStatus.split(' ')[0]}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Community Transit Alerts (Firestore Persisted) */}
      {activeTab === 'alerts' && (
        <div className="p-4 space-y-3">
          {/* Post Alert Box */}
          {isSignedIn ? (
            <form onSubmit={handleSubmitAlert} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Report Delay or Station Update
                </span>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="bg-white border border-slate-300 rounded px-2 py-0.5 text-[10px] font-bold"
                >
                  <option value="low">Low Impact</option>
                  <option value="medium">Moderate Delay</option>
                  <option value="high">Major Blockage</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={alertMsg}
                  onChange={(e) => setAlertMsg(e.target.value)}
                  placeholder={`e.g. Platform 4 crowded, route ${routeNumber} delayed 5m`}
                  maxLength={150}
                  className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-blue-600 text-slate-800"
                />
                <button
                  type="submit"
                  disabled={isPosting || !alertMsg.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  <span>Post</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Sign in with Google to submit verified live transit alerts.</span>
              </div>
              <button
                type="button"
                onClick={onSignIn}
                className="bg-amber-500 hover:bg-amber-600 text-white font-black px-2.5 py-1 rounded-lg text-xs cursor-pointer"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Alerts List */}
          <div className="space-y-2">
            {communityAlerts.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-4">
                No active commuter delay alerts reported for this area.
              </p>
            ) : (
              communityAlerts.map((alert, idx) => (
                <div
                  key={alert.id || `alert-${idx}`}
                  className="bg-white border border-slate-200 rounded-xl p-3 space-y-1 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          alert.severity === 'high'
                            ? 'bg-rose-500'
                            : alert.severity === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <span>{alert.userName}</span>
                      <span className="text-slate-400 font-normal">
                        ({alert.routeNumber ? `Route ${alert.routeNumber}` : 'General'})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">{alert.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

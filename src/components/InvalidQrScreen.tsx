import React from 'react';
import { QrCode, AlertCircle, Sparkles, MapPin, ExternalLink } from 'lucide-react';
import { Stop } from '../types';
import { STOPS } from '../data/transitData';

interface InvalidQrScreenProps {
  stops?: Stop[];
  onOpenQrGenerator?: () => void;
  onSelectTestStop?: (stopId: string) => void;
  invalidParam?: string | null;
}

export const InvalidQrScreen: React.FC<InvalidQrScreenProps> = ({
  stops = STOPS,
  onOpenQrGenerator,
  onSelectTestStop,
  invalidParam,
}) => {
  const stopList = stops && stops.length > 0 ? stops : STOPS;

  // Quick starter hubs for demo testing
  const POPULAR_HUBS = [
    { label: 'Ruby General Hospital', id: 'ruby_general_hospital', alias: 'ruby' },
    { label: 'Howrah Station (Bay 4)', id: 'howrah', alias: 'howrah' },
    { label: 'Salt Lake Sector V', id: 'sector-v', alias: 'sector-v' },
    { label: 'Esplanade (Curzon Park)', id: 'esplanade', alias: 'esplanade' },
    { label: 'Park Street', id: 'park-street', alias: 'park-street' },
    { label: 'B.B.D. Bagh East', id: 'bbd-bagh', alias: 'bbd' },
  ];

  const handleSelectHub = (hubId: string) => {
    if (onSelectTestStop) {
      onSelectTestStop(hubId);
    } else {
      window.location.href = `/?stop=${encodeURIComponent(hubId)}`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6 text-center">
        {/* Bahon Logo Header */}
        <div className="flex items-center justify-center gap-2.5">
          <img src="/bahon-logo.png" alt="Bahon Logo" className="w-10 h-10 object-contain drop-shadow-md" />
          <span className="text-2xl font-black tracking-tight text-white">Bahon</span>
        </div>

        {/* Invalid/Missing QR Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {/* Animated QR Icon Badge */}
          <div className="relative inline-flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <QrCode className="w-10 h-10" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
              <AlertCircle className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {invalidParam ? 'Invalid Station QR Code' : 'Scan a Stop QR Code'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              {invalidParam ? (
                <>
                  The scanned parameter <code className="text-amber-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs">{invalidParam}</code> does not match any registered Kolkata bus stop.
                </>
              ) : (
                'Bahon automatically locks your starting origin via physical QR codes installed at Kolkata bus stops. Please scan the QR code at your station platform to begin.'
              )}
            </p>
          </div>

          {/* Developer / Demo Quick Select */}
          <div className="pt-2 border-t border-slate-800/80 text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Select Stop to Test Demo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {POPULAR_HUBS.map((hub) => (
                <button
                  key={hub.id}
                  type="button"
                  onClick={() => handleSelectHub(hub.id)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-blue-600/30 hover:border-blue-500/40 border border-slate-700/60 text-xs font-semibold text-slate-200 hover:text-white transition-all text-left truncate flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{hub.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action: Open Dev QR Generator */}
          {onOpenQrGenerator && (
            <button
              type="button"
              onClick={onOpenQrGenerator}
              className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/25"
            >
              <QrCode className="w-4 h-4" />
              Open Stop QR Generator Tool
            </button>
          )}
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-slate-500">
          West Bengal Transport Corporation (WBTC) • Intelligent Commuter Network
        </p>
      </div>
    </div>
  );
};

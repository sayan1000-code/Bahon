import fs from 'fs';

const qrLoadingScreen = `import React, { useEffect, useState } from 'react';

interface QrLoadingScreenProps {
  stopName?: string;
  onLoaded: () => void;
}

export const QrLoadingScreen: React.FC<QrLoadingScreenProps> = ({
  stopName,
  onLoaded,
}) => {
  const [progress, setProgress] = useState<number>(5);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 1400;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          onLoaded();
        }, 150);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [onLoaded]);

  return (
    <div
      id="qr-loading-screen"
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-white select-none animate-in fade-in duration-200"
    >
      <div className="flex flex-col items-center max-w-xs w-full text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white/10 backdrop-blur-md p-3 flex items-center justify-center shadow-2xl border border-white/20">
            <img
              src="/bahon-logo.png"
              alt="Bahon Logo"
              className="w-full h-full object-contain filter drop-shadow-md"
            />
          </div>
          <div className="absolute -inset-2 rounded-[28px] border border-blue-500/30 animate-ping pointer-events-none" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1">
          Bahon
        </h1>
        <p className="text-xs font-semibold tracking-wider uppercase text-blue-400 mb-8">
          Smart City Bus Transit
        </p>

        <div className="w-48 sm:w-56 h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3 border border-slate-700/60 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-emerald-400 to-blue-400 rounded-full transition-all duration-75 ease-out shadow-sm"
            style={{ width: progress + '%' }}
          />
        </div>

        <div className="text-[11px] font-medium text-slate-400">
          {stopName ? (
            <span>Connecting to <strong className="text-slate-200 font-bold">{stopName}</strong>...</span>
          ) : (
            <span>Resolving bus stop from QR...</span>
          )}
        </div>
      </div>
    </div>
  );
};
`;

const boardingDetailModal = `import React from 'react';
import { X, Bus, MapPin, IndianRupee, Clock } from 'lucide-react';
import { Stop } from '../types';

export interface BoardingModalData {
  busId: string;
  routeId: string;
  routeNumber: string;
  routeColor: string;
  busType: string;
  licensePlate?: string;
  originStop: Stop;
  nextStopName?: string;
  destinationStopName: string;
  destinationStopId: string;
  fare: number;
  etaMinutes: number;
}

interface BoardingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: BoardingModalData | null;
  onConfirmBoarding: (data: BoardingModalData) => void;
}

export const BoardingDetailModal: React.FC<BoardingDetailModalProps> = ({
  isOpen,
  onClose,
  data,
  onConfirmBoarding,
}) => {
  if (!isOpen || !data) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-[430px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: data.routeColor || '#2563eb' }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black shadow-md"
            >
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white leading-none">
                  {data.routeNumber}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AT PLATFORM
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {data.licensePlate || 'Live GPS Bus'} · {data.busType}
              </div>
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

        <div className="p-5 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <div className="text-xs text-emerald-950">
              <strong className="font-bold block text-emerald-900">Bus has arrived at your stop</strong>
              Doors open for boarding at {data.originStop.name}.
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center mt-1">
                <div className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                <div className="w-0.5 h-8 bg-slate-300 my-0.5" />
                <div className="w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
              </div>

              <div className="flex-1 space-y-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Boarding Origin</div>
                  <div className="font-bold text-slate-900 text-sm">{data.originStop.name}</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Final Destination</div>
                  <div className="font-bold text-slate-900 text-sm">{data.destinationStopName}</div>
                </div>
              </div>
            </div>

            {data.nextStopName && (
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                <span className="text-slate-500">Next stop after departure:</span>
                <span className="font-bold text-slate-800">{data.nextStopName}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-center gap-1">
                <IndianRupee className="w-3 h-3" />
                <span>Ticket Fare</span>
              </div>
              <div className="text-xl font-black text-slate-900 mt-0.5">₹{data.fare}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Wait Status</span>
              </div>
              <div className="text-xl font-black text-emerald-600 mt-0.5">Board Now</div>
            </div>
          </div>

          <button
            id="confirm-boarded-button"
            type="button"
            onClick={() => onConfirmBoarding(data)}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 cursor-pointer transition-all"
          >
            <Bus className="w-5 h-5 stroke-[2.5]" />
            <span>I am on the bus</span>
          </button>

          <p className="text-[11px] text-center text-slate-400">
            Confirming starts your live trip tracking and destination arrival alerts
          </p>
        </div>
      </div>
    </div>
  );
};
`;

const postBoardingSignInBanner = `import React from 'react';
import { Sparkles, LogIn, X } from 'lucide-react';

interface PostBoardingSignInBannerProps {
  onSignIn: () => void;
  onDismiss: () => void;
}

export const PostBoardingSignInBanner: React.FC<PostBoardingSignInBannerProps> = ({
  onSignIn,
  onDismiss,
}) => {
  return (
    <div
      id="post-boarding-signin-banner"
      className="mx-3 sm:mx-4 mt-2 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-3.5 shadow-lg border border-blue-700/50 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300 relative z-30"
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-blue-500/30 border border-blue-400/40 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-amber-300" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs sm:text-[13px] font-bold text-white leading-tight">
            Sign in to enable extra features
          </h4>
          <p className="text-[10.5px] text-blue-200 mt-0.5 leading-snug">
            Unlock the Mini Map widget, 5-minute arrival chime, and trip feedback.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          id="banner-signin-button"
          type="button"
          onClick={onSignIn}
          className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-900 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          title="Dismiss banner"
          className="w-7 h-7 rounded-lg hover:bg-white/10 text-blue-200 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
`;

const arrivalAlertBanner = `import React, { useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';

interface ArrivalAlertBannerProps {
  etaMinutes: number;
  destinationName: string;
  onDismiss?: () => void;
}

export const ArrivalAlertBanner: React.FC<ArrivalAlertBannerProps> = ({
  etaMinutes,
  destinationName,
  onDismiss,
}) => {
  const hasChimedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!hasChimedRef.current && etaMinutes <= 5 && etaMinutes > 0) {
      hasChimedRef.current = true;
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);

          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + 0.65);
        }
      } catch (err) {
        console.warn('[ArrivalAlertBanner] Audio chime playback error:', err);
      }
    }
  }, [etaMinutes]);

  return (
    <div
      id="arrival-alert-banner"
      className="mx-3 sm:mx-4 mt-2 bg-amber-500 text-slate-950 rounded-2xl p-3 shadow-lg border border-amber-600 flex items-center justify-between gap-3 z-30"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
            <span>Arrival Alert</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-ping" />
          </div>
          <div className="text-xs font-bold leading-tight truncate">
            {etaMinutes <= 1 ? (
              <span>Arriving at {destinationName} now! Prepare to deboard.</span>
            ) : (
              <span>~{Math.round(etaMinutes)} min to {destinationName} — Get ready!</span>
            )}
          </div>
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="w-6 h-6 rounded-md hover:bg-black/10 flex items-center justify-center cursor-pointer text-slate-900"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
`;

const rideFeedbackModal = `import React, { useState } from 'react';
import { Star, CheckCircle, Bus, HeartHandshake, Clock, X } from 'lucide-react';

interface RideFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    busMaintenanceRating: number;
    driverConductorRating: number;
    reachedOnTime: boolean;
    comments?: string;
  }) => void;
  tripInfo?: {
    routeNumber: string;
    originName: string;
    destinationName: string;
  } | null;
}

export const RideFeedbackModal: React.FC<RideFeedbackModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  tripInfo,
}) => {
  const [busMaintenance, setBusMaintenance] = useState<number>(5);
  const [driverConductor, setDriverConductor] = useState<number>(5);
  const [reachedOnTime, setReachedOnTime] = useState<boolean>(true);
  const [comments, setComments] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    onSubmit({
      busMaintenanceRating: busMaintenance,
      driverConductorRating: driverConductor,
      reachedOnTime,
      comments: comments.trim() || undefined,
    });
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1200);
  };

  const renderStarRating = (
    value: number,
    onChange: (val: number) => void,
    idPrefix: string
  ) => {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            id={idPrefix + '-star-' + star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 cursor-pointer transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              className={'w-6 h-6 ' + (star <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-300')}
            />
          </button>
        ))}
        <span className="text-xs font-bold text-slate-500 ml-2">
          {value}/5
        </span>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Trip Completed</h3>
              <p className="text-[11px] text-slate-400">
                {tripInfo ? tripInfo.routeNumber + ' to ' + tripInfo.destinationName : 'Arrived at Destination'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Thank You!</h4>
            <p className="text-xs text-slate-500">
              Your ride feedback has been saved and will help improve Kolkata bus transit.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="text-xs text-slate-600 font-medium leading-relaxed">
              How was your journey today? Please rate your experience:
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Bus className="w-3.5 h-3.5 text-blue-600" />
                <span>1. Bus maintenance & cleanliness</span>
              </label>
              {renderStarRating(busMaintenance, setBusMaintenance, 'maintenance')}
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. Driver and conductor behaviour</span>
              </label>
              {renderStarRating(driverConductor, setDriverConductor, 'behaviour')}
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>3. Reached on time?</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="on-time-yes"
                  onClick={() => setReachedOnTime(true)}
                  className={'py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ' + (reachedOnTime ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100')}
                >
                  ✓ Yes, On Time
                </button>
                <button
                  type="button"
                  id="on-time-no"
                  onClick={() => setReachedOnTime(false)}
                  className={'py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ' + (!reachedOnTime ? 'bg-rose-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100')}
                >
                  ✗ Delayed
                </button>
              </div>
            </div>

            <div>
              <input
                type="text"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Additional comments (optional)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 text-slate-800 placeholder-slate-400"
              />
            </div>

            <button
              id="submit-feedback-button"
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs sm:text-sm cursor-pointer shadow-md transition-colors"
            >
              Submit Feedback
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
`;

const boardedMiniMap = `import React, { useEffect, useRef } from 'react';
import { Maximize2, Navigation, Clock, MapPin } from 'lucide-react';
import L from 'leaflet';
import { Stop } from '../types';

interface BoardedMiniMapWidgetProps {
  busPosition: [number, number] | null;
  bearing?: number;
  routeNumber: string;
  routeColor?: string;
  nextStopName?: string;
  destinationStop: Stop | null;
  etaMinutes: number;
  speedKmh?: number;
  onExpandMap: () => void;
}

export const BoardedMiniMapWidget: React.FC<BoardedMiniMapWidgetProps> = ({
  busPosition,
  routeNumber,
  routeColor = '#2563eb',
  nextStopName,
  destinationStop,
  etaMinutes,
  speedKmh = 32,
  onExpandMap,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialPos = busPosition || [22.5855, 88.3626];
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        dragging: false,
        keyboard: false,
      }).setView(initialPos, 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      const busIcon = L.divIcon({
        className: 'boarded-mini-bus-marker',
        html: '<div style=\"background-color: ' + routeColor + ';\" class=\"w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-black\">' + routeNumber + '</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      busMarkerRef.current = L.marker(initialPos, { icon: busIcon }).addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !busPosition) return;
    const map = mapInstanceRef.current;

    if (busMarkerRef.current) {
      busMarkerRef.current.setLatLng(busPosition);
    }
    map.panTo(busPosition, { animate: true, duration: 0.8 });
  }, [busPosition]);

  return (
    <div
      id="boarded-mini-map-widget"
      className="mx-3 sm:mx-4 mt-2.5 bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-200 relative z-30 flex flex-col"
    >
      <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            style={{ backgroundColor: routeColor }}
            className="w-6 h-6 rounded-lg text-white font-black text-[11px] flex items-center justify-center"
          >
            {routeNumber}
          </span>
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>On Board</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <Clock className="w-3 h-3" />
            <span>~{Math.round(etaMinutes)} MIN TO DEST</span>
          </div>

          <button
            type="button"
            onClick={onExpandMap}
            title="Expand Full Map"
            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="relative w-full h-[120px] bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full" />

        <div className="absolute bottom-2 left-2 z-30 bg-slate-900/85 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1">
          <Navigation className="w-2.5 h-2.5 text-blue-400" />
          <span>{speedKmh} km/h</span>
        </div>

        {destinationStop && (
          <div className="absolute bottom-2 right-2 z-30 bg-white/90 backdrop-blur-xs text-slate-800 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 shadow-xs border border-slate-200">
            <MapPin className="w-2.5 h-2.5 text-emerald-600" />
            <span className="truncate max-w-[130px]">{destinationStop.name}</span>
          </div>
        )}
      </div>

      {nextStopName && (
        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
          <span className="text-slate-400">Next stop:</span>
          <span className="font-bold text-slate-800 truncate ml-2">{nextStopName}</span>
        </div>
      )}
    </div>
  );
};
`;

fs.writeFileSync('src/components/QrLoadingScreen.tsx', qrLoadingScreen, 'utf8');
fs.writeFileSync('src/components/BoardingDetailModal.tsx', boardingDetailModal, 'utf8');
fs.writeFileSync('src/components/PostBoardingSignInBanner.tsx', postBoardingSignInBanner, 'utf8');
fs.writeFileSync('src/components/ArrivalAlertBanner.tsx', arrivalAlertBanner, 'utf8');
fs.writeFileSync('src/components/RideFeedbackModal.tsx', rideFeedbackModal, 'utf8');
fs.writeFileSync('src/components/BoardedMiniMapWidget.tsx', boardedMiniMap, 'utf8');

console.log('All 6 components written successfully with exact syntax and quotes!');

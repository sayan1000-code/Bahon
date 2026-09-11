import React, { useEffect, useRef } from 'react';
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

import React, { useEffect, useState } from 'react';

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

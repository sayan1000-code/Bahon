import React, { useMemo } from 'react';
import { X, QrCode, ExternalLink, CheckCircle2, Smartphone } from 'lucide-react';
import { Stop } from '../types';
import { STOPS } from '../data/transitData';

interface QrScanSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStop: Stop;
  onSelectStop: (stop: Stop) => void;
  stops?: Stop[];
}

export const QrScanSimulatorModal: React.FC<QrScanSimulatorModalProps> = ({
  isOpen,
  onClose,
  currentStop,
  onSelectStop,
  stops,
}) => {
  const sortedStops = useMemo(() => {
    const list = stops && stops.length > 0 ? stops : STOPS;
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }, [stops]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-4 border-slate-900">
        {/* Header */}
        <div className="bg-blue-600 text-white p-5 flex items-center justify-between border-b border-blue-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center font-black border border-white/30">
              <QrCode className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 id="qr-modal-title" className="text-lg font-black text-white">
                Physical Stop QR Scanner
              </h2>
              <p className="text-xs text-blue-100">
                Simulate commuter scanning bus stop pole QR
              </p>
            </div>
          </div>
          <button
            id="close-qr-modal-btn"
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-blue-700/60 hover:bg-blue-700 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 max-h-[75vh] overflow-y-auto space-y-4">
          <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3.5 flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700">
              <strong className="font-black block text-sm text-slate-900 mb-0.5">How Smart QR Stops Work:</strong>
              Each physical pole at city bus stops displays an engraved QR code linking directly to{' '}
              <code className="bg-blue-100 font-mono px-1 rounded font-bold text-blue-800">
                /stop/[stop-id]
              </code>
              . The app automatically recognizes where you are without any app install or account login.
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Select a Bus Stop to simulate scan:
            </div>

            {sortedStops.map((stop) => {
              const isCurrent = stop.id === currentStop.id;
              const simulatedUrl = `/stop/${stop.id}`;

              return (
                <div
                  key={stop.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-blue-50/70 text-slate-900 border-blue-400 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900">{stop.name}</span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isCurrent
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {stop.code}
                      </span>
                    </div>
                    <div className="text-xs mt-0.5 truncate text-slate-400">
                      URL: <span className="font-mono text-slate-600">{simulatedUrl}</span>
                    </div>
                  </div>

                  <button
                    id={`simulate-scan-btn-${stop.id}`}
                    type="button"
                    onClick={() => {
                      onSelectStop(stop);
                      onClose();
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {isCurrent ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Scan</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-sm cursor-pointer transition-colors"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};

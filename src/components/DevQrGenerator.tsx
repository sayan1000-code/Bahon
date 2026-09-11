import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import { Stop } from '../types';
import { STOPS } from '../data/transitData';
import { QrCode, Download, ExternalLink, Copy, Check, ArrowLeft, Search, Sparkles, MapPin } from 'lucide-react';

interface DevQrGeneratorProps {
  stops?: Stop[];
  initialStopId?: string;
  onSelectStop?: (stop: Stop) => void;
  onClose?: () => void;
}

export const DevQrGenerator: React.FC<DevQrGeneratorProps> = ({
  stops = STOPS,
  initialStopId,
  onSelectStop,
  onClose,
}) => {
  const stopList = stops && stops.length > 0 ? stops : STOPS;

  // Selected stop for QR generation
  const [selectedStopId, setSelectedStopId] = useState<string>(() => {
    if (initialStopId) {
      const match = stopList.find((s) => s.id === initialStopId);
      if (match) return match.id;
    }
    const rubyStop = stopList.find((s) => s.id.includes('ruby') || s.name.toLowerCase().includes('ruby'));
    return rubyStop?.id || stopList[0]?.id || 'ruby_general_hospital';
  });

  const [searchFilter, setSearchFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selectedStop = useMemo(() => {
    return stopList.find((s) => s.id === selectedStopId) || stopList[0];
  }, [selectedStopId, stopList]);

  // Formatted stop_id (lowercase, underscores) for clean QR encoding
  const formattedStopId = useMemo(() => {
    if (!selectedStop) return 'howrah';
    return selectedStop.id.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }, [selectedStop]);

  // Origin URL for the QR code
  const originBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://bahon.app';
  const qrTargetUrl = `${originBaseUrl}/?stop=${encodeURIComponent(formattedStopId)}`;

  // Filter stops by name, id, or road corridor
  const filteredStops = useMemo(() => {
    if (!searchFilter.trim()) return stopList;
    const q = searchFilter.toLowerCase().trim();
    return stopList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.road_corridor && s.road_corridor.toLowerCase().includes(q))
    );
  }, [stopList, searchFilter]);

  // Generate QR Code on canvas
  useEffect(() => {
    if (!canvasRef.current || !qrTargetUrl) return;

    QRCode.toCanvas(
      canvasRef.current,
      qrTargetUrl,
      {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a', // Slate 900
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      (error) => {
        if (error) {
          console.error('[QRCode Generator Error]:', error);
        } else if (canvasRef.current) {
          setQrDataUrl(canvasRef.current.toDataURL('image/png'));
        }
      }
    );
  }, [qrTargetUrl]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrTargetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is unavailable
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `bahon-qr-${formattedStopId}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleOpenLiveApp = () => {
    if (onSelectStop && selectedStop) {
      onSelectStop(selectedStop);
    } else {
      window.location.href = `/?stop=${encodeURIComponent(formattedStopId)}`;
    }
  };

  // Popular quick demo stops
  const POPULAR_DEMO_STOPS = [
    { label: 'Ruby Hospital', idFragment: 'ruby' },
    { label: 'Howrah Station', idFragment: 'howrah' },
    { label: 'Esplanade', idFragment: 'esplanade' },
    { label: 'Sector V', idFragment: 'sector-v' },
    { label: 'Park Street', idFragment: 'park-street' },
    { label: 'Airport Gate 1', idFragment: 'airport' },
    { label: 'B.B.D. Bagh', idFragment: 'bbd' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Bahon Stop QR Code Generator
              <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Dev & Field Demo
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Generate and print physical scannable QR codes for Kolkata bus stops & stations
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
        {/* Left Column: Stop Selector & Presets */}
        <div className="lg:col-span-6 space-y-4">
          {/* Quick Presets */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Quick Demo Presets
            </h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_DEMO_STOPS.map((preset) => {
                const found = stopList.find(
                  (s) => s.id.toLowerCase().includes(preset.idFragment) || s.name.toLowerCase().includes(preset.idFragment)
                );
                if (!found) return null;
                const isSelected = selectedStopId === found.id;
                return (
                  <button
                    key={preset.idFragment}
                    type="button"
                    onClick={() => setSelectedStopId(found.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Searchable Stop List */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Select Kolkata Stop ({stopList.length} total)
              </h3>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search by stop name, ID, or corridor..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
              {filteredStops.map((stop) => {
                const isSelected = selectedStopId === stop.id;
                return (
                  <button
                    key={stop.id}
                    type="button"
                    onClick={() => setSelectedStopId(stop.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300 font-bold'
                        : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-100 truncate">{stop.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        ID: <span className="font-mono text-slate-300">{stop.id}</span>
                        {stop.road_corridor && ` • ${stop.road_corridor}`}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Scannable QR Code Card */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-xl">
            {/* Signage Header for Print */}
            <div className="mb-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-blue-400">
                Bahon Smart Transit Station QR
              </div>
              <h2 className="text-xl font-black text-white mt-0.5">{selectedStop.name}</h2>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                stop_id: <span className="text-slate-200">{formattedStopId}</span>
              </div>
            </div>

            {/* QR Canvas Display */}
            <div className="inline-block bg-white p-4 rounded-3xl shadow-2xl border-4 border-blue-500/20 my-2">
              <canvas ref={canvasRef} className="rounded-xl w-64 h-64 mx-auto" />
            </div>

            {/* Target URL string */}
            <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-2 text-left">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Encoded Scan URL
                </div>
                <div className="text-xs font-mono text-blue-300 truncate">{qrTargetUrl}</div>
              </div>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 cursor-pointer transition-colors"
                title="Copy URL"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                type="button"
                onClick={handleDownload}
                className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4 text-blue-400" />
                Download PNG
              </button>

              <button
                type="button"
                onClick={handleOpenLiveApp}
                className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/30"
              >
                <ExternalLink className="w-4 h-4" />
                Test Live in App
              </button>
            </div>
          </div>

          {/* Instructions note */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 text-xs text-slate-400 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">How physical QR locking works:</span> Scanning this QR on a mobile camera immediately opens Bahon with <strong className="text-white">{selectedStop.name}</strong> permanently locked as the origin stop. Commuters directly search their destination without manual origin selection.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

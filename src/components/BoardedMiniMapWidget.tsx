import React, { useEffect, useRef } from 'react';
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
        html: '<div style="background-color: ' + routeColor + ';" class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-black">' + routeNumber + '</div>',
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

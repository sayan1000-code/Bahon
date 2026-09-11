import React from 'react';
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

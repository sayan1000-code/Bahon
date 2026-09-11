import React, { useState } from 'react';
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
    // App.tsx will close the modal after 2.2s and handle navigation.
    // No timeout here — we just stay on the thank-you screen.
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
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-9 h-9" />
            </div>
            <h4 className="text-lg font-black text-slate-900">Thank you for a safe journey!</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your feedback has been saved and will help improve Kolkata's bus transit for everyone.
            </p>
            <p className="text-[10px] text-slate-400 animate-pulse">Returning to home stop…</p>
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

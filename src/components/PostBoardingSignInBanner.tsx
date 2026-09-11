import React from 'react';
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
            Unlock the 5-minute arrival chime, live journey alerts, and trip feedback.
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

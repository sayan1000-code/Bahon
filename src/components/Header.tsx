import React, { useState } from 'react';
import { MapPin, QrCode, ArrowRightLeft, Radio, Star, LogIn, LogOut, User as UserIcon, Sun, Moon } from 'lucide-react';
import { Stop } from '../types';
import { STOPS } from '../data/transitData';
import { User } from 'firebase/auth';

interface HeaderProps {
  currentStop: Stop;
  onSelectStop: (stop: Stop) => void;
  onOpenQrSimulator: () => void;
  currentUser: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  favoriteStopIds: string[];
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  stops?: Stop[];
}

export const Header: React.FC<HeaderProps> = ({
  currentStop,
  onSelectStop,
  onOpenQrSimulator,
  currentUser,
  onSignIn,
  onSignOut,
  isFavorited,
  onToggleFavorite,
  favoriteStopIds,
  isDarkMode = false,
  onToggleDarkMode,
  stops,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const stopList = stops && stops.length > 0 ? stops : STOPS;

  return (
    <header className={`${isDarkMode ? 'bg-slate-900 border-b border-slate-800 text-slate-100' : 'bg-blue-600 text-white'} p-5 sm:p-6 shadow-lg relative transition-colors duration-200`}>
      {/* Top Utility Row */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${isDarkMode ? 'bg-slate-800 text-amber-400 border border-slate-700' : 'bg-white/20 backdrop-blur-xs text-white border border-white/30'} flex items-center justify-center font-black text-xs tracking-wider`}>
            CITY
          </div>
          <div className={`text-[11px] uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-blue-100'} font-bold flex items-center gap-1.5 opacity-90`}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Smart Transit
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark / Light Night Mode Toggle */}
          {onToggleDarkMode && (
            <button
              id="theme-toggle-button"
              type="button"
              onClick={onToggleDarkMode}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to outdoor night mode'}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to outdoor night mode'}
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                isDarkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                  : 'bg-blue-700/70 hover:bg-blue-700 text-blue-100 border border-blue-400/50'
              } text-xs font-bold transition-all shadow-sm cursor-pointer`}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-300" />
              ) : (
                <Moon className="w-4 h-4 text-blue-100" />
              )}
            </button>
          )}

          {/* QR Simulator trigger */}
          <button
            id="qr-simulator-button"
            type="button"
            onClick={onOpenQrSimulator}
            aria-label="Simulate scanning different stop QR code"
            className={`flex items-center gap-1.5 ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                : 'bg-blue-700/70 hover:bg-blue-700 active:bg-blue-800 text-white border border-blue-400/50'
            } px-2.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer`}
          >
            <QrCode className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden xs:inline">QR Scan</span>
          </button>

          {/* Firebase Auth Google Sign-in / Profile */}
          {currentUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/30 rounded-full p-1 text-xs cursor-pointer transition-colors"
                title={currentUser.email || 'User Account'}
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-6 h-6 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-bold flex items-center justify-center text-[10px]">
                    {currentUser.displayName?.[0] || 'U'}
                  </div>
                )}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-9 w-48 bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs animate-in fade-in">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-bold truncate">{currentUser.displayName || 'Commuter'}</p>
                    <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold flex items-center gap-2 mt-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="flex items-center gap-1 bg-white text-blue-700 hover:bg-blue-50 font-black text-xs px-3 py-1.5 rounded-full shadow-sm cursor-pointer transition-colors"
            >
              <LogIn className="w-3 h-3 text-blue-600" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Sleek Current Stop Banner */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-blue-100 font-bold opacity-80 flex items-center gap-1.5 mb-1">
            <Radio className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
            Current Stop
          </p>
          <div className="flex items-center gap-2">
            <h1
              id="current-stop-title"
              className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight"
            >
              {currentStop.name}
            </h1>
            <button
              type="button"
              onClick={onToggleFavorite}
              title={isFavorited ? 'Remove from favorites' : 'Save stop to favorites'}
              className={`p-1.5 rounded-full transition-transform active:scale-90 cursor-pointer ${
                isFavorited
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-blue-700/70 text-white/80 hover:text-amber-300 hover:bg-blue-700'
              }`}
            >
              <Star className={`w-4 h-4 ${isFavorited ? 'fill-slate-950' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-blue-100/90 font-medium mt-1">
            {currentStop.platform} • <span className="font-mono text-[11px] font-bold bg-blue-700/60 px-1.5 py-0.5 rounded">{currentStop.code}</span>
          </p>
        </div>

        <div className="bg-blue-500/90 text-white p-3 rounded-2xl shadow-inner border border-blue-400/40 flex-shrink-0 ml-2">
          <MapPin className="w-6 h-6 stroke-[2.5]" />
        </div>
      </div>

      {/* Sleek Stop Switcher Pills */}
      <div className={`mt-4 pt-3 border-t ${isDarkMode ? 'border-slate-800' : 'border-blue-500/50'} flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar`}>
        <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-blue-200'} font-bold uppercase tracking-wider whitespace-nowrap flex items-center gap-1 mr-1`}>
          <ArrowRightLeft className="w-3 h-3" /> Stop:
        </span>
        {stopList.map((stop) => {
          const isSelected = stop.id === currentStop.id;
          const isFav = favoriteStopIds.includes(stop.id);
          return (
            <button
              key={stop.id}
              id={`switch-to-stop-${stop.id}`}
              type="button"
              onClick={() => onSelectStop(stop)}
              className={`px-3 py-1 rounded-full font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                isSelected
                  ? isDarkMode
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                    : 'bg-white text-blue-600 font-black shadow-md'
                  : isDarkMode
                  ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'
                  : 'bg-blue-700/60 text-blue-100 border border-blue-400/30 hover:bg-blue-700 hover:text-white'
              }`}
            >
              {isFav && <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />}
              <span>{stop.name}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};


import React, { useState, useRef, useEffect, useMemo } from 'react';
import { QrCode, Check, Search, X, MapPin, Sliders } from 'lucide-react';
import { Stop } from '../types';
import { STOPS } from '../data/transitData';
import {
  buildCanonicalDestinationOptions,
  getCanonicalDisplayName,
  getAllUnderlyingStopIds,
  CanonicalDestinationOption,
} from '../data/canonicalStops';

interface StopHeaderCardProps {
  currentStop: Stop;
  selectedDestinationId: string;
  onSelectDestination: (destId: string) => void;
  isDarkMode?: boolean;
  stops?: Stop[];
  onOpenAuditModal?: () => void;
  flaggedRoutesCount?: number;
  isOriginLocked?: boolean;
}

export const StopHeaderCard: React.FC<StopHeaderCardProps> = React.memo(({
  currentStop,
  selectedDestinationId,
  onSelectDestination,
  isDarkMode = false,
  stops,
  onOpenAuditModal,
  flaggedRoutesCount = 0,
  isOriginLocked = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const stopList = stops && stops.length > 0 ? stops : STOPS;

  // Stop display name matching exact user request and mockup
  const displayName = useMemo(() => {
    if (currentStop.id === 'howrah') {
      return 'Howrah Station (Bay 4)';
    }
    if (currentStop.name.toLowerCase().includes('bay')) {
      return currentStop.name;
    }
    return currentStop.name;
  }, [currentStop]);

  // Destination search filtering: deduplicate via canonical stops mapping
  const availableDestinations = useMemo(
    () => stopList.filter((s) => s.id !== currentStop.id),
    [currentStop.id, stopList]
  );

  // Requirement 3: Build canonical destination options so only ONE entry per canonical group is shown
  const canonicalOptions: CanonicalDestinationOption[] = useMemo(() => {
    return buildCanonicalDestinationOptions(availableDestinations);
  }, [availableDestinations]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return canonicalOptions.filter((opt) => {
      const matchDisplay = opt.displayName.toLowerCase().includes(q);
      const matchSubtitle = opt.subtitle?.toLowerCase().includes(q);
      const matchAliases = opt.representativeStop.name.toLowerCase().includes(q);
      return matchDisplay || matchSubtitle || matchAliases;
    }).slice(0, 8);
  }, [canonicalOptions, searchQuery]);

  // Sync search input display with selectedDestinationId (single source of truth)
  useEffect(() => {
    if (selectedDestinationId) {
      const name = getCanonicalDisplayName(selectedDestinationId, stopList);
      if (name) {
        setSearchQuery(name);
      }
    } else {
      setSearchQuery('');
    }
  }, [selectedDestinationId, stopList]);

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (destId: string) => {
    const opt = canonicalOptions.find((o) => o.id === destId);
    if (opt) {
      setSearchQuery(opt.displayName);
    } else {
      const name = getCanonicalDisplayName(destId, stopList);
      if (name) setSearchQuery(name);
    }
    onSelectDestination(destId);
    setIsSearchFocused(false);
  };

  const handleClear = () => {
    setSearchQuery('');
    onSelectDestination('');
    setIsSearchFocused(false);
  };

  return (
    <div className="p-3 sm:p-4 bg-transparent z-40 relative">
      {/* 1. HEADER CARD: Dark slate/navy rounded card */}
      <div
        id="stop-header-card"
        className="bg-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg text-white transition-all duration-200"
      >
        {/* Top Row: Clean QR Verified Badge + Station Name */}
        <div className="flex items-center gap-3 mb-3">
          {/* QR-verified icon badge (purely decorative/informational, no click interaction) */}
          <div
            id="header-qr-badge"
            title="QR Verified Stop Origin"
            aria-label="QR Verified Stop Origin"
            className="w-10 h-10 rounded-xl bg-blue-600/90 border border-blue-400/30 text-white flex items-center justify-center shrink-0 shadow-sm pointer-events-none select-none"
          >
            <QrCode className="w-5 h-5 text-white" />
          </div>

          {/* Stop name as bold white text */}
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold text-white leading-tight truncate tracking-tight">
              {displayName}
            </h1>
          </div>
        </div>

        {/* 2. SEARCH BAR: Embedded pill search with magnifying glass */}
        <div ref={searchContainerRef} className="relative mt-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              id="destination-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Where do you want to go?"
              className="w-full pl-9.5 pr-8 py-2.5 bg-slate-700/80 hover:bg-slate-700 focus:bg-slate-700 text-white placeholder-slate-400 text-xs sm:text-sm rounded-2xl border border-slate-600/60 focus:border-blue-500 focus:outline-hidden transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 text-slate-400 hover:text-white cursor-pointer"
                title="Clear destination"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchFocused && searchResults.length > 0 && (
            <div
              id="destination-search-dropdown"
              className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-60 overflow-y-auto"
            >
              {searchResults.map((dest) => (
                <button
                  key={dest.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(dest.id);
                  }}
                  onClick={() => handleSelect(dest.id)}
                  className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-xs font-semibold text-slate-800 hover:text-blue-700 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{dest.displayName}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {dest.subtitle}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

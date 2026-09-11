import { STOPS } from '../data/transitData';
import { Stop } from '../types';

export function getStopFromCurrentUrl(availableStops: Stop[] = STOPS): Stop {
  if (typeof window === 'undefined') {
    return availableStops[0] || STOPS[0];
  }

  const findMatchingStop = (target: string): Stop | undefined => {
    const clean = target.toLowerCase().trim();
    return (
      availableStops.find((s) => s.id.toLowerCase() === clean) ||
      availableStops.find((s) => s.name.toLowerCase() === clean) ||
      availableStops.find((s) => s.id.toLowerCase().includes(clean) || clean.includes(s.id.toLowerCase())) ||
      availableStops.find((s) => s.name.toLowerCase().includes(clean) || clean.includes(s.name.toLowerCase()))
    );
  };

  // Check pathname: e.g. /stop/howrah or /stop/ruby
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const stopPathIndex = pathParts.indexOf('stop');
  if (stopPathIndex !== -1 && pathParts[stopPathIndex + 1]) {
    const rawId = decodeURIComponent(pathParts[stopPathIndex + 1]);
    const matched = findMatchingStop(rawId);
    if (matched) return matched;
  }

  // Check query parameter: e.g. ?stop=esplanade
  const searchParams = new URLSearchParams(window.location.search);
  const queryStop = searchParams.get('stop');
  if (queryStop) {
    const matched = findMatchingStop(decodeURIComponent(queryStop));
    if (matched) return matched;
  }

  // Check hash: e.g. #stop/howrah or #stop=howrah
  const hash = window.location.hash;
  if (hash) {
    for (const stop of availableStops) {
      if (hash.toLowerCase().includes(stop.id.toLowerCase()) || hash.toLowerCase().includes(stop.name.toLowerCase())) {
        return stop;
      }
    }
  }

  // Default to first available stop
  return availableStops[0] || STOPS[0];
}

export function updateUrlForStop(stopId: string): void {
  if (typeof window === 'undefined') return;

  const newPath = `/stop/${stopId}`;
  const currentPath = window.location.pathname;

  if (currentPath !== newPath) {
    window.history.pushState({ stopId }, '', newPath);
  }
}

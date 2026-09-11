import { Stop } from '../types';

/**
 * Normalizes a string for robust fuzzy matching across URL formats:
 * (e.g. 'ruby_general_hospital', 'ruby-general-hospital', 'Ruby Hospital') -> 'rubygeneralhospital'
 */
function normalizeStopToken(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Reads the origin stop strictly from the URL parameter (?stop=... or /stop/...).
 * If parameter is present and matches a valid stop, returns the Stop.
 * If parameter is missing or invalid, returns null (never guesses or falls back).
 */
export function getStopFromCurrentUrl(availableStops: Stop[] = []): Stop | null {
  if (typeof window === 'undefined' || !availableStops || availableStops.length === 0) {
    return null;
  }

  let targetParam: string | null = null;

  // 1. Primary: Query parameter ?stop=ruby_general_hospital
  const searchParams = new URLSearchParams(window.location.search);
  const queryStop = searchParams.get('stop');
  if (queryStop) {
    targetParam = decodeURIComponent(queryStop).trim();
  }

  // 2. Secondary: Pathname /stop/ruby_general_hospital
  if (!targetParam) {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const stopPathIndex = pathParts.indexOf('stop');
    if (stopPathIndex !== -1 && pathParts[stopPathIndex + 1]) {
      targetParam = decodeURIComponent(pathParts[stopPathIndex + 1]).trim();
    }
  }

  // 3. Tertiary: Hash #stop=ruby_general_hospital or #stop/ruby_general_hospital
  if (!targetParam && window.location.hash) {
    const hashMatch = window.location.hash.match(/stop[=/]([^&]+)/i);
    if (hashMatch && hashMatch[1]) {
      targetParam = decodeURIComponent(hashMatch[1]).trim();
    }
  }

  if (!targetParam) {
    return null;
  }

  const cleanTarget = targetParam.toLowerCase();
  const normalizedTarget = normalizeStopToken(targetParam);

  // Exact ID match (case-insensitive)
  const exactIdMatch = availableStops.find((s) => s.id.toLowerCase() === cleanTarget);
  if (exactIdMatch) return exactIdMatch;

  // Normalized ID match (e.g. ruby_general_hospital -> ruby-general-hospital)
  const normalizedIdMatch = availableStops.find(
    (s) => normalizeStopToken(s.id) === normalizedTarget
  );
  if (normalizedIdMatch) return normalizedIdMatch;

  // Normalized Name match (e.g. ruby_general_hospital -> Ruby General Hospital)
  const normalizedNameMatch = availableStops.find(
    (s) => normalizeStopToken(s.name) === normalizedTarget
  );
  if (normalizedNameMatch) return normalizedNameMatch;

  // Partial ID/Name match (e.g. ?stop=ruby matching ruby_general_hospital or Howrah matching howrah_station)
  if (normalizedTarget.length >= 3) {
    const partialMatch = availableStops.find((s) => {
      const sIdNorm = normalizeStopToken(s.id);
      const sNameNorm = normalizeStopToken(s.name);
      return (
        sIdNorm.includes(normalizedTarget) ||
        normalizedTarget.includes(sIdNorm) ||
        sNameNorm.includes(normalizedTarget) ||
        normalizedTarget.includes(sNameNorm)
      );
    });
    if (partialMatch) return partialMatch;
  }

  // No match found
  return null;
}

/**
 * Updates browser URL query param ?stop=<stop_id> without page reload
 */
export function updateUrlForStop(stopId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('stop', stopId);
    window.history.pushState({ stopId }, '', url.toString());
  } catch {
    const newUrl = `/?stop=${encodeURIComponent(stopId)}`;
    window.history.pushState({ stopId }, '', newUrl);
  }
}

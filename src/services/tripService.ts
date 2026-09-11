import { supabase } from '../lib/supabase';

export interface BoardedTrip {
  id: string;
  userId?: string | null;
  busId: string;
  routeId: string;
  routeNumber: string;
  originStopId: string;
  originStopName: string;
  destinationStopId: string;
  destinationStopName: string;
  fare: number;
  busLicensePlate?: string;
  status: 'active' | 'completed' | 'cancelled';
  boardedAt: string;
  completedAt?: string | null;
}

export interface TripFeedback {
  id: string;
  tripId: string;
  userId?: string | null;
  busMaintenanceRating: number; // 1 - 5
  driverConductorRating: number; // 1 - 5
  reachedOnTime: boolean;
  comments?: string;
  createdAt: string;
}

const LOCAL_STORAGE_ACTIVE_TRIP_KEY = 'bahon_active_boarded_trip';
const LOCAL_STORAGE_FEEDBACK_KEY = 'bahon_trip_feedback_history';

export async function createBoardedTrip(
  params: Omit<BoardedTrip, 'id' | 'status' | 'boardedAt'>
): Promise<BoardedTrip> {
  const trip: BoardedTrip = {
    ...params,
    id: 'trip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    status: 'active',
    boardedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_TRIP_KEY, JSON.stringify(trip));
  } catch (err) {
    console.warn('[TripService] LocalStorage write failed:', err);
  }

  try {
    const { error } = await supabase.from('boarded_trips').insert([
      {
        id: trip.id,
        user_id: trip.userId || null,
        bus_id: trip.busId,
        route_id: trip.routeId,
        route_number: trip.routeNumber,
        origin_stop_id: trip.originStopId,
        origin_stop_name: trip.originStopName,
        destination_stop_id: trip.destinationStopId,
        destination_stop_name: trip.destinationStopName,
        fare: trip.fare,
        bus_license_plate: trip.busLicensePlate || null,
        status: trip.status,
        boarded_at: trip.boardedAt,
      },
    ]);

    if (error) {
      console.info('[TripService] Supabase boarded_trips insert note (using local cache):', error.message);
    }
  } catch (err) {
    console.info('[TripService] Supabase boarded_trips exception (using local cache):', err);
  }

  return trip;
}

export async function completeBoardedTrip(tripId: string): Promise<void> {
  const now = new Date().toISOString();

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ACTIVE_TRIP_KEY);
    if (raw) {
      const trip: BoardedTrip = JSON.parse(raw);
      if (trip.id === tripId) {
        trip.status = 'completed';
        trip.completedAt = now;
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_TRIP_KEY, JSON.stringify(trip));
      }
    }
  } catch (err) {
    console.warn('[TripService] LocalStorage update failed:', err);
  }

  try {
    await supabase
      .from('boarded_trips')
      .update({
        status: 'completed',
        completed_at: now,
      })
      .eq('id', tripId);
  } catch (err) {
    console.info('[TripService] Supabase update exception:', err);
  }
}

export function getStoredActiveTrip(): BoardedTrip | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ACTIVE_TRIP_KEY);
    if (!raw) return null;
    const trip: BoardedTrip = JSON.parse(raw);
    if (trip.status === 'active') {
      return trip;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearStoredActiveTrip(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_ACTIVE_TRIP_KEY);
  } catch {}
}

export async function submitTripFeedback(
  params: Omit<TripFeedback, 'id' | 'createdAt'>
): Promise<TripFeedback> {
  const feedback: TripFeedback = {
    ...params,
    id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    createdAt: new Date().toISOString(),
  };

  try {
    const existingRaw = localStorage.getItem(LOCAL_STORAGE_FEEDBACK_KEY);
    const list: TripFeedback[] = existingRaw ? JSON.parse(existingRaw) : [];
    list.unshift(feedback);
    localStorage.setItem(LOCAL_STORAGE_FEEDBACK_KEY, JSON.stringify(list.slice(0, 50)));
  } catch (err) {
    console.warn('[TripService] Feedback localStorage write failed:', err);
  }

  try {
    const { error } = await supabase.from('trip_feedback').insert([
      {
        id: feedback.id,
        trip_id: feedback.tripId,
        user_id: feedback.userId || null,
        bus_maintenance_rating: feedback.busMaintenanceRating,
        driver_conductor_rating: feedback.driverConductorRating,
        reached_on_time: feedback.reachedOnTime,
        comments: feedback.comments || null,
        created_at: feedback.createdAt,
      },
    ]);

    if (error) {
      console.info('[TripService] Supabase trip_feedback insert note (saved locally):', error.message);
    }
  } catch (err) {
    console.info('[TripService] Supabase trip_feedback exception (saved locally):', err);
  }

  return feedback;
}

import { Booking, FacilityId, HostelSettings, KeyStatus, BookingStatus } from './types';
import { DEFAULT_HOSTEL_SETTINGS, FACILITIES } from './constants';
import { getSupabaseServerClient, isSupabaseConfigured } from './supabase';
import { areIntervalsOverlapping, generateBookingCode } from './utils';

// In-memory store fallback when Supabase keys are not set up yet
declare global {
  // eslint-disable-next-line no-var
  var __memoryBookings: Booking[] | undefined;
  // eslint-disable-next-line no-var
  var __memorySettings: HostelSettings | undefined;
}

if (!global.__memorySettings) {
  global.__memorySettings = { ...DEFAULT_HOSTEL_SETTINGS };
}

if (!global.__memoryBookings) {
  // Add some realistic seed bookings for demonstration
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = today.getFullYear();
  const mm = pad(today.getMonth() + 1);
  const dd = pad(today.getDate());

  global.__memoryBookings = [
    {
      id: 'demo-1',
      booking_code: 'KIT-1024',
      facility_id: 'kitchen',
      student_name: 'Rahul Sharma',
      student_roll: '21CS045',
      student_room: 'Room A-112',
      student_phone: '+91 98111 22233',
      purpose: 'Cooking pasta dinner for study group',
      attendees_count: 3,
      start_time: new Date(`${yyyy}-${mm}-${dd}T19:00:00`).toISOString(),
      end_time: new Date(`${yyyy}-${mm}-${dd}T20:30:00`).toISOString(),
      status: 'confirmed',
      key_status: 'not_collected',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: 'Need microwave and induction stove'
    },
    {
      id: 'demo-2',
      booking_code: 'TV-2048',
      facility_id: 'tv-room',
      student_name: 'Priya Patel',
      student_roll: '22EE019',
      student_room: 'Room B-305',
      student_phone: '+91 98222 33344',
      purpose: 'Premier League Football screening',
      attendees_count: 8,
      start_time: new Date(`${yyyy}-${mm}-${dd}T21:00:00`).toISOString(),
      end_time: new Date(`${yyyy}-${mm}-${dd}T23:00:00`).toISOString(),
      status: 'confirmed',
      key_status: 'not_collected',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: 'Will bring HDMI cable'
    }
  ];
}

export async function getHostelSettings(): Promise<HostelSettings> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('hostel_settings')
        .select('*')
        .eq('id', 'current')
        .single();

      if (!error && data) {
        return data as HostelSettings;
      }
    } catch (err) {
      console.warn('Could not fetch settings from Supabase, using fallback:', err);
    }
  }

  return global.__memorySettings || DEFAULT_HOSTEL_SETTINGS;
}

export async function updateHostelSettings(updates: Partial<HostelSettings>): Promise<HostelSettings> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('hostel_settings')
        .upsert({ id: 'current', ...updates, updated_at: new Date().toISOString() })
        .select()
        .single();

      if (!error && data) {
        return data as HostelSettings;
      }
    } catch (err) {
      console.warn('Could not update settings in Supabase:', err);
    }
  }

  global.__memorySettings = {
    ...DEFAULT_HOSTEL_SETTINGS,
    ...(global.__memorySettings || {}),
    ...updates,
  };
  return global.__memorySettings;
}

export interface GetBookingsFilter {
  facilityId?: FacilityId;
  date?: string; // YYYY-MM-DD
  roll?: string;
  code?: string;
  status?: BookingStatus;
  keyStatus?: KeyStatus;
}

export async function getBookings(filter?: GetBookingsFilter): Promise<Booking[]> {
  const client = getSupabaseServerClient();

  if (client) {
    try {
      let query = client.from('bookings').select('*').order('start_time', { ascending: true });

      if (filter?.facilityId) {
        query = query.eq('facility_id', filter.facilityId);
      }
      if (filter?.status) {
        query = query.eq('status', filter.status);
      }
      if (filter?.keyStatus) {
        query = query.eq('key_status', filter.keyStatus);
      }
      if (filter?.roll) {
        query = query.ilike('student_roll', `%${filter.roll.trim()}%`);
      }
      if (filter?.code) {
        query = query.ilike('booking_code', `%${filter.code.trim()}%`);
      }
      if (filter?.date) {
        const startOfDay = new Date(`${filter.date}T00:00:00Z`).toISOString();
        const endOfDay = new Date(`${filter.date}T23:59:59Z`).toISOString();
        query = query.gte('start_time', startOfDay).lte('start_time', endOfDay);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data as Booking[];
      }
    } catch (err) {
      console.warn('Could not query Supabase bookings, using memory fallback:', err);
    }
  }

  // Fallback to in-memory store
  let list = global.__memoryBookings || [];

  if (filter?.facilityId) {
    list = list.filter((b) => b.facility_id === filter.facilityId);
  }
  if (filter?.status) {
    list = list.filter((b) => b.status === filter.status);
  }
  if (filter?.keyStatus) {
    list = list.filter((b) => b.key_status === filter.keyStatus);
  }
  if (filter?.roll) {
    const q = filter.roll.trim().toLowerCase();
    list = list.filter((b) => b.student_roll.toLowerCase().includes(q));
  }
  if (filter?.code) {
    const q = filter.code.trim().toUpperCase();
    list = list.filter((b) => b.booking_code.toUpperCase().includes(q));
  }
  if (filter?.date) {
    list = list.filter((b) => b.start_time.startsWith(filter.date!));
  }

  return [...list].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
}

export async function getBookingByCode(bookingCode: string): Promise<Booking | null> {
  const code = bookingCode.trim().toUpperCase();
  const client = getSupabaseServerClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('bookings')
        .select('*')
        .eq('booking_code', code)
        .maybeSingle();

      if (!error && data) {
        return data as Booking;
      }
    } catch (err) {
      console.warn('Error fetching booking by code from Supabase:', err);
    }
  }

  const memoryMatch = (global.__memoryBookings || []).find(
    (b) => b.booking_code.toUpperCase() === code
  );
  return memoryMatch || null;
}

/**
 * CRITICAL BACKEND SLOT FREE CHECKING:
 * Evaluates whether a proposed start_time to end_time slot is available.
 * Checked strictly on the server before insertion.
 */
export async function checkSlotAvailability(
  facilityId: FacilityId,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<{ isAvailable: boolean; conflicts: Booking[]; reason?: string }> {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isAvailable: false, conflicts: [], reason: 'Invalid start or end time format.' };
  }

  if (start >= end) {
    return { isAvailable: false, conflicts: [], reason: 'Start time must be before end time.' };
  }

  // Facility check
  const facility = FACILITIES.find((f) => f.id === facilityId);
  if (!facility) {
    return { isAvailable: false, conflicts: [], reason: 'Facility not found.' };
  }

  // Check maximum duration (e.g. 3 hours)
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (durationHours > facility.maxDurationHours) {
    return {
      isAvailable: false,
      conflicts: [],
      reason: `Maximum booking duration is ${facility.maxDurationHours} hours (requested: ${durationHours.toFixed(1)}h).`,
    };
  }

  // Query database for overlapping confirmed bookings:
  // Overlap condition: b.start_time < proposed_end AND b.end_time > proposed_start
  const client = getSupabaseServerClient();
  if (client) {
    try {
      let query = client
        .from('bookings')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('status', 'confirmed')
        .lt('start_time', end.toISOString())
        .gt('end_time', start.toISOString());

      if (excludeBookingId) {
        query = query.neq('id', excludeBookingId);
      }

      const { data, error } = await query;
      if (!error && data) {
        const conflicts = data as Booking[];
        return {
          isAvailable: conflicts.length === 0,
          conflicts,
          reason:
            conflicts.length > 0
              ? `Slot overlaps with an existing booking by ${conflicts[0].student_name} (${conflicts[0].student_room}).`
              : undefined,
        };
      }
    } catch (err) {
      console.warn('Supabase slot check error, checking memory:', err);
    }
  }

  // Memory fallback check
  const conflicts = (global.__memoryBookings || []).filter(
    (b) =>
      b.facility_id === facilityId &&
      b.status === 'confirmed' &&
      (!excludeBookingId || b.id !== excludeBookingId) &&
      areIntervalsOverlapping(start, end, b.start_time, b.end_time)
  );

  return {
    isAvailable: conflicts.length === 0,
    conflicts,
    reason:
      conflicts.length > 0
        ? `Slot overlaps with an existing booking by ${conflicts[0].student_name} (${conflicts[0].student_room}).`
        : undefined,
  };
}

export interface CreateBookingInput {
  facility_id: FacilityId;
  student_name: string;
  student_roll: string;
  student_room: string;
  student_phone: string;
  purpose: string;
  attendees_count?: number;
  start_time: string;
  end_time: string;
  notes?: string;
}

/**
 * ATOMIC BACKEND BOOKING CREATION WITH SLOT FREE VERIFICATION
 * Runs backend validation, checks for conflicts, and creates the booking.
 */
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  // 1. Strict Server-Side Validation
  if (!input.student_name?.trim()) throw new Error('Student name is required');
  if (!input.student_roll?.trim()) throw new Error('Roll number is required');
  if (!input.student_room?.trim()) throw new Error('Room number is required');
  if (!input.student_phone?.trim()) throw new Error('Phone number is required');
  if (!input.purpose?.trim()) throw new Error('Purpose of booking is required');

  const start = new Date(input.start_time);
  const end = new Date(input.end_time);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date/time provided');
  }

  if (start >= end) {
    throw new Error('Slot start time must be before end time');
  }

  if (start.getTime() < Date.now() - 5 * 60 * 1000) {
    // 5 min grace period for clock drift
    throw new Error('Cannot book time slots in the past');
  }

  // 2. Perform Backend Slot Free Checking
  const availability = await checkSlotAvailability(
    input.facility_id,
    input.start_time,
    input.end_time
  );

  if (!availability.isAvailable) {
    throw new Error(
      availability.reason || 'Requested time slot is already booked. Please choose a different time.'
    );
  }

  // 3. Generate unique booking code
  const bookingCode = generateBookingCode(input.facility_id);
  const nowIso = new Date().toISOString();

  const newBooking: Booking = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `book-${Date.now()}`,
    booking_code: bookingCode,
    facility_id: input.facility_id,
    student_name: input.student_name.trim(),
    student_roll: input.student_roll.trim().toUpperCase(),
    student_room: input.student_room.trim(),
    student_phone: input.student_phone.trim(),
    purpose: input.purpose.trim(),
    attendees_count: Number(input.attendees_count) || 1,
    start_time: input.start_time,
    end_time: input.end_time,
    status: 'confirmed',
    key_status: 'not_collected',
    created_at: nowIso,
    updated_at: nowIso,
    notes: input.notes?.trim() || null,
  };

  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('bookings')
        .insert(newBooking)
        .select()
        .single();

      if (error) {
        // Check for postgres exclusion constraint violation code 23P01
        if (error.code === '23P01' || error.message.includes('overlapping')) {
          throw new Error('Conflict detected: This time slot was just booked by another student. Please pick another slot.');
        }
        throw new Error(error.message);
      }

      return data as Booking;
    } catch (err: any) {
      if (err.message.includes('Conflict')) throw err;
      console.warn('Error inserting to Supabase, falling back to memory store:', err);
    }
  }

  // Memory store fallback
  global.__memoryBookings = global.__memoryBookings || [];
  global.__memoryBookings.push(newBooking);

  return newBooking;
}

/**
 * Update key handover / return status or cancel booking
 */
export async function updateBooking(
  id: string,
  updates: Partial<Booking>
): Promise<Booking> {
  const nowIso = new Date().toISOString();
  const payload = { ...updates, updated_at: nowIso };

  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('bookings')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return data as Booking;
      }
    } catch (err) {
      console.warn('Could not update booking in Supabase:', err);
    }
  }

  const list = global.__memoryBookings || [];
  const index = list.findIndex((b) => b.id === id || b.booking_code === id);
  if (index === -1) {
    throw new Error('Booking not found');
  }

  list[index] = {
    ...list[index],
    ...payload,
  };

  return list[index];
}

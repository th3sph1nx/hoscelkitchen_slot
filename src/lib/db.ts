import { Booking, FacilityId, CurrentStatus, BlacklistEntry, CooldownEntry, ADMIN_ROLL } from './types';
import { getSupabaseServerClient } from './supabase';
import { sendOtpEmail } from './email';

// Global memory stores for fallback/local mode
declare global {
  // eslint-disable-next-line no-var
  var __memoryBookings: Booking[] | undefined;
  // eslint-disable-next-line no-var
  var __memoryOtps: Map<string, { code: string; expiresAt: number; email: string }> | undefined;
  // eslint-disable-next-line no-var
  var __memoryBlacklist: Map<string, { reason: string; createdAt: string }> | undefined;
  // eslint-disable-next-line no-var
  var __memoryCooldowns: Map<string, { expiresAt: number; reason: string; createdAt: string }> | undefined;
}

if (!global.__memoryBookings) {
  global.__memoryBookings = [];
}
if (!global.__memoryOtps) {
  global.__memoryOtps = new Map();
}
if (!global.__memoryBlacklist) {
  global.__memoryBlacklist = new Map();
}
if (!global.__memoryCooldowns) {
  global.__memoryCooldowns = new Map();
}

/**
 * Validate NITPy 8-10 character alphanumeric roll number
 */
export function validateRollNumber(input: string): { isValid: boolean; roll: string; email: string; error?: string } {
  const clean = input.trim().toUpperCase();
  if (!clean) {
    return { isValid: false, roll: '', email: '', error: 'Roll number is required' };
  }

  // Must be 8 to 10 alphanumeric characters (e.g. CS21B101, CS25B1058)
  const regex = /^[A-Z0-9]{8,10}$/;
  if (!regex.test(clean)) {
    return {
      isValid: false,
      roll: clean,
      email: '',
      error: 'Roll number must be 8-10 alphanumeric characters (e.g. CS21B101 or CS25B1058)',
    };
  }

  const email = `${clean.toLowerCase()}@nitpy.ac.in`;
  return { isValid: true, roll: clean, email };
}

/**
 * Generate 6-digit OTP and store with 10-minute validity
 */
export async function generateAndSendOtp(rollNumber: string): Promise<{ success: boolean; email: string; devOtp?: string }> {
  const validation = validateRollNumber(rollNumber);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const { roll, email } = validation;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  global.__memoryOtps?.set(roll, { code, expiresAt, email });

  const client = getSupabaseServerClient();
  if (client) {
    try {
      await client.from('otps').delete().eq('roll_number', roll);
      await client.from('otps').insert({
        roll_number: roll,
        email,
        code,
        expires_at: new Date(expiresAt).toISOString(),
      });
    } catch (err) {
      console.warn('Supabase OTP store error, fallback to memory:', err);
    }
  }

  const dispatch = await sendOtpEmail({ email, rollNumber: roll, code });
  return { success: true, email, devOtp: dispatch.devOtp };
}

/**
 * Verify OTP
 */
export async function verifyOtp(rollNumber: string, inputCode: string): Promise<boolean> {
  const roll = rollNumber.trim().toUpperCase();
  const code = inputCode.trim();

  if (!roll || !code) return false;

  const now = Date.now();

  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('otps')
        .select('*')
        .eq('roll_number', roll)
        .eq('code', code)
        .gt('expires_at', new Date(now).toISOString())
        .maybeSingle();

      if (!error && data) {
        await client.from('otps').delete().eq('id', data.id);
        global.__memoryOtps?.delete(roll);
        return true;
      }
    } catch (err) {
      console.warn('Supabase OTP check fallback:', err);
    }
  }

  const record = global.__memoryOtps?.get(roll);
  if (record && record.code === code && record.expiresAt > now) {
    global.__memoryOtps?.delete(roll);
    return true;
  }

  return false;
}

/**
 * Check if intervals overlap
 */
function areOverlapping(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

/**
 * Blacklist Management
 */
export async function isRollBlacklisted(rollNumber: string): Promise<{ isBlacklisted: boolean; reason?: string }> {
  const roll = rollNumber.trim().toUpperCase();
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data } = await client.from('blacklists').select('*').eq('roll_number', roll).maybeSingle();
      if (data) return { isBlacklisted: true, reason: data.reason || 'Restricted by Admin' };
    } catch {}
  }

  const mem = global.__memoryBlacklist?.get(roll);
  if (mem) return { isBlacklisted: true, reason: mem.reason || 'Restricted by Admin' };
  return { isBlacklisted: false };
}

export async function getBlacklist(): Promise<BlacklistEntry[]> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data } = await client.from('blacklists').select('*').order('created_at', { ascending: false });
      if (data) return data as BlacklistEntry[];
    } catch {}
  }

  const list: BlacklistEntry[] = [];
  global.__memoryBlacklist?.forEach((v, k) => {
    list.push({ id: k, roll_number: k, reason: v.reason, created_at: v.createdAt });
  });
  return list;
}

export async function addToBlacklist(rollNumber: string, reason: string = ''): Promise<void> {
  const roll = rollNumber.trim().toUpperCase();
  const now = new Date().toISOString();
  global.__memoryBlacklist?.set(roll, { reason, createdAt: now });

  const client = getSupabaseServerClient();
  if (client) {
    try {
      await client.from('blacklists').upsert({ roll_number: roll, reason });
    } catch {}
  }
}

export async function removeFromBlacklist(rollNumber: string): Promise<void> {
  const roll = rollNumber.trim().toUpperCase();
  global.__memoryBlacklist?.delete(roll);

  const client = getSupabaseServerClient();
  if (client) {
    try {
      await client.from('blacklists').delete().eq('roll_number', roll);
    } catch {}
  }
}

/**
 * Cooldown Management
 */
export async function getRollCooldown(rollNumber: string): Promise<{ onCooldown: boolean; expiresAt?: string; reason?: string }> {
  const roll = rollNumber.trim().toUpperCase();
  const now = new Date().toISOString();

  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data } = await client
        .from('cooldowns')
        .select('*')
        .eq('roll_number', roll)
        .gt('expires_at', now)
        .maybeSingle();
      if (data) return { onCooldown: true, expiresAt: data.expires_at, reason: data.reason };
    } catch {}
  }

  const mem = global.__memoryCooldowns?.get(roll);
  if (mem && mem.expiresAt > Date.now()) {
    return { onCooldown: true, expiresAt: new Date(mem.expiresAt).toISOString(), reason: mem.reason };
  }
  return { onCooldown: false };
}

export async function getCooldowns(): Promise<CooldownEntry[]> {
  const now = new Date().toISOString();
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data } = await client.from('cooldowns').select('*').gt('expires_at', now).order('expires_at', { ascending: true });
      if (data) return data as CooldownEntry[];
    } catch {}
  }

  const list: CooldownEntry[] = [];
  global.__memoryCooldowns?.forEach((v, k) => {
    if (v.expiresAt > Date.now()) {
      list.push({ id: k, roll_number: k, expires_at: new Date(v.expiresAt).toISOString(), reason: v.reason, created_at: v.createdAt });
    }
  });
  return list;
}

export async function setCooldown(rollNumber: string, hours: number, reason: string = ''): Promise<void> {
  const roll = rollNumber.trim().toUpperCase();
  const expiresAt = Date.now() + hours * 60 * 60 * 1000;
  const isoExpires = new Date(expiresAt).toISOString();
  const now = new Date().toISOString();

  global.__memoryCooldowns?.set(roll, { expiresAt, reason, createdAt: now });

  const client = getSupabaseServerClient();
  if (client) {
    try {
      await client.from('cooldowns').upsert({ roll_number: roll, expires_at: isoExpires, reason });
    } catch {}
  }
}

export async function removeCooldown(rollNumber: string): Promise<void> {
  const roll = rollNumber.trim().toUpperCase();
  global.__memoryCooldowns?.delete(roll);

  const client = getSupabaseServerClient();
  if (client) {
    try {
      await client.from('cooldowns').delete().eq('roll_number', roll);
    } catch {}
  }
}

/**
 * BACKEND SLOT FREE CHECKING:
 * Strict server-side verification before booking
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
    return { isAvailable: false, conflicts: [], reason: 'Invalid date/time format.' };
  }

  if (start >= end) {
    return { isAvailable: false, conflicts: [], reason: 'Start time must be before end time.' };
  }

  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (durationHours > 3.01) {
    return {
      isAvailable: false,
      conflicts: [],
      reason: `Maximum continuous booking duration is 3 hours (requested: ${durationHours.toFixed(1)} hrs).`,
    };
  }

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
              ? `Slot occupied by ${conflicts[0].roll_number} (${new Date(
                  conflicts[0].start_time
                ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(
                  conflicts[0].end_time
                ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
              : undefined,
        };
      }
    } catch (err) {
      console.warn('Supabase slot query fallback to memory:', err);
    }
  }

  const conflicts = (global.__memoryBookings || []).filter(
    (b) =>
      b.facility_id === facilityId &&
      b.status === 'confirmed' &&
      (!excludeBookingId || b.id !== excludeBookingId) &&
      areOverlapping(start, end, new Date(b.start_time), new Date(b.end_time))
  );

  return {
    isAvailable: conflicts.length === 0,
    conflicts,
    reason:
      conflicts.length > 0
        ? `Slot occupied by ${conflicts[0].roll_number} (${new Date(
            conflicts[0].start_time
          ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(
            conflicts[0].end_time
          ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
        : undefined,
  };
}

/**
 * Atomic booking creation with backend slot verification, blacklist, and cooldown checks
 */
export async function createBooking(input: {
  facility_id: FacilityId;
  roll_number: string;
  attendees_count: number;
  start_time: string;
  end_time: string;
  purpose?: string;
}): Promise<Booking> {
  const validation = validateRollNumber(input.roll_number);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // 1. BACKEND BLACKLIST CHECK
  const blacklisted = await isRollBlacklisted(validation.roll);
  if (blacklisted.isBlacklisted) {
    throw new Error(`Your roll number (${validation.roll}) has been blacklisted by Admin (${ADMIN_ROLL}). Reason: ${blacklisted.reason}`);
  }

  // 2. BACKEND COOLDOWN CHECK
  const cooldown = await getRollCooldown(validation.roll);
  if (cooldown.onCooldown) {
    const formattedExpiry = new Date(cooldown.expiresAt!).toLocaleString();
    throw new Error(`Your roll number (${validation.roll}) is on cooldown until ${formattedExpiry}. Reason: ${cooldown.reason || 'None specified'}`);
  }

  const start = new Date(input.start_time);
  const end = new Date(input.end_time);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid start/end time');
  }

  if (start >= end) {
    throw new Error('Start time must be before end time');
  }

  if (start.getTime() < Date.now() - 5 * 60 * 1000) {
    throw new Error('Cannot book past time slots');
  }

  // 3. BACKEND SLOT CHECK
  const availability = await checkSlotAvailability(input.facility_id, input.start_time, input.end_time);
  if (!availability.isAvailable) {
    throw new Error(availability.reason || 'This time slot is already booked.');
  }

  const attendees = Math.min(Math.max(Number(input.attendees_count) || 1, 1), 25);
  const prefix = input.facility_id === 'kitchen' ? 'KIT' : 'TV';
  const bookingCode = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  const nowIso = new Date().toISOString();

  const newBooking: Booking = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `book-${Date.now()}`,
    booking_code: bookingCode,
    facility_id: input.facility_id,
    roll_number: validation.roll,
    email: validation.email,
    attendees_count: attendees,
    purpose: input.purpose?.trim() || '',
    start_time: input.start_time,
    end_time: input.end_time,
    status: 'confirmed',
    created_at: nowIso,
  };

  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client.from('bookings').insert(newBooking).select().single();
      if (error) {
        if (error.code === '23P01' || error.message.includes('overlapping')) {
          throw new Error('Conflict: Slot was just taken by another user.');
        }
        throw new Error(error.message);
      }
      return data as Booking;
    } catch (err: any) {
      if (err.message.includes('Conflict')) throw err;
      console.warn('Supabase insert fallback:', err);
    }
  }

  global.__memoryBookings = global.__memoryBookings || [];
  global.__memoryBookings.push(newBooking);
  return newBooking;
}

/**
 * Admin: Change timing of a slot with backend conflict check
 */
export async function updateBookingTiming(bookingId: string, newStartTime: string, newEndTime: string): Promise<Booking> {
  const start = new Date(newStartTime);
  const end = new Date(newEndTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('Invalid date format');
  if (start >= end) throw new Error('Start time must be before end time');

  // Find booking
  let existing: Booking | null = null;
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data } = await client.from('bookings').select('*').or(`id.eq.${bookingId},booking_code.eq.${bookingId}`).single();
      if (data) existing = data as Booking;
    } catch {}
  }

  if (!existing) {
    existing = (global.__memoryBookings || []).find((b) => b.id === bookingId || b.booking_code === bookingId) || null;
  }

  if (!existing) throw new Error('Booking not found');

  // Verify that new slot timing is free (excluding this booking)
  const check = await checkSlotAvailability(existing.facility_id, newStartTime, newEndTime, existing.id);
  if (!check.isAvailable) {
    throw new Error(check.reason || 'New timing conflicts with another existing booking.');
  }

  // Update in Supabase
  if (client) {
    try {
      const { data, error } = await client
        .from('bookings')
        .update({ start_time: newStartTime, end_time: newEndTime })
        .eq('id', existing.id)
        .select()
        .single();
      if (!error && data) return data as Booking;
    } catch {}
  }

  // Update in memory
  existing.start_time = newStartTime;
  existing.end_time = newEndTime;
  return existing;
}

/**
 * Get all confirmed bookings
 */
export async function getBookings(filter?: {
  facility_id?: FacilityId;
  date?: string;
  roll_number?: string;
  all?: boolean; // admin can view all including cancelled
}): Promise<Booking[]> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      let query = client.from('bookings').select('*').order('start_time', { ascending: true });
      if (!filter?.all) query = query.eq('status', 'confirmed');
      if (filter?.facility_id) query = query.eq('facility_id', filter.facility_id);
      if (filter?.roll_number) query = query.eq('roll_number', filter.roll_number.toUpperCase());
      if (filter?.date) {
        query = query
          .gte('start_time', `${filter.date}T00:00:00Z`)
          .lte('start_time', `${filter.date}T23:59:59Z`);
      }
      const { data, error } = await query;
      if (!error && data) return data as Booking[];
    } catch (err) {
      console.warn('Supabase getBookings fallback:', err);
    }
  }

  let list = global.__memoryBookings || [];
  if (!filter?.all) list = list.filter((b) => b.status === 'confirmed');
  if (filter?.facility_id) list = list.filter((b) => b.facility_id === filter.facility_id);
  if (filter?.roll_number) {
    list = list.filter((b) => b.roll_number.toUpperCase() === filter.roll_number?.toUpperCase());
  }
  if (filter?.date) {
    list = list.filter((b) => b.start_time.startsWith(filter.date!));
  }
  return [...list].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}

/**
 * Get current live status of Kitchen & TV Room
 */
export async function getCurrentFacilityStatus(): Promise<CurrentStatus> {
  const all = await getBookings();
  const now = new Date();

  const getStatus = (facilityId: FacilityId) => {
    const facilityBookings = all
      .filter((b) => b.facility_id === facilityId && b.status === 'confirmed')
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const currentBooking =
      facilityBookings.find((b) => {
        const s = new Date(b.start_time);
        const e = new Date(b.end_time);
        return s <= now && now <= e;
      }) || null;

    const nextBooking =
      facilityBookings.find((b) => new Date(b.start_time) > now) || null;

    return {
      isOccupied: Boolean(currentBooking),
      currentBooking,
      nextBooking,
    };
  };

  return {
    kitchen: getStatus('kitchen'),
    tvRoom: getStatus('tv-room'),
  };
}

/**
 * Cancel or delete booking
 */
export async function cancelBooking(idOrCode: string, rollNumber?: string): Promise<boolean> {
  const client = getSupabaseServerClient();
  const isAdmin = rollNumber?.toUpperCase() === ADMIN_ROLL;

  if (client) {
    try {
      let query = client.from('bookings').update({ status: 'cancelled' });
      if (idOrCode.includes('-')) {
        query = query.eq('booking_code', idOrCode.toUpperCase());
      } else {
        query = query.eq('id', idOrCode);
      }
      if (rollNumber && !isAdmin) {
        query = query.eq('roll_number', rollNumber.toUpperCase());
      }
      const { error } = await query;
      if (!error) return true;
    } catch (err) {
      console.warn('Supabase cancel error:', err);
    }
  }

  const list = global.__memoryBookings || [];
  const item = list.find(
    (b) =>
      (b.id === idOrCode || b.booking_code === idOrCode.toUpperCase()) &&
      (!rollNumber || isAdmin || b.roll_number === rollNumber.toUpperCase())
  );
  if (item) {
    item.status = 'cancelled';
    return true;
  }
  return false;
}

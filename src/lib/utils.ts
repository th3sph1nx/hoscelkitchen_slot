import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { parseISO, isAfter, isBefore, format, addMinutes, startOfDay, endOfDay } from 'date-fns';
import { FacilityId, TimeSlot, Booking } from './types';
import { FACILITIES } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateBookingCode(facilityId: FacilityId): string {
  const prefix = facilityId === 'kitchen' ? 'KIT' : 'TV';
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomDigits}`;
}

export function formatDateTime(isoString: string): string {
  try {
    const date = parseISO(isoString);
    return format(date, 'EEE, dd MMM yyyy, hh:mm a');
  } catch {
    return isoString;
  }
}

export function formatTimeOnly(isoString: string): string {
  try {
    const date = parseISO(isoString);
    return format(date, 'hh:mm a');
  } catch {
    return isoString;
  }
}

export function formatDateOnly(isoString: string): string {
  try {
    const date = parseISO(isoString);
    return format(date, 'EEE, dd MMM yyyy');
  } catch {
    return isoString;
  }
}

/**
 * Checks if two time intervals [startA, endA) and [startB, endB) overlap.
 * Intervals overlap if and only if startA < endB AND endA > startB.
 */
export function areIntervalsOverlapping(
  startA: Date | string,
  endA: Date | string,
  startB: Date | string,
  endB: Date | string
): boolean {
  const sA = typeof startA === 'string' ? parseISO(startA).getTime() : startA.getTime();
  const eA = typeof endA === 'string' ? parseISO(endA).getTime() : endA.getTime();
  const sB = typeof startB === 'string' ? parseISO(startB).getTime() : startB.getTime();
  const eB = typeof endB === 'string' ? parseISO(endB).getTime() : endB.getTime();

  return sA < eB && eA > sB;
}

/**
 * Generates standard 1-hour time slots for a given day and facility
 */
export function generateDaySlots(
  facilityId: FacilityId,
  selectedDateStr: string, // YYYY-MM-DD
  existingBookings: Booking[]
): TimeSlot[] {
  const facility = FACILITIES.find((f) => f.id === facilityId);
  if (!facility) return [];

  const [openHour, openMin] = facility.openTime.split(':').map(Number);
  const [closeHour, closeMin] = facility.closeTime.split(':').map(Number);

  const now = new Date();
  const slots: TimeSlot[] = [];

  // Parse target date
  const [year, month, day] = selectedDateStr.split('-').map(Number);

  // Facility open time on target day
  let currentSlotStart = new Date(year, month - 1, day, openHour, openMin, 0);
  const facilityClose = new Date(year, month - 1, day, closeHour, closeMin, 0);

  while (currentSlotStart < facilityClose) {
    const currentSlotEnd = addMinutes(currentSlotStart, 60);
    if (currentSlotEnd > facilityClose) break;

    const startISO = currentSlotStart.toISOString();
    const endISO = currentSlotEnd.toISOString();
    const isPast = isBefore(currentSlotStart, now);

    // Check if any confirmed booking overlaps with this slot
    const conflictingBooking = existingBookings.find(
      (b) =>
        b.facility_id === facilityId &&
        b.status === 'confirmed' &&
        areIntervalsOverlapping(startISO, endISO, b.start_time, b.end_time)
    );

    const isAvailable = !isPast && !conflictingBooking;

    slots.push({
      startTime: format(currentSlotStart, 'HH:mm'),
      endTime: format(currentSlotEnd, 'HH:mm'),
      startISO,
      endISO,
      isAvailable,
      isPast,
      conflictReason: isPast
        ? 'Time passed'
        : conflictingBooking
        ? `Booked by ${conflictingBooking.student_name} (${conflictingBooking.student_room})`
        : undefined,
      currentBooking: conflictingBooking
        ? {
            bookingCode: conflictingBooking.booking_code,
            studentName: conflictingBooking.student_name,
            keyStatus: conflictingBooking.key_status,
          }
        : undefined,
    });

    currentSlotStart = currentSlotEnd;
  }

  return slots;
}

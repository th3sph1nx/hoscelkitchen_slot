export type FacilityId = 'kitchen' | 'tv-room';

export type BookingStatus = 'confirmed' | 'cancelled';

export const ADMIN_ROLL = 'CS25B1058';

export interface Booking {
  id: string;
  booking_code: string; // e.g. "KIT-8492"
  facility_id: FacilityId;
  roll_number: string;  // e.g. "CS21B101" or "CS25B1058"
  email: string;        // e.g. "cs25b1058@nitpy.ac.in"
  attendees_count: number;
  purpose?: string;
  start_time: string;   // ISO string
  end_time: string;     // ISO string
  status: BookingStatus;
  created_at: string;
}

export interface CurrentStatus {
  kitchen: {
    isOccupied: boolean;
    currentBooking?: Booking | null;
    nextBooking?: Booking | null;
  };
  tvRoom: {
    isOccupied: boolean;
    currentBooking?: Booking | null;
    nextBooking?: Booking | null;
  };
}

export interface OtpRecord {
  id: string;
  roll_number: string;
  email: string;
  code: string;
  expires_at: string;
}

export interface BlacklistEntry {
  id: string;
  roll_number: string;
  reason: string;
  created_at: string;
}

export interface CooldownEntry {
  id: string;
  roll_number: string;
  expires_at: string;
  reason: string;
  created_at: string;
}

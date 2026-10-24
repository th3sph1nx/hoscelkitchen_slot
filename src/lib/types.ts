export type FacilityId = 'kitchen' | 'tv-room';

export type BookingStatus = 'confirmed' | 'cancelled' | 'rejected';
export type KeyStatus = 'not_collected' | 'collected' | 'returned';

export interface Facility {
  id: FacilityId;
  name: string;
  shortName: string;
  description: string;
  location: string;
  icon: 'utensils' | 'tv';
  maxDurationHours: number;
  openTime: string; // "06:00"
  closeTime: string; // "23:30"
  rules: string[];
  capacity: string;
  equipment: string[];
}

export interface Booking {
  id: string;
  booking_code: string; // e.g. "KIT-9482"
  facility_id: FacilityId;
  student_name: string;
  student_roll: string;
  student_room: string;
  student_phone: string;
  purpose: string;
  attendees_count: number;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  status: BookingStatus;
  key_status: KeyStatus;
  key_collected_at?: string | null;
  key_returned_at?: string | null;
  created_at: string;
  updated_at: string;
  notes?: string | null;
}

export interface HostelSettings {
  id: string;
  hostel_name: string;
  rep_name: string;
  rep_room: string;
  rep_phone: string;
  rep_email?: string;
  admin_pin: string;
  auto_approval: boolean;
}

export interface TimeSlot {
  startTime: string; // "14:00"
  endTime: string;   // "15:00"
  startISO: string;
  endISO: string;
  isAvailable: boolean;
  conflictReason?: string;
  isPast: boolean;
  currentBooking?: {
    bookingCode: string;
    studentName: string;
    keyStatus: KeyStatus;
  };
}

export interface AvailabilityCheckRequest {
  facilityId: FacilityId;
  startTime: string; // ISO
  endTime: string;   // ISO
  excludeBookingId?: string;
}

export interface AvailabilityCheckResponse {
  isAvailable: boolean;
  conflicts: Array<{
    id: string;
    booking_code: string;
    start_time: string;
    end_time: string;
    student_name: string;
  }>;
  message?: string;
}

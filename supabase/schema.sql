-- NIT Puducherry Hostel Amenities Booking Schema
-- PostgreSQL Exclusion Constraint prevents double bookings at database level

CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code TEXT NOT NULL UNIQUE,
    facility_id TEXT NOT NULL CHECK (facility_id IN ('kitchen', 'tv-room')),
    roll_number TEXT NOT NULL,
    email TEXT NOT NULL,
    attendees_count INTEGER NOT NULL DEFAULT 1 CHECK (attendees_count >= 1 AND attendees_count <= 25),
    purpose TEXT DEFAULT '',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- CRITICAL: Prevent overlapping confirmed bookings on the same facility
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_bookings'
    ) THEN
        ALTER TABLE bookings
        ADD CONSTRAINT no_overlapping_bookings
        EXCLUDE USING gist (
            facility_id WITH =,
            tstzrange(start_time, end_time) WITH &&
        )
        WHERE (status = 'confirmed');
    END IF;
END $$;

-- OTP verification table
CREATE TABLE IF NOT EXISTS otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roll_number TEXT NOT NULL,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bookings_facility_time ON bookings (facility_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_roll ON bookings (roll_number);
CREATE INDEX IF NOT EXISTS idx_otps_roll_code ON otps (roll_number, code);

-- Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Public insert bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update bookings" ON bookings FOR UPDATE USING (true);

CREATE POLICY "Public insert otps" ON otps FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read otps" ON otps FOR SELECT USING (true);
CREATE POLICY "Public delete otps" ON otps FOR DELETE USING (true);

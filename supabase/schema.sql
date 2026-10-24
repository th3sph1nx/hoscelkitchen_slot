-- Supabase SQL Schema for Hostel Kitchen & TV Room Booking System
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Enable btree_gist extension (required for range exclusion constraint)
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create facilities table
CREATE TABLE IF NOT EXISTS facilities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    icon TEXT NOT NULL,
    max_duration_hours NUMERIC NOT NULL DEFAULT 3,
    open_time TIME NOT NULL DEFAULT '06:00:00',
    close_time TIME NOT NULL DEFAULT '23:30:00',
    capacity TEXT NOT NULL DEFAULT '6 students',
    equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
    rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create hostel settings table (Representative info & config)
CREATE TABLE IF NOT EXISTS hostel_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    hostel_name TEXT NOT NULL DEFAULT 'Cauvery Hostel - Block B',
    rep_name TEXT NOT NULL DEFAULT 'Vaanjinathan (Rep)',
    rep_room TEXT NOT NULL DEFAULT 'Room B-204',
    rep_phone TEXT NOT NULL DEFAULT '+91 98765 43210',
    rep_email TEXT DEFAULT 'rep.amenities@hostel.edu',
    admin_pin TEXT NOT NULL DEFAULT '1234',
    auto_approval BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code TEXT NOT NULL UNIQUE,
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_roll TEXT NOT NULL,
    student_room TEXT NOT NULL,
    student_phone TEXT NOT NULL,
    purpose TEXT NOT NULL,
    attendees_count INTEGER NOT NULL DEFAULT 1,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'rejected')),
    key_status TEXT NOT NULL DEFAULT 'not_collected' CHECK (key_status IN ('not_collected', 'collected', 'returned')),
    key_collected_at TIMESTAMPTZ,
    key_returned_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Ensure start is strictly before end
    CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- 5. CRITICAL BACKEND CONSTRAINT: PostgreSQL Exclusion Constraint
-- Mathematically prevents overlapping confirmed bookings for the same facility at the DB level!
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

-- 6. Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_bookings_facility_time ON bookings (facility_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_student_roll ON bookings (student_roll);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code ON bookings (booking_code);

-- 7. Stored Procedure: Backend Slot Availability Checker
CREATE OR REPLACE FUNCTION check_facility_availability(
    p_facility_id TEXT,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS TABLE (
    is_available BOOLEAN,
    conflict_count INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_conflicts INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_conflicts
    FROM bookings
    WHERE facility_id = p_facility_id
      AND status = 'confirmed'
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
      AND start_time < p_end_time
      AND end_time > p_start_time;

    RETURN QUERY
    SELECT (v_conflicts = 0) AS is_available, v_conflicts AS conflict_count;
END;
$$;

-- 8. Seed Default Facilities
INSERT INTO facilities (id, name, short_name, description, location, icon, max_duration_hours, open_time, close_time, capacity, equipment, rules)
VALUES
(
    'kitchen',
    'Common Kitchen',
    'Kitchen',
    'Fully equipped hostel kitchen for meal preparation, late-night snacks, or group dinners.',
    'Ground Floor, Block A (Opposite Dining Hall)',
    'utensils',
    3,
    '06:00:00',
    '23:30:00',
    'Up to 6 students at a time',
    '["2x Induction Cooktops", "Microwave Oven", "Double-door Refrigerator", "Electric Kettle & Toaster", "Prep counters & Wash basin", "Basic cooking utensils & pans"]'::jsonb,
    '["Collect the key from Representative before entering; lock the door when leaving.", "Wipe down all counters and wash all utensils immediately after cooking.", "Dispose of food waste in the designated organic bin.", "Switch off all induction burners and microwave switches from the main socket.", "Return key directly to Representative (Room B-204) right after slot ends."]'::jsonb
),
(
    'tv-room',
    'Common TV & Recreation Lounge',
    'TV Lounge',
    'Entertainment lounge with high-definition display, surround sound, and couch seating for matches and movies.',
    'First Floor, Common Amenities Wing (Room 102)',
    'tv',
    3,
    '08:00:00',
    '24:00:00',
    'Up to 25 students',
    '["65 inch 4K HDR Smart TV", "HDMI 2.1 Cable for Laptops / Consoles", "Surround Soundbar with Bluetooth", "Cushioned sofa and beanbags seating", "Air Conditioning & Ceiling Fans", "Cable TV / OTT app streaming"]'::jsonb,
    '["Collect key and remote controls from Representative (Room B-204).", "Keep sound levels reasonable after 10:00 PM (Hostel quiet hours).", "No footwear on sofas or couches; dispose of all snack wrappers and bottles in the bin.", "Do not tamper with display mountings, cable connections, or soundbar settings.", "Turn off TV, Soundbar, and Air Conditioning before locking up and returning the key."]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    rules = EXCLUDED.rules,
    equipment = EXCLUDED.equipment;

-- 9. Seed Default Hostel Settings
INSERT INTO hostel_settings (id, hostel_name, rep_name, rep_room, rep_phone, rep_email, admin_pin, auto_approval)
VALUES
(
    'current',
    'Cauvery Hostel - Block B',
    'Vaanjinathan (Rep)',
    'Room B-204',
    '+91 98765 43210',
    'rep.amenities@hostel.edu',
    '1234',
    true
)
ON CONFLICT (id) DO NOTHING;

-- 10. Enable Row Level Security (RLS)
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to facilities and settings
CREATE POLICY "Public read facilities" ON facilities FOR SELECT USING (true);
CREATE POLICY "Public read hostel_settings" ON hostel_settings FOR SELECT USING (true);

-- Allow public read and insert for bookings, and allow updates
CREATE POLICY "Public read bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Public insert bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update bookings" ON bookings FOR UPDATE USING (true);

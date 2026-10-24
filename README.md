# NITPy Hostel Amenities (Kitchen & TV Room)

Minimalist, dark-mode hostel amenity reservation portal for NIT Puducherry students.

## Features
- **Dark Minimal UI**: High-contrast, utilitarian design with zero bloat or unnecessary instructions.
- **College Email OTP Login**: Strictly validates 8-character alphanumeric roll numbers (e.g. `CS21B101`) and sends a 6-digit OTP to `xxxxx@nitpy.ac.in`.
- **Live Status Indicator**: Real-time display showing whether Kitchen and TV Room are currently free or occupied, and by whom.
- **Facility Toggle**: 1-click toggle between Kitchen and TV Room.
- **Flexible Scheduling**: Up to 3 consecutive hours, date selection, and number of attendees (1-25).
- **Backend Slot Free Checking**: Guaranteed prevention of double-bookings via PostgreSQL exclusion constraints (`btree_gist`) and server-side conflict verification.

## Deployment to Vercel
1. Push to GitHub: `git push -u origin main`
2. Import project into Vercel.
3. (Optional) Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `RESEND_API_KEY`.
4. Deploy!

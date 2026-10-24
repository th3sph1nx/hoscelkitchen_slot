# HostelKeyDesk 🔑
### Common Kitchen & TV Room Key & Slot Booking System

A full-stack hostel amenity reservation and physical key custody management web application designed specifically for hostel representatives and students.

Built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL)**, optimized for the **Vercel** and **Supabase** free tiers.

---

## 🌟 Key Features

### 1. 🛡️ Guaranteed Backend Slot Free Checking (Zero Double Bookings)
- **Database-Level Protection**: Employs PostgreSQL's `btree_gist` extension with an **`EXCLUDE USING gist`** constraint on `(facility_id WITH =, tstzrange(start_time, end_time) WITH &&)`. PostgreSQL mathematically rejects any concurrent overlapping booking at the storage engine level.
- **Server API Validation**: Next.js route handlers (`/api/check-availability` and `/api/bookings`) validate timestamps, operating hours (e.g., 06:00 to 23:30), maximum duration limits (up to 3 hours), and actively query for any overlapping confirmed reservations, returning `409 Conflict` if occupied.

### 2. 🔑 Physical Key Custody & Handover Workflow
- **Live Status Board**: Instant indicator showing whether the **Common Kitchen** or **Common TV Room** is currently occupied, who holds the key, their room number, and when their slot ends.
- **Digital Key Pass (`/booking/[code]`)**: Every booking generates an official Pass with a unique code (e.g., `KIT-8670` or `TV-2048`). Students show this pass at **Room B-204** to collect the physical key.
- **Representative Desk (`/rep`)**: Protected by a representative PIN (default: `1234`), providing 1-click actions:
  - **"Hand Over Key"**: Records pickup timestamp and marks key as `In Use`.
  - **"Mark Key Returned"**: Records return timestamp, returning the key to custody.
  - **Direct Student Contact**: 1-click phone/intercom call button for overdue keys.

### 3. 🍳 Tailored for Hostel Amenities
- **Common Kitchen**: 2x induction stoves, microwave, refrigerator, prep counter, and cooking rules reminder.
- **Common TV Room**: 65" 4K Smart TV, HDMI 2.1 cable, surround soundbar, and quiet hour guidelines.

---

## 🚀 Quick Start (Local Development)

### 1. Install dependencies & run development server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** The application includes a built-in memory/fallback database with seed data, so you can test all features (booking, verification, representative key handover) immediately without configuring any external services!

---

## 🗄️ Supabase Free Tier Setup (2 Minutes)

1. **Create Free Project**:
   - Go to [Supabase](https://supabase.com) and create a free account.
   - Click **"New Project"** and name it (e.g. `hostel-keydesk`).

2. **Run Schema Script**:
   - In your Supabase dashboard, click on **SQL Editor** in the left sidebar.
   - Click **"New query"** and paste the contents of [`supabase/schema.sql`](supabase/schema.sql).
   - Click **Run**. This will create the tables, enable the `btree_gist` extension, add the exclusion constraint, and set up Row Level Security.

3. **Get API Keys**:
   - In Supabase, go to **Project Settings** -> **API**.
   - Copy the **Project URL**, the **anon public** key, and the **service_role** key.

4. **Add to `.env.local`**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ADMIN_PIN=1234
   ```

---

## ☁️ Free Deployment to Vercel

1. Push this repository to GitHub or GitLab.
2. Go to [Vercel](https://vercel.com) and click **"Add New..." -> "Project"**.
3. Import your repository.
4. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PIN` (set your representative passcode)
5. Click **Deploy**. Vercel will build and host your website globally on their edge network with zero cost!

---

## 🧪 Automated Backend Verification Test

Run the backend slot conflict and key handover integration test suite:

```bash
node test/backend-slot-check.test.mjs
```

### Verified Scenarios:
1. Checks empty slot availability on backend.
2. Reserves slot and generates unique reference code.
3. Overlapping slot check correctly detected as unavailable.
4. Simultaneous conflicting booking blocked with `409 Conflict`.
5. Max booking duration limit (3 hrs) enforced.
6. Representative records key handover (`collected` with timestamp).
7. Representative records key return (`returned` with timestamp).
8. Booking cancellation frees up slot for subsequent requests.

---

## 📱 Navigation Sitemap

| Route | Purpose |
| :--- | :--- |
| `/` | Live facility status, equipment guide, and quick booking links |
| `/book` | Interactive visual slot selector with backend conflict checking |
| `/booking/[code]` | Digital Key Pass with pickup instructions for Room B-204 |
| `/my-bookings` | Search and manage bookings by Roll Number or Pass Code |
| `/rep` | Representative Admin Desk (Key handover, custody, contacts) |
| `/api/bookings` | REST endpoint with atomic DB slot verification |
| `/api/check-availability` | Backend real-time slot conflict checker |

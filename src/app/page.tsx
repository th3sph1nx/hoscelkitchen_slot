'use client';

import React, { useState, useEffect } from 'react';
import { FacilityId, Booking, CurrentStatus } from '@/lib/types';
import { format, addDays } from 'date-fns';

export default function Home() {
  // Authentication State
  const [userRoll, setUserRoll] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // OTP login form state
  const [loginRollInput, setLoginRollInput] = useState<string>('');
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authMsg, setAuthMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);

  // Booking Form State
  const [facility, setFacility] = useState<FacilityId>('kitchen');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [startHour, setStartHour] = useState<number>(18); // 18:00 (6 PM)
  const [durationHours, setDurationHours] = useState<number>(1);
  const [peopleCount, setPeopleCount] = useState<number>(2);
  const [purpose, setPurpose] = useState<string>('');

  // Live status & active bookings
  const [status, setStatus] = useState<CurrentStatus | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [bookingMsg, setBookingMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Load session from localStorage
  useEffect(() => {
    const savedRoll = localStorage.getItem('nitpy_user_roll');
    const savedEmail = localStorage.getItem('nitpy_user_email');
    if (savedRoll && savedEmail) {
      setUserRoll(savedRoll);
      setUserEmail(savedEmail);
      setIsLoggedIn(true);
    }
  }, []);

  // Poll current live status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
      }
    } catch {
      // quiet fallback
    }
  };

  // Fetch bookings for the selected date
  const fetchDayBookings = async () => {
    try {
      const res = await fetch(`/api/bookings?facility_id=${facility}&date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setDayBookings(data.bookings || []);
      }
    } catch {
      // quiet fallback
    }
  };

  // Fetch logged in student's bookings
  const fetchMyBookings = async () => {
    if (!userRoll) return;
    try {
      const res = await fetch(`/api/bookings?roll_number=${userRoll}`);
      if (res.ok) {
        const data = await res.json();
        setMyBookings(data.bookings || []);
      }
    } catch {
      // quiet fallback
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchDayBookings();
  }, [facility, selectedDate]);

  useEffect(() => {
    if (isLoggedIn && userRoll) {
      fetchMyBookings();
    }
  }, [isLoggedIn, userRoll]);

  // Request OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMsg(null);
    setDevOtpCode(null);

    const roll = loginRollInput.trim().toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(roll)) {
      setAuthMsg({ text: 'Roll number must be 8 alphanumeric chars (e.g. CS21B101)', isError: true });
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNumber: roll }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setOtpSent(true);
      setAuthMsg({ text: `OTP sent to ${data.email}`, isError: false });
      if (data.devOtp) {
        setDevOtpCode(data.devOtp);
      }
    } catch (err: any) {
      setAuthMsg({ text: err.message || 'Failed to send OTP', isError: true });
    } finally {
      setAuthLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMsg(null);

    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNumber: loginRollInput.trim().toUpperCase(),
          code: otpInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUserRoll(data.rollNumber);
      setUserEmail(data.email);
      setIsLoggedIn(true);
      localStorage.setItem('nitpy_user_roll', data.rollNumber);
      localStorage.setItem('nitpy_user_email', data.email);
      setOtpSent(false);
      setLoginRollInput('');
      setOtpInput('');
      setDevOtpCode(null);
    } catch (err: any) {
      setAuthMsg({ text: err.message || 'Invalid OTP', isError: true });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nitpy_user_roll');
    localStorage.removeItem('nitpy_user_email');
    setIsLoggedIn(false);
    setUserRoll('');
    setUserEmail('');
    setMyBookings([]);
  };

  // Calculate selected slot ISO strings
  const pad = (n: number) => String(n).padStart(2, '0');
  const startISO = `${selectedDate}T${pad(startHour)}:00:00.000Z`;
  const endHour = startHour + durationHours;
  const endISO = `${selectedDate}T${pad(endHour)}:00:00.000Z`;

  // Check if selected time slot has local conflict
  const isSlotConflicted = dayBookings.some((b) => {
    if (b.status !== 'confirmed') return false;
    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();
    const reqStart = new Date(startISO).getTime();
    const reqEnd = new Date(endISO).getTime();
    return reqStart < bEnd && reqEnd > bStart;
  });

  // Handle Booking Submission
  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingMsg(null);

    if (!isLoggedIn) {
      setBookingMsg({ text: 'Please login with your roll number first.', isError: true });
      return;
    }

    setBookingLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_id: facility,
          roll_number: userRoll,
          attendees_count: peopleCount,
          start_time: startISO,
          end_time: endISO,
          purpose: purpose.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBookingMsg({
        text: `Booked successfully! Reference: ${data.booking.booking_code}`,
        isError: false,
      });

      fetchStatus();
      fetchDayBookings();
      fetchMyBookings();
    } catch (err: any) {
      setBookingMsg({ text: err.message || 'Booking conflict on backend.', isError: true });
    } finally {
      setBookingLoading(false);
    }
  };

  // Cancel booking
  const handleCancelBooking = async (code: string) => {
    if (!confirm(`Cancel booking ${code}?`)) return;
    try {
      const res = await fetch(`/api/bookings/${code}?roll_number=${userRoll}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchStatus();
        fetchDayBookings();
        fetchMyBookings();
      }
    } catch {
      alert('Failed to cancel');
    }
  };

  // Quick dates (Today, Tomorrow, Day+2, Day+3)
  const quickDates = [0, 1, 2, 3].map((offset) => {
    const d = addDays(new Date(), offset);
    return {
      dateStr: format(d, 'yyyy-MM-dd'),
      label: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : format(d, 'EEE, d MMM'),
    };
  });

  return (
    <div className="space-y-8 font-mono text-xs sm:text-sm">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <span className="font-bold text-zinc-100 tracking-wider text-base">NITPY AMENITIES</span>
          <p className="text-zinc-500 text-xs font-sans">Hostel Kitchen & TV Room Slot Portal</p>
        </div>

        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <span className="text-zinc-300 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded">
              {userRoll}
            </span>
            <button
              onClick={handleLogout}
              className="text-zinc-500 hover:text-zinc-200 underline text-xs font-sans"
            >
              Logout
            </button>
          </div>
        ) : (
          <span className="text-zinc-500 text-xs font-sans">Not logged in</span>
        )}
      </div>

      {/* LOGIN CARD IF NOT LOGGED IN */}
      {!isLoggedIn && (
        <div className="border border-zinc-800 bg-zinc-900/60 p-4 rounded-lg space-y-3">
          <div className="text-zinc-300 font-bold uppercase tracking-wider text-xs">
            Student Login (College ID)
          </div>

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={8}
                  placeholder="Roll No (e.g. CS21B101)"
                  value={loginRollInput}
                  onChange={(e) => setLoginRollInput(e.target.value.toUpperCase())}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 uppercase tracking-widest focus:outline-none focus:border-zinc-500"
                />
                <button
                  type="submit"
                  disabled={authLoading}
                  className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-4 py-2 rounded transition-colors disabled:opacity-50"
                >
                  {authLoading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                OTP will be sent to{' '}
                <span className="text-zinc-400">
                  {loginRollInput ? `${loginRollInput.toLowerCase()}@nitpy.ac.in` : 'xxxxx@nitpy.ac.in'}
                </span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 tracking-widest focus:outline-none focus:border-zinc-500"
                />
                <button
                  type="submit"
                  disabled={authLoading}
                  className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-4 py-2 rounded transition-colors disabled:opacity-50"
                >
                  {authLoading ? 'Verifying...' : 'Verify'}
                </button>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="bg-zinc-800 text-zinc-300 px-3 py-2 rounded hover:bg-zinc-700"
                >
                  Back
                </button>
              </div>

              {devOtpCode && (
                <div className="text-[11px] bg-zinc-800/80 border border-zinc-700 p-2 rounded text-zinc-300">
                  Test OTP: <strong className="text-sky-400 font-mono tracking-widest">{devOtpCode}</strong>
                </div>
              )}
            </form>
          )}

          {authMsg && (
            <div
              className={`text-xs p-2 rounded ${
                authMsg.isError ? 'bg-rose-950/50 text-rose-300 border border-rose-900' : 'bg-emerald-950/50 text-emerald-300 border border-emerald-900'
              }`}
            >
              {authMsg.text}
            </div>
          )}
        </div>
      )}

      {/* CURRENT LIVE STATUS */}
      <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-4 space-y-2.5">
        <div className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
          Live Status
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Kitchen Status */}
          <div className="p-3 border border-zinc-800 bg-zinc-950 rounded">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200">Kitchen</span>
              {status?.kitchen.isOccupied ? (
                <span className="text-rose-400 font-bold">● Occupied</span>
              ) : (
                <span className="text-emerald-400 font-bold">● Free</span>
              )}
            </div>
            <div className="mt-1 text-zinc-400 text-[11px]">
              {status?.kitchen.isOccupied ? (
                <span>
                  By {status.kitchen.currentBooking?.roll_number} until{' '}
                  {status.kitchen.currentBooking?.end_time
                    ? new Date(status.kitchen.currentBooking.end_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              ) : (
                <span>Available for booking</span>
              )}
            </div>
          </div>

          {/* TV Room Status */}
          <div className="p-3 border border-zinc-800 bg-zinc-950 rounded">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200">TV Room</span>
              {status?.tvRoom.isOccupied ? (
                <span className="text-rose-400 font-bold">● Occupied</span>
              ) : (
                <span className="text-emerald-400 font-bold">● Free</span>
              )}
            </div>
            <div className="mt-1 text-zinc-400 text-[11px]">
              {status?.tvRoom.isOccupied ? (
                <span>
                  By {status.tvRoom.currentBooking?.roll_number} until{' '}
                  {status.tvRoom.currentBooking?.end_time
                    ? new Date(status.tvRoom.currentBooking.end_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              ) : (
                <span>Available for booking</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BOOKING INTERFACE */}
      <form onSubmit={handleBook} className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-4 sm:p-5 space-y-5">
        {/* Facility Toggle */}
        <div>
          <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">
            Facility
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFacility('kitchen')}
              className={`py-2 px-3 rounded text-center font-bold transition-all border ${
                facility === 'kitchen'
                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              Kitchen
            </button>
            <button
              type="button"
              onClick={() => setFacility('tv-room')}
              className={`py-2 px-3 rounded text-center font-bold transition-all border ${
                facility === 'tv-room'
                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              TV Room
            </button>
          </div>
        </div>

        {/* Date Selector */}
        <div>
          <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">
            Date
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickDates.map((item) => (
              <button
                type="button"
                key={item.dateStr}
                onClick={() => setSelectedDate(item.dateStr)}
                className={`py-2 px-2 text-center rounded border transition-all ${
                  selectedDate === item.dateStr
                    ? 'bg-zinc-200 text-zinc-950 font-bold border-zinc-200'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start Time & Consecutive Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">
              Start Hour (06:00 to 22:00)
            </label>
            <select
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600"
            >
              {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
                <option key={h} value={h}>
                  {pad(h)}:00 ({h > 12 ? `${h - 12} PM` : h === 12 ? '12 PM' : `${h} AM`})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">
              Duration (Max 3 hours)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((dur) => (
                <button
                  type="button"
                  key={dur}
                  onClick={() => setDurationHours(dur)}
                  className={`py-2 text-center rounded border transition-all ${
                    durationHours === dur
                      ? 'bg-zinc-200 text-zinc-950 font-bold border-zinc-200'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {dur} {dur === 1 ? 'hr' : 'hrs'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Number of People & Purpose */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">
              Number of People
            </label>
            <input
              type="number"
              min={1}
              max={25}
              value={peopleCount}
              onChange={(e) => setPeopleCount(Math.max(1, Number(e.target.value)))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">
              Purpose (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Cooking dinner / match screening"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>

        {/* Live Slot Status Pill */}
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            Selected: <strong className="text-zinc-200">{pad(startHour)}:00</strong> to{' '}
            <strong className="text-zinc-200">{pad(endHour)}:00</strong> ({selectedDate})
          </span>
          {isSlotConflicted ? (
            <span className="text-rose-400 font-bold">● Slot Busy</span>
          ) : (
            <span className="text-emerald-400 font-bold">● Slot Free</span>
          )}
        </div>

        {bookingMsg && (
          <div
            className={`text-xs p-3 rounded border ${
              bookingMsg.isError ? 'bg-rose-950/40 text-rose-300 border-rose-900' : 'bg-emerald-950/40 text-emerald-300 border-emerald-900'
            }`}
          >
            {bookingMsg.text}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={bookingLoading || isSlotConflicted || !isLoggedIn}
          className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {bookingLoading ? 'Checking Slot & Booking...' : 'Confirm Booking'}
        </button>
      </form>

      {/* MY BOOKINGS */}
      {isLoggedIn && myBookings.length > 0 && (
        <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-4 space-y-3">
          <div className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
            My Bookings ({myBookings.length})
          </div>

          <div className="space-y-2 text-xs">
            {myBookings.map((b) => (
              <div
                key={b.id}
                className="p-3 border border-zinc-800 bg-zinc-950 rounded flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-100">
                      {b.facility_id === 'kitchen' ? 'Kitchen' : 'TV Room'}
                    </span>
                    <span className="text-zinc-500">[{b.booking_code}]</span>
                    <span className="text-zinc-400">({b.attendees_count} people)</span>
                  </div>
                  <div className="text-zinc-400 text-[11px] mt-0.5">
                    {format(new Date(b.start_time), 'dd MMM yyyy, HH:mm')} –{' '}
                    {format(new Date(b.end_time), 'HH:mm')}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCancelBooking(b.booking_code)}
                  className="text-rose-400 hover:text-rose-300 underline text-xs"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

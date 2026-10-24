'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FacilityId, Booking, CurrentStatus, BlacklistEntry, CooldownEntry, ADMIN_ROLL } from '@/lib/types';
import { format, addDays } from 'date-fns';

export default function Home() {
  // Authentication State
  const [userRoll, setUserRoll] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // View state: 'booker' | 'admin'
  const [activeView, setActiveView] = useState<'booker' | 'admin'>('booker');

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

  // Live background slot availability checking state
  const [backendAvailability, setBackendAvailability] = useState<{
    status: 'checking' | 'available' | 'occupied';
    message: string;
    occupiedBy?: string;
  }>({ status: 'checking', message: 'Checking slot status in background...' });

  // Live status & active bookings
  const [status, setStatus] = useState<CurrentStatus | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [bookingMsg, setBookingMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // ADMIN PANEL STATE
  const [adminTab, setAdminTab] = useState<'slots' | 'blacklist' | 'cooldown'>('slots');
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [cooldowns, setCooldowns] = useState<CooldownEntry[]>([]);
  const [adminMsg, setAdminMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Admin Blacklist form
  const [newBlacklistRoll, setNewBlacklistRoll] = useState('');
  const [newBlacklistReason, setNewBlacklistReason] = useState('');

  // Admin Cooldown form
  const [newCooldownRoll, setNewCooldownRoll] = useState('');
  const [newCooldownHours, setNewCooldownHours] = useState(24);
  const [newCooldownReason, setNewCooldownReason] = useState('');

  // Admin timing edit state
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [editStartHour, setEditStartHour] = useState<number>(18);
  const [editEndHour, setEditEndHour] = useState<number>(20);

  const isAdmin = userRoll.toUpperCase() === ADMIN_ROLL;

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

  // Poll current live facility status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
      }
    } catch {}
  };

  const fetchMyBookings = async () => {
    if (!userRoll) return;
    try {
      const res = await fetch(`/api/bookings?roll_number=${userRoll}`);
      if (res.ok) {
        const data = await res.json();
        setMyBookings(data.bookings || []);
      }
    } catch {}
  };

  const fetchAdminData = async () => {
    if (!isAdmin) return;
    try {
      const headers = { 'x-admin-roll': ADMIN_ROLL };
      const [bRes, blRes, cdRes] = await Promise.all([
        fetch('/api/admin/bookings', { headers }),
        fetch('/api/admin/blacklist', { headers }),
        fetch('/api/admin/cooldown', { headers }),
      ]);

      if (bRes.ok) {
        const b = await bRes.json();
        setAllBookings(b.bookings || []);
      }
      if (blRes.ok) {
        const bl = await blRes.json();
        setBlacklist(bl.blacklist || []);
      }
      if (cdRes.ok) {
        const cd = await cdRes.json();
        setCooldowns(cd.cooldowns || []);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isLoggedIn && userRoll) {
      fetchMyBookings();
      if (isAdmin) fetchAdminData();
    }
  }, [isLoggedIn, userRoll]);

  // Calculate selected slot ISO strings
  const pad = (n: number) => String(n).padStart(2, '0');
  const startISO = `${selectedDate}T${pad(startHour)}:00:00.000Z`;
  const endHour = startHour + durationHours;
  const endISO = `${selectedDate}T${pad(endHour)}:00:00.000Z`;

  // BACKGROUND SLOT STATUS CHECKING
  // Runs automatically whenever facility, date, start hour, or duration changes
  useEffect(() => {
    let isCancelled = false;
    setBackendAvailability({
      status: 'checking',
      message: 'Checking slot status in background...',
    });

    const checkBackgroundSlot = async () => {
      try {
        const res = await fetch('/api/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facilityId: facility,
            startTime: startISO,
            endTime: endISO,
          }),
        });

        const data = await res.json();
        if (isCancelled) return;

        if (res.ok && data.isAvailable) {
          setBackendAvailability({
            status: 'available',
            message: '● Slot Free - Ready to book',
          });
        } else {
          setBackendAvailability({
            status: 'occupied',
            message: data.reason || '● Slot Occupied by another student',
            occupiedBy: data.conflicts?.[0]?.roll_number,
          });
        }
      } catch (err) {
        if (!isCancelled) {
          setBackendAvailability({
            status: 'available',
            message: '● Slot Check Ready',
          });
        }
      }
    };

    const timer = setTimeout(checkBackgroundSlot, 150);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [facility, selectedDate, startHour, durationHours]);

  // Request Supabase OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMsg(null);
    setDevOtpCode(null);

    const roll = loginRollInput.trim().toUpperCase();
    if (!/^[A-Z0-9]{8,10}$/.test(roll)) {
      setAuthMsg({ text: 'Roll number must be 8-10 alphanumeric characters (e.g. CS25B1058)', isError: true });
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
      setAuthMsg({ text: `OTP sent via Supabase to ${data.email}. Check your inbox.`, isError: false });
      if (data.devOtp) {
        setDevOtpCode(data.devOtp);
      }
    } catch (err: any) {
      setAuthMsg({ text: err.message || 'Failed to send OTP via Supabase', isError: true });
    } finally {
      setAuthLoading(false);
    }
  };

  // Verify Supabase OTP
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
      setAuthMsg({ text: err.message || 'Invalid or expired OTP', isError: true });
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
    setActiveView('booker');
  };

  // Handle Booking Submission with Background Pre-check Guard
  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingMsg(null);

    if (!isLoggedIn) {
      setBookingMsg({ text: 'Please login with your roll number first.', isError: true });
      return;
    }

    if (backendAvailability.status === 'occupied') {
      setBookingMsg({
        text: `Cannot book: ${backendAvailability.message}`,
        isError: true,
      });
      return;
    }

    setBookingLoading(true);
    try {
      // 1. Proactive background check before alerting the user
      const precheck = await fetch('/api/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId: facility,
          startTime: startISO,
          endTime: endISO,
        }),
      });
      const precheckData = await precheck.json();
      if (!precheck.ok || !precheckData.isAvailable) {
        setBackendAvailability({
          status: 'occupied',
          message: precheckData.reason || 'Slot occupied',
        });
        throw new Error(precheckData.reason || 'This slot was just booked by another student.');
      }

      // 2. Submit booking to backend
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
      fetchMyBookings();
      if (isAdmin) fetchAdminData();
    } catch (err: any) {
      setBookingMsg({ text: err.message || 'Booking conflict on backend.', isError: true });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async (code: string) => {
    if (!confirm(`Cancel booking ${code}?`)) return;
    try {
      const res = await fetch(`/api/bookings/${code}?roll_number=${userRoll}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchStatus();
        fetchMyBookings();
        if (isAdmin) fetchAdminData();
      }
    } catch {
      alert('Failed to cancel');
    }
  };

  // ADMIN ACTIONS
  const handleAdminDeleteBooking = async (id: string, code: string) => {
    if (!confirm(`Admin: Remove booking ${code}?`)) return;
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-roll': ADMIN_ROLL },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAdminMsg({ text: `Slot ${code} removed`, isError: false });
      fetchAdminData();
      fetchStatus();
    } catch (err: any) {
      setAdminMsg({ text: err.message, isError: true });
    }
  };

  const handleAdminUpdateTiming = async (booking: Booking) => {
    setAdminMsg(null);
    const dateStr = booking.start_time.slice(0, 10);
    const newStartISO = `${dateStr}T${pad(editStartHour)}:00:00.000Z`;
    const newEndISO = `${dateStr}T${pad(editEndHour)}:00:00.000Z`;

    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-roll': ADMIN_ROLL,
        },
        body: JSON.stringify({
          start_time: newStartISO,
          end_time: newEndISO,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAdminMsg({ text: `Timing updated for ${booking.booking_code}`, isError: false });
      setEditingBookingId(null);
      fetchAdminData();
      fetchStatus();
    } catch (err: any) {
      setAdminMsg({ text: err.message || 'Conflict: Slot occupied by another booking', isError: true });
    }
  };

  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMsg(null);
    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-roll': ADMIN_ROLL,
        },
        body: JSON.stringify({
          roll_number: newBlacklistRoll.trim().toUpperCase(),
          reason: newBlacklistReason.trim() || 'Rule violation',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAdminMsg({ text: `Blacklisted ${newBlacklistRoll.toUpperCase()}`, isError: false });
      setNewBlacklistRoll('');
      setNewBlacklistReason('');
      fetchAdminData();
    } catch (err: any) {
      setAdminMsg({ text: err.message, isError: true });
    }
  };

  const handleRemoveBlacklist = async (roll: string) => {
    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-roll': ADMIN_ROLL,
        },
        body: JSON.stringify({ roll_number: roll }),
      });
      if (res.ok) {
        setAdminMsg({ text: `Removed ${roll} from blacklist`, isError: false });
        fetchAdminData();
      }
    } catch {}
  };

  const handleApplyCooldown = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMsg(null);
    try {
      const res = await fetch('/api/admin/cooldown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-roll': ADMIN_ROLL,
        },
        body: JSON.stringify({
          roll_number: newCooldownRoll.trim().toUpperCase(),
          hours: Number(newCooldownHours) || 24,
          reason: newCooldownReason.trim() || 'Cooldown applied by admin',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAdminMsg({ text: `Cooldown of ${newCooldownHours}h applied to ${newCooldownRoll.toUpperCase()}`, isError: false });
      setNewCooldownRoll('');
      setNewCooldownReason('');
      fetchAdminData();
    } catch (err: any) {
      setAdminMsg({ text: err.message, isError: true });
    }
  };

  const handleRemoveCooldown = async (roll: string) => {
    try {
      const res = await fetch('/api/admin/cooldown', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-roll': ADMIN_ROLL,
        },
        body: JSON.stringify({ roll_number: roll }),
      });
      if (res.ok) {
        setAdminMsg({ text: `Cooldown lifted for ${roll}`, isError: false });
        fetchAdminData();
      }
    } catch {}
  };

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
          <span className="font-bold text-zinc-100 tracking-wider text-base">GANGA AMENITIES</span>
          <p className="text-zinc-500 text-xs font-sans">Kitchen & TV Room Portal (ganga-roomaccess)</p>
        </div>

        {isLoggedIn ? (
          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveView(activeView === 'admin' ? 'booker' : 'admin')}
                className={`px-2.5 py-1 rounded text-xs font-bold uppercase transition-all ${
                  activeView === 'admin'
                    ? 'bg-amber-400 text-zinc-950 font-black ring-2 ring-amber-400/50'
                    : 'bg-zinc-800 text-amber-300 border border-amber-400/40 hover:bg-zinc-700'
                }`}
              >
                {activeView === 'admin' ? 'Exit Admin' : 'Admin Panel'}
              </button>
            )}

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
          <div className="text-zinc-300 font-bold uppercase tracking-wider text-xs flex items-center justify-between">
            <span>Student / Admin Login (College ID)</span>
            <span className="text-[10px] text-sky-400 font-normal">Supabase Auth Free Tier</span>
          </div>

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={10}
                  placeholder="Roll No (e.g. CS25B1058)"
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
                <span className="text-zinc-400 font-semibold">
                  {loginRollInput ? `${loginRollInput.toLowerCase()}@nitpy.ac.in` : 'xxxxx@nitpy.ac.in'}
                </span>{' '}
                via Supabase.
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
                  Backup / Dev OTP: <strong className="text-sky-400 font-mono tracking-widest">{devOtpCode}</strong>
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

      {/* ========================================================= */}
      {/* ADMIN PANEL VIEW (Only visible for CS25B1058) */}
      {/* ========================================================= */}
      {isLoggedIn && isAdmin && activeView === 'admin' ? (
        <div className="space-y-6">
          <div className="p-4 bg-zinc-900 border border-amber-500/50 rounded-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <span className="text-amber-400 font-bold text-sm uppercase">ADMIN CONTROL PANEL</span>
                <p className="text-[11px] text-zinc-400 font-sans">Authorized Roll: {ADMIN_ROLL} • Full Room Access Oversight</p>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => setAdminTab('slots')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    adminTab === 'slots' ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All Slots ({allBookings.length})
                </button>
                <button
                  onClick={() => setAdminTab('blacklist')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    adminTab === 'blacklist' ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Blacklist ({blacklist.length})
                </button>
                <button
                  onClick={() => setAdminTab('cooldown')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    adminTab === 'cooldown' ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Cooldowns ({cooldowns.length})
                </button>
              </div>
            </div>

            {adminMsg && (
              <div
                className={`p-2.5 rounded text-xs border ${
                  adminMsg.isError ? 'bg-rose-950/60 text-rose-300 border-rose-900' : 'bg-emerald-950/60 text-emerald-300 border-emerald-900'
                }`}
              >
                {adminMsg.text}
              </div>
            )}

            {/* TAB 1: ALL SLOTS MANAGEMENT */}
            {adminTab === 'slots' && (
              <div className="space-y-3">
                <div className="text-zinc-400 text-xs uppercase font-semibold">
                  Manage All Facility Slots
                </div>

                {allBookings.length === 0 ? (
                  <p className="text-zinc-500 text-xs py-4 text-center">No bookings on record.</p>
                ) : (
                  <div className="space-y-2">
                    {allBookings.map((b) => {
                      const isEditing = editingBookingId === b.id;
                      const isConfirmed = b.status === 'confirmed';

                      return (
                        <div
                          key={b.id}
                          className={`p-3 border rounded space-y-2 ${
                            isConfirmed ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-900 bg-zinc-950/40 opacity-50'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-zinc-100 uppercase">
                                [{b.booking_code}] {b.facility_id}
                              </span>{' '}
                              <span className="text-amber-300 font-bold">{b.roll_number}</span>{' '}
                              <span className="text-zinc-500">({b.attendees_count} ppl)</span>
                              <div className="text-[11px] text-zinc-400">
                                {format(new Date(b.start_time), 'dd MMM yyyy, HH:mm')} –{' '}
                                {format(new Date(b.end_time), 'HH:mm')}
                                {b.purpose && ` • "${b.purpose}"`}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isConfirmed && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isEditing) {
                                        setEditingBookingId(null);
                                      } else {
                                        setEditingBookingId(b.id);
                                        const sH = new Date(b.start_time).getUTCHours();
                                        const eH = new Date(b.end_time).getUTCHours();
                                        setEditStartHour(sH);
                                        setEditEndHour(eH);
                                      }
                                    }}
                                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs"
                                  >
                                    {isEditing ? 'Cancel Edit' : 'Change Timing'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleAdminDeleteBooking(b.id, b.booking_code)}
                                    className="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-xs"
                                  >
                                    Remove
                                  </button>
                                </>
                              )}
                              {!isConfirmed && (
                                <span className="text-zinc-500 text-xs italic">[Cancelled]</span>
                              )}
                            </div>
                          </div>

                          {/* INLINE TIMING EDITOR */}
                          {isEditing && (
                            <div className="pt-2 border-t border-zinc-800 flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-zinc-400">New Hours:</span>
                              <select
                                value={editStartHour}
                                onChange={(e) => setEditStartHour(Number(e.target.value))}
                                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-200"
                              >
                                {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
                                  <option key={h} value={h}>{pad(h)}:00</option>
                                ))}
                              </select>
                              <span>to</span>
                              <select
                                value={editEndHour}
                                onChange={(e) => setEditEndHour(Number(e.target.value))}
                                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-200"
                              >
                                {Array.from({ length: 17 }, (_, i) => i + 7).map((h) => (
                                  <option key={h} value={h}>{pad(h)}:00</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleAdminUpdateTiming(b)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded"
                              >
                                Save Timing
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: BLACKLIST MANAGEMENT */}
            {adminTab === 'blacklist' && (
              <div className="space-y-4">
                <form onSubmit={handleAddBlacklist} className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-2">
                  <div className="text-zinc-400 text-xs uppercase font-semibold">Blacklist a Roll Number</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Roll Number (e.g. ME21B045)"
                      value={newBlacklistRoll}
                      onChange={(e) => setNewBlacklistRoll(e.target.value.toUpperCase())}
                      className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-zinc-100 uppercase"
                    />
                    <input
                      type="text"
                      placeholder="Reason (e.g. left kitchen dirty)"
                      value={newBlacklistReason}
                      onChange={(e) => setNewBlacklistReason(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-zinc-100"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-xs"
                  >
                    Add to Blacklist (Blocked on Backend)
                  </button>
                </form>

                <div className="space-y-2">
                  <div className="text-zinc-400 text-xs uppercase font-semibold">Active Blacklist ({blacklist.length})</div>
                  {blacklist.length === 0 ? (
                    <p className="text-zinc-500 text-xs py-2">No students currently blacklisted.</p>
                  ) : (
                    blacklist.map((item) => (
                      <div
                        key={item.roll_number}
                        className="p-3 border border-rose-900/60 bg-rose-950/20 rounded flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-rose-300">{item.roll_number}</span>
                          <span className="text-zinc-400 ml-2">Reason: {item.reason || 'None specified'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBlacklist(item.roll_number)}
                          className="text-zinc-400 hover:text-white underline text-xs"
                        >
                          Un-blacklist
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: COOLDOWN MANAGEMENT */}
            {adminTab === 'cooldown' && (
              <div className="space-y-4">
                <form onSubmit={handleApplyCooldown} className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-2">
                  <div className="text-zinc-400 text-xs uppercase font-semibold">Apply Cooldown to a Roll Number</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Roll Number (e.g. EC22B019)"
                      value={newCooldownRoll}
                      onChange={(e) => setNewCooldownRoll(e.target.value.toUpperCase())}
                      className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-zinc-100 uppercase"
                    />
                    <select
                      value={newCooldownHours}
                      onChange={(e) => setNewCooldownHours(Number(e.target.value))}
                      className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-zinc-100"
                    >
                      <option value={12}>12 Hours Cooldown</option>
                      <option value={24}>24 Hours Cooldown</option>
                      <option value={48}>48 Hours Cooldown</option>
                      <option value={72}>72 Hours Cooldown</option>
                      <option value={168}>7 Days Cooldown</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Reason for cooldown"
                      value={newCooldownReason}
                      onChange={(e) => setNewCooldownReason(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-zinc-100"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded text-xs"
                  >
                    Apply Cooldown (Blocked on Backend)
                  </button>
                </form>

                <div className="space-y-2">
                  <div className="text-zinc-400 text-xs uppercase font-semibold">Active Cooldowns ({cooldowns.length})</div>
                  {cooldowns.length === 0 ? (
                    <p className="text-zinc-500 text-xs py-2">No students currently on cooldown.</p>
                  ) : (
                    cooldowns.map((item) => (
                      <div
                        key={item.roll_number}
                        className="p-3 border border-amber-900/60 bg-amber-950/20 rounded flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-amber-300">{item.roll_number}</span>
                          <span className="text-zinc-400 ml-2">
                            Expires: {new Date(item.expires_at).toLocaleString()}
                          </span>
                          {item.reason && <p className="text-[11px] text-zinc-500 mt-0.5">Note: {item.reason}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCooldown(item.roll_number)}
                          className="text-zinc-400 hover:text-white underline text-xs"
                        >
                          Lift Cooldown
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* STANDARD STUDENT BOOKING VIEW */
        /* ========================================================= */
        <div className="space-y-8">
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

            {/* LIVE BACKGROUND SLOT STATUS INDICATOR */}
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
              <span className="text-zinc-400">
                Selected: <strong className="text-zinc-200">{pad(startHour)}:00</strong> to{' '}
                <strong className="text-zinc-200">{pad(endHour)}:00</strong> ({selectedDate})
              </span>

              <div>
                {backendAvailability.status === 'checking' && (
                  <span className="text-sky-400 animate-pulse font-medium">
                    ⟳ Checking slot status in background...
                  </span>
                )}
                {backendAvailability.status === 'available' && (
                  <span className="text-emerald-400 font-bold">
                    {backendAvailability.message}
                  </span>
                )}
                {backendAvailability.status === 'occupied' && (
                  <span className="text-rose-400 font-bold">
                    {backendAvailability.message}
                  </span>
                )}
              </div>
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
              disabled={bookingLoading || backendAvailability.status === 'occupied' || !isLoggedIn}
              className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {bookingLoading ? 'Verifying with Backend & Booking...' : 'Confirm Booking'}
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
      )}
    </div>
  );
}

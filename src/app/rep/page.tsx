'use client';

import React, { useState, useEffect } from 'react';
import { Booking, FacilityId, HostelSettings, KeyStatus } from '@/lib/types';
import { DEFAULT_HOSTEL_SETTINGS, FACILITIES } from '@/lib/constants';
import { formatDateTime, formatTimeOnly, formatDateOnly } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import {
  KeyRound,
  ShieldCheck,
  UtensilsCrossed,
  Tv,
  CheckCircle2,
  Clock,
  Phone,
  AlertTriangle,
  UserCheck,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  CheckCheck,
  XCircle,
  Database,
  Lock,
  LogOut,
  Settings,
  Calendar,
} from 'lucide-react';

export default function RepresentativePortal() {
  const [pinInput, setPinInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<HostelSettings>(DEFAULT_HOSTEL_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [filterFacility, setFilterFacility] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Key action loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Settings edit modal state
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editForm, setEditForm] = useState({
    rep_name: '',
    rep_room: '',
    rep_phone: '',
    admin_pin: '',
  });

  // Check session storage on mount
  useEffect(() => {
    const savedPin = sessionStorage.getItem('rep_auth_pin');
    if (savedPin === '1234') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1234' || pinInput === settings.admin_pin) {
      setIsAuthenticated(true);
      setAuthError(false);
      sessionStorage.setItem('rep_auth_pin', pinInput);
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('rep_auth_pin');
    setIsAuthenticated(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [bookingsRes, settingsRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/settings'),
      ]);

      if (bookingsRes.ok) {
        const bData = await bookingsRes.json();
        setBookings(bData.bookings || []);
      }
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        if (sData.settings) {
          setSettings(sData.settings);
          setEditForm({
            rep_name: sData.settings.rep_name,
            rep_room: sData.settings.rep_room,
            rep_phone: sData.settings.rep_phone,
            admin_pin: '1234',
          });
        }
      }
    } catch (err) {
      console.error('Error loading representative data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      const interval = setInterval(loadData, 20000); // 20s auto refresh
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Key Handover action: Rep gives key to student
  const handleKeyHandover = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_status: 'collected',
          key_collected_at: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        await loadData();
      } else {
        alert('Failed to record key handover');
      }
    } catch (err) {
      alert('Network error while updating key handover status');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Key Return action: Student returns key to Rep
  const handleKeyReturn = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_status: 'returned',
          key_returned_at: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        await loadData();
      } else {
        alert('Failed to record key return');
      }
    } catch (err) {
      alert('Network error while updating key return status');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cancel booking
  const handleCancelBooking = async (bookingId: string) => {
    const ok = window.confirm('Cancel this booking and free the slot?');
    if (!ok) return;

    setActionLoadingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) {
        await loadData();
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: '1234', // Rep PIN authorization
          rep_name: editForm.rep_name,
          rep_room: editForm.rep_room,
          rep_phone: editForm.rep_phone,
        }),
      });
      if (res.ok) {
        setIsEditingSettings(false);
        loadData();
      } else {
        alert('Failed to update settings');
      }
    } catch (err) {
      alert('Network error saving settings');
    }
  };

  // LOGIN SCREEN IF NOT AUTHENTICATED
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen py-16 flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center mx-auto mb-4 border border-orange-200">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Representative Desk
          </h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Enter representative PIN to manage keys, approve handovers, and track room custody.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={8}
                placeholder="Enter PIN (Default: 1234)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-mono px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              {authError && (
                <p className="text-xs text-rose-600 mt-1.5 font-medium">
                  Incorrect PIN. Default PIN is 1234.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all"
            >
              Unlock Representative Desk
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400">
            Default Representative PIN is <strong className="text-slate-600">1234</strong>.
          </div>
        </div>
      </div>
    );
  }

  // CURRENT ACTIVE KEY CUSTODIANS
  const activeKitchenBooking = bookings.find(
    (b) => b.facility_id === 'kitchen' && b.status === 'confirmed' && b.key_status === 'collected'
  );

  const activeTvBooking = bookings.find(
    (b) => b.facility_id === 'tv-room' && b.status === 'confirmed' && b.key_status === 'collected'
  );

  // Filtered bookings list
  const filteredBookings = bookings.filter((b) => {
    if (filterFacility !== 'all' && b.facility_id !== filterFacility) return false;
    if (filterDate === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      if (!b.start_time.startsWith(today)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        b.booking_code.toLowerCase().includes(q) ||
        b.student_name.toLowerCase().includes(q) ||
        b.student_roll.toLowerCase().includes(q) ||
        b.student_room.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="py-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Rep Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-orange-500 text-white shadow-sm">
                <KeyRound className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Representative Key Desk
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                Live Admin Mode
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Rep: <strong>{settings.rep_name}</strong> • Desk:{' '}
              <strong>{settings.rep_room}</strong> • Contact:{' '}
              <strong>{settings.rep_phone}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5"
              title="Refresh bookings"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={() => setIsEditingSettings(!isEditingSettings)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              Rep Settings
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              Lock Desk
            </button>
          </div>
        </div>

        {/* Representative Settings Drawer / Form */}
        {isEditingSettings && (
          <form
            onSubmit={handleSaveSettings}
            className="my-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm animate-fadeIn space-y-4"
          >
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-orange-500" />
              Update Representative Contact & Room Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rep Name</label>
                <input
                  type="text"
                  value={editForm.rep_name}
                  onChange={(e) => setEditForm({ ...editForm, rep_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rep Room Number</label>
                <input
                  type="text"
                  value={editForm.rep_room}
                  onChange={(e) => setEditForm({ ...editForm, rep_room: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rep Phone / Intercom</label>
                <input
                  type="text"
                  value={editForm.rep_phone}
                  onChange={(e) => setEditForm({ ...editForm, rep_phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingSettings(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-bold"
              >
                Save Details
              </button>
            </div>
          </form>
        )}

        {/* CURRENT LIVE KEY STATUS (CUSTODY CARDS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
          {/* Kitchen Key Custody */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-100 text-orange-700">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Common Kitchen Key</h2>
                  <span className="text-xs text-slate-500">Key Slot: Tag #K-01</span>
                </div>
              </div>

              <div>
                {activeKitchenBooking ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    KEY IN USE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    KEY IN ROOM
                  </span>
                )}
              </div>
            </div>

            {activeKitchenBooking ? (
              <div className="mt-4 space-y-3">
                <div className="p-3.5 bg-rose-50/70 border border-rose-100 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-900 text-sm">
                    <span>{activeKitchenBooking.student_name}</span>
                    <span className="font-mono text-orange-700">
                      {activeKitchenBooking.booking_code}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    {activeKitchenBooking.student_room} • {activeKitchenBooking.student_roll}
                  </div>
                  <div className="text-slate-500 flex items-center justify-between pt-1">
                    <span>Slot End: {formatTimeOnly(activeKitchenBooking.end_time)}</span>
                    <a
                      href={`tel:${activeKitchenBooking.student_phone}`}
                      className="text-orange-700 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" /> Call: {activeKitchenBooking.student_phone}
                    </a>
                  </div>
                </div>

                <button
                  onClick={() => handleKeyReturn(activeKitchenBooking.id)}
                  disabled={actionLoadingId === activeKitchenBooking.id}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCheck className="w-4 h-4" />
                  {actionLoadingId === activeKitchenBooking.id
                    ? 'Updating...'
                    : 'Mark Kitchen Key Returned to Room'}
                </button>
              </div>
            ) : (
              <div className="mt-4 p-4 text-center rounded-xl bg-slate-50 text-slate-500 text-xs">
                <p className="font-semibold text-slate-700">Physical key is in Room B-204.</p>
                <p className="mt-0.5">Ready for next reserved slot handover.</p>
              </div>
            )}
          </div>

          {/* TV Room Key Custody */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Common TV Room Key & Remote</h2>
                  <span className="text-xs text-slate-500">Key Slot: Tag #TV-01</span>
                </div>
              </div>

              <div>
                {activeTvBooking ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    KEY IN USE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    KEY IN ROOM
                  </span>
                )}
              </div>
            </div>

            {activeTvBooking ? (
              <div className="mt-4 space-y-3">
                <div className="p-3.5 bg-rose-50/70 border border-rose-100 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-900 text-sm">
                    <span>{activeTvBooking.student_name}</span>
                    <span className="font-mono text-indigo-700">
                      {activeTvBooking.booking_code}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    {activeTvBooking.student_room} • {activeTvBooking.student_roll}
                  </div>
                  <div className="text-slate-500 flex items-center justify-between pt-1">
                    <span>Slot End: {formatTimeOnly(activeTvBooking.end_time)}</span>
                    <a
                      href={`tel:${activeTvBooking.student_phone}`}
                      className="text-indigo-700 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" /> Call: {activeTvBooking.student_phone}
                    </a>
                  </div>
                </div>

                <button
                  onClick={() => handleKeyReturn(activeTvBooking.id)}
                  disabled={actionLoadingId === activeTvBooking.id}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCheck className="w-4 h-4" />
                  {actionLoadingId === activeTvBooking.id
                    ? 'Updating...'
                    : 'Mark TV Key & Remote Returned'}
                </button>
              </div>
            ) : (
              <div className="mt-4 p-4 text-center rounded-xl bg-slate-50 text-slate-500 text-xs">
                <p className="font-semibold text-slate-700">Physical key & remote are in Room B-204.</p>
                <p className="mt-0.5">Ready for next reserved slot handover.</p>
              </div>
            )}
          </div>
        </div>

        {/* ALL BOOKINGS SCHEDULE & ACTIONS */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bookings & Key Handover Queue</h2>
              <p className="text-xs text-slate-500">
                Verify student code at door and mark key collected / returned.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter name, code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs border rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 w-44"
                />
              </div>

              <select
                value={filterFacility}
                onChange={(e) => setFilterFacility(e.target.value)}
                className="py-1.5 px-2.5 text-xs border rounded-xl bg-white text-slate-700"
              >
                <option value="all">All Facilities</option>
                <option value="kitchen">Kitchen Only</option>
                <option value="tv-room">TV Room Only</option>
              </select>

              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="py-1.5 px-2.5 text-xs border rounded-xl bg-white text-slate-700"
              >
                <option value="all">All Dates</option>
                <option value="today">Today Only</option>
              </select>
            </div>
          </div>

          {/* Bookings Table / Cards */}
          <div className="mt-6 space-y-3">
            {filteredBookings.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No bookings found matching current filters.
              </div>
            ) : (
              filteredBookings.map((b) => {
                const isKitchen = b.facility_id === 'kitchen';
                const isConfirmed = b.status === 'confirmed';
                const isPendingPickup = isConfirmed && b.key_status === 'not_collected';
                const isInUse = isConfirmed && b.key_status === 'collected';
                const isReturned = isConfirmed && b.key_status === 'returned';

                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isInUse
                        ? 'bg-blue-50/50 border-blue-200'
                        : isPendingPickup
                        ? 'bg-white border-slate-200 hover:border-slate-300'
                        : 'bg-slate-50/60 border-slate-200/70 opacity-75'
                    }`}
                  >
                    {/* Facility & Code */}
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 ${
                          isKitchen ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {isKitchen ? (
                          <UtensilsCrossed className="w-5 h-5" />
                        ) : (
                          <Tv className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white">
                            {b.booking_code}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {isKitchen ? 'Kitchen' : 'TV Room'}
                          </span>
                          <StatusBadge status={b.status} size="sm" />
                          <StatusBadge keyStatus={b.key_status} size="sm" />
                        </div>

                        <div className="mt-1 text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-semibold text-slate-900">
                            {b.student_name} ({b.student_room})
                          </span>
                          <span>Roll: {b.student_roll}</span>
                          <a
                            href={`tel:${b.student_phone}`}
                            className="text-orange-600 hover:underline"
                          >
                            📞 {b.student_phone}
                          </a>
                        </div>

                        <div className="mt-1 text-xs text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDateTime(b.start_time)} – {formatTimeOnly(b.end_time)}
                          <span className="text-slate-400">({b.purpose})</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Rep Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                      {isPendingPickup && (
                        <button
                          onClick={() => handleKeyHandover(b.id)}
                          disabled={actionLoadingId === b.id}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          {actionLoadingId === b.id ? 'Saving...' : 'Hand Over Key'}
                        </button>
                      )}

                      {isInUse && (
                        <button
                          onClick={() => handleKeyReturn(b.id)}
                          disabled={actionLoadingId === b.id}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          {actionLoadingId === b.id ? 'Saving...' : 'Mark Key Returned'}
                        </button>
                      )}

                      {isConfirmed && !isReturned && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          disabled={actionLoadingId === b.id}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs transition-colors"
                          title="Cancel Booking"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

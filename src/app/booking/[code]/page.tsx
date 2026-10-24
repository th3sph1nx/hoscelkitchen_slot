'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Booking, Facility } from '@/lib/types';
import { FACILITIES, DEFAULT_HOSTEL_SETTINGS } from '@/lib/constants';
import { formatDateTime, formatTimeOnly, formatDateOnly } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import {
  KeyRound,
  UtensilsCrossed,
  Tv,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  AlertCircle,
  Share2,
  ArrowLeft,
  XCircle,
  CheckCheck,
  Building,
} from 'lucide-react';

export default function BookingPassPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string)?.toUpperCase();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchBooking = async () => {
    if (!code) return;
    try {
      const res = await fetch(`/api/bookings/${code}`);
      const data = await res.json();
      if (!res.ok || !data.booking) {
        setError(data.error || 'Booking pass not found.');
      } else {
        setBooking(data.booking);
      }
    } catch (err: any) {
      setError('Failed to load booking pass.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    // Auto refresh status every 15s to update when rep clicks "Key Handed Over"
    const interval = setInterval(fetchBooking, 15000);
    return () => clearInterval(interval);
  }, [code]);

  const handleCancelBooking = async () => {
    if (!booking) return;
    const confirmCancel = window.confirm(
      'Are you sure you want to cancel this booking? This will immediately free up the slot for other students.'
    );
    if (!confirmCancel) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) {
        await fetchBooking();
      } else {
        alert('Failed to cancel booking.');
      }
    } catch (err) {
      alert('Network error while cancelling booking.');
    } finally {
      setCancelling(false);
    }
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-16 flex items-center justify-center bg-slate-50">
        <div className="text-center text-slate-500">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Retrieving your amenity key pass...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen py-16 flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-1">Booking Not Found</h2>
          <p className="text-xs text-slate-500 mb-6">
            We couldn&apos;t locate any booking with code <strong>{code}</strong>. Please check your roll number or code.
          </p>
          <Link
            href="/my-bookings"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Lookup My Bookings
          </Link>
        </div>
      </div>
    );
  }

  const facility: Facility | undefined = FACILITIES.find((f) => f.id === booking.facility_id);
  const isCancelled = booking.status === 'cancelled';
  const isKeyCollected = booking.key_status === 'collected';
  const isKeyReturned = booking.key_status === 'returned';

  return (
    <div className="py-8 sm:py-12 bg-slate-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200"
          >
            <Share2 className="w-3.5 h-3.5" />
            {copied ? 'Link Copied!' : 'Share Pass Link'}
          </button>
        </div>

        {/* Digital Pass Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden transition-all">
          {/* Header Banner */}
          <div
            className={`p-6 sm:p-8 text-white ${
              isCancelled
                ? 'bg-gradient-to-r from-slate-600 to-slate-700'
                : booking.facility_id === 'kitchen'
                ? 'bg-gradient-to-r from-orange-500 via-amber-600 to-orange-600'
                : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
                  {booking.facility_id === 'kitchen' ? (
                    <UtensilsCrossed className="w-5 h-5 text-white" />
                  ) : (
                    <Tv className="w-5 h-5 text-white" />
                  )}
                </span>
                <span className="text-xs uppercase tracking-wider font-semibold text-white/80">
                  Hostel Key Access Pass
                </span>
              </div>
              <div>
                <StatusBadge status={booking.status} size="sm" />
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {facility?.name || 'Amenity Slot'}
                </h1>
                <p className="text-xs text-white/80 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {facility?.location}
                </p>
              </div>

              {/* Booking Code Pill */}
              <div className="bg-white/15 backdrop-blur-md border border-white/20 px-4 py-2 rounded-2xl text-center self-start sm:self-auto">
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-white/70">
                  Key Pass Code
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black tracking-widest text-white">
                  {booking.booking_code}
                </span>
              </div>
            </div>
          </div>

          {/* Key Pickup Step-by-Step Tracker */}
          <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/70">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-orange-500" />
              Key Handover Progress
            </h2>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {/* Step 1: Booked */}
              <div className="space-y-1.5">
                <div
                  className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold ${
                    isCancelled
                      ? 'bg-slate-200 text-slate-500'
                      : 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="font-semibold text-slate-800">1. Slot Reserved</div>
                <div className="text-[11px] text-slate-400">Backend Verified</div>
              </div>

              {/* Step 2: Key Handover */}
              <div className="space-y-1.5">
                <div
                  className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold ${
                    isKeyCollected || isKeyReturned
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : isCancelled
                      ? 'bg-slate-200 text-slate-400'
                      : 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="font-semibold text-slate-800">2. Key Handover</div>
                <div className="text-[11px] text-slate-500">
                  {isKeyCollected
                    ? `Collected (${formatTimeOnly(booking.key_collected_at || booking.start_time)})`
                    : isKeyReturned
                    ? 'Collected'
                    : 'Show code at Room B-204'}
                </div>
              </div>

              {/* Step 3: Key Returned */}
              <div className="space-y-1.5">
                <div
                  className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold ${
                    isKeyReturned
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <CheckCheck className="w-4 h-4" />
                </div>
                <div className="font-semibold text-slate-800">3. Key Returned</div>
                <div className="text-[11px] text-slate-400">
                  {isKeyReturned ? 'Safely Returned' : 'Pending Return'}
                </div>
              </div>
            </div>
          </div>

          {/* Time & Student Details */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Slot Timing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Calendar className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Date
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatDateOnly(booking.start_time)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Clock className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Reserved Slot
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatTimeOnly(booking.start_time)} – {formatTimeOnly(booking.end_time)}
                  </span>
                </div>
              </div>
            </div>

            {/* Student Info */}
            <div className="border border-slate-200 rounded-2xl p-4 divide-y divide-slate-100 text-xs">
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-900">{booking.student_name}</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500">Roll Number:</span>
                <span className="font-mono font-bold text-slate-900">{booking.student_roll}</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500">Hostel Room:</span>
                <span className="font-bold text-slate-900">{booking.student_room}</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500">Phone / WhatsApp:</span>
                <span className="font-medium text-slate-800">{booking.student_phone}</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500">Purpose:</span>
                <span className="font-medium text-slate-800">{booking.purpose}</span>
              </div>
              {booking.notes && (
                <div className="py-2 flex items-start justify-between gap-4">
                  <span className="text-slate-500 shrink-0">Notes:</span>
                  <span className="text-slate-700 text-right">{booking.notes}</span>
                </div>
              )}
            </div>

            {/* Key Pickup Representative Contact Card */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
                <Building className="w-4 h-4 text-amber-700" />
                Where to get the key:
              </div>
              <p>
                Visit <strong>{DEFAULT_HOSTEL_SETTINGS.rep_room}</strong> (Representative:{' '}
                <strong>{DEFAULT_HOSTEL_SETTINGS.rep_name}</strong>). Show this screen with code{' '}
                <strong className="font-mono text-sm">{booking.booking_code}</strong>.
              </p>
              <div className="pt-1 flex items-center gap-4 text-xs font-semibold text-amber-900">
                <a
                  href={`tel:${DEFAULT_HOSTEL_SETTINGS.rep_phone}`}
                  className="inline-flex items-center gap-1 underline hover:text-amber-700"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Rep: {DEFAULT_HOSTEL_SETTINGS.rep_phone}
                </a>
              </div>
            </div>

            {/* Actions: Cancel or Back */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Link
                href="/book"
                className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Book Another Slot
              </Link>

              {!isCancelled && (
                <button
                  type="button"
                  onClick={handleCancelBooking}
                  disabled={cancelling}
                  className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  {cancelling ? 'Cancelling...' : 'Cancel This Booking'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

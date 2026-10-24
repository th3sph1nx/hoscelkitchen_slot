'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Booking } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDateTime } from '@/lib/utils';
import {
  Search,
  KeyRound,
  UtensilsCrossed,
  Tv,
  Calendar,
  Clock,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function MyBookingsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Booking[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError(null);

    try {
      // Check if it looks like a booking code or roll number
      const trimmed = query.trim();
      const isCode = trimmed.includes('-') || trimmed.length <= 8;

      let url = `/api/bookings?roll=${encodeURIComponent(trimmed)}`;
      if (isCode) {
        url = `/api/bookings?code=${encodeURIComponent(trimmed)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to search bookings');
      }

      // If code search returned empty, also try roll number search
      if ((!data.bookings || data.bookings.length === 0) && isCode) {
        const fallbackRes = await fetch(`/api/bookings?roll=${encodeURIComponent(trimmed)}`);
        const fallbackData = await fallbackRes.json();
        setResults(fallbackData.bookings || []);
      } else {
        setResults(data.bookings || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while looking up bookings.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="py-8 sm:py-12 bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/80 text-slate-700 text-xs font-semibold mb-3">
            <Search className="w-3.5 h-3.5" />
            Booking Lookup
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Find Your Key Pass & Bookings
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600">
            Enter your Roll Number or Booking Code to view your reserved slots, check key handover
            status, or cancel a booking.
          </p>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-orange-500/50">
            <div className="flex-1 flex items-center px-3 gap-2.5">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Enter Roll Number (e.g. 21CS045) or Pass Code (e.g. KIT-1024)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full text-sm bg-transparent focus:outline-none py-2 placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="py-2.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {searching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Searching...
                </>
              ) : (
                'Find Bookings'
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-6 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Search Results */}
        {results !== null && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Matching Bookings ({results.length})
            </h2>

            {results.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-sm text-slate-800">No bookings found</p>
                <p className="text-xs text-slate-500 mt-1">
                  We couldn&apos;t find any bookings matching &quot;{query}&quot;. Check the spelling or book a new slot.
                </p>
                <Link
                  href="/book"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:underline"
                >
                  Book a new time slot <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              results.map((booking) => {
                const isKitchen = booking.facility_id === 'kitchen';
                return (
                  <div
                    key={booking.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:border-orange-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`p-3 rounded-xl ${
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
                          <span className="font-bold text-slate-900 text-sm">
                            {isKitchen ? 'Common Kitchen' : 'Common TV Room'}
                          </span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                            {booking.booking_code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatDateTime(booking.start_time)}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {booking.student_name} • {booking.student_room} • {booking.purpose}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={booking.status} size="sm" />
                        {booking.status === 'confirmed' && (
                          <StatusBadge keyStatus={booking.key_status} size="sm" />
                        )}
                      </div>
                      <Link
                        href={`/booking/${booking.booking_code}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                      >
                        View Key Pass <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

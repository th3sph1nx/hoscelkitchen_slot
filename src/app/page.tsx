'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  KeyRound,
  UtensilsCrossed,
  Tv,
  CalendarCheck,
  ShieldCheck,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  ArrowRight,
  Phone,
  Sparkles,
  Search,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { FACILITIES, DEFAULT_HOSTEL_SETTINGS } from '@/lib/constants';
import { Booking } from '@/lib/types';
import { formatTimeOnly } from '@/lib/utils';

export default function HomePage() {
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/bookings?status=confirmed');
        if (res.ok) {
          const data = await res.json();
          setActiveBookings(data.bookings || []);
        }
      } catch (err) {
        // silent fallback
      } finally {
        setLoadingStatus(false);
      }
    };

    fetchStatus();
  }, []);

  // Check current in-use status
  const now = new Date();
  const kitchenCurrent = activeBookings.find((b) => {
    if (b.facility_id !== 'kitchen' || b.status !== 'confirmed') return false;
    const start = new Date(b.start_time);
    const end = new Date(b.end_time);
    return (start <= now && now <= end) || b.key_status === 'collected';
  });

  const tvCurrent = activeBookings.find((b) => {
    if (b.facility_id !== 'tv-room' || b.status !== 'confirmed') return false;
    const start = new Date(b.start_time);
    const end = new Date(b.end_time);
    return (start <= now && now <= end) || b.key_status === 'collected';
  });

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 bg-gradient-to-b from-white via-orange-50/30 to-slate-50 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 text-orange-900 text-xs font-bold uppercase tracking-wider mb-6 border border-orange-200/80 shadow-xs">
            <KeyRound className="w-4 h-4 text-orange-600" />
            Hostel Amenity Key & Slot Portal
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            Common Kitchen & TV Room <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600">
              Key & Slot Booking
            </span>
          </h1>

          <p className="mt-4 sm:mt-6 text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Reserve your time slot with backend collision checking, then visit{' '}
            <strong className="text-slate-900">{DEFAULT_HOSTEL_SETTINGS.rep_room}</strong> to pick
            up the physical key from the representative.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/book?facility=kitchen"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <UtensilsCrossed className="w-4 h-4" />
              Book Common Kitchen
            </Link>

            <Link
              href="/book?facility=tv-room"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Tv className="w-4 h-4" />
              Book TV Recreation Room
            </Link>

            <Link
              href="/my-bookings"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all"
            >
              <Search className="w-4 h-4 text-slate-500" />
              Lookup Booking / Key Pass
            </Link>
          </div>

          {/* Backend Verification Assurance Badge */}
          <div className="mt-8 inline-flex items-center gap-2 text-xs text-slate-500 bg-white/80 border border-slate-200/80 px-4 py-2 rounded-xl backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Real-time slot availability backed by PostgreSQL exclusion constraints & server validation.
            </span>
          </div>
        </div>
      </section>

      {/* LIVE FACILITY STATUS BOARD */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kitchen Live Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-lg relative overflow-hidden transition-all hover:shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-orange-100 text-orange-700">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-lg">Common Kitchen</h2>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> Ground Floor, Block A
                  </span>
                </div>
              </div>

              <div>
                {kitchenCurrent ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    Currently In Use
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    Key in Room (Free)
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4">
              {kitchenCurrent ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="font-semibold text-slate-800">
                    Key held by: {kitchenCurrent.student_name} ({kitchenCurrent.student_room})
                  </div>
                  <div className="text-slate-500">
                    Reserved until {formatTimeOnly(kitchenCurrent.end_time)}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  The kitchen is currently vacant. Key is available with Representative in{' '}
                  <strong>{DEFAULT_HOSTEL_SETTINGS.rep_room}</strong>.
                </p>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Hours: 06:00 AM – 11:30 PM</span>
              <Link
                href="/book?facility=kitchen"
                className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700"
              >
                Reserve Kitchen Slot <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* TV Room Live Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-lg relative overflow-hidden transition-all hover:shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-700">
                  <Tv className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-lg">Common TV Lounge</h2>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> 1st Floor, Common Wing
                  </span>
                </div>
              </div>

              <div>
                {tvCurrent ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    Currently In Use
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    Key in Room (Free)
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4">
              {tvCurrent ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="font-semibold text-slate-800">
                    Key held by: {tvCurrent.student_name} ({tvCurrent.student_room})
                  </div>
                  <div className="text-slate-500">
                    Reserved until {formatTimeOnly(tvCurrent.end_time)} ({tvCurrent.purpose})
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  The TV lounge is currently free. 65&quot; 4K screen and soundbar ready for booking.
                </p>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Hours: 08:00 AM – 12:00 Midnight</span>
              <Link
                href="/book?facility=tv-room"
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                Reserve TV Room Slot <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (3 SIMPLE STEPS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-2">
            Key Handover Workflow
          </h3>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            How Slot & Key Handover Works
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600">
            A simple 3-step system designed to keep hostel amenities fair, clean, and accessible to
            everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm relative">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-700 font-extrabold flex items-center justify-center text-sm mb-4">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">
              Select Slot & Backend Verifies
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pick your date and time slot. Our backend database verifies slot availability using
              exclusion constraints to ensure zero double-booking collisions.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm relative">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 font-extrabold flex items-center justify-center text-sm mb-4">
              2
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">
              Collect Key from Representative
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Visit <strong>{DEFAULT_HOSTEL_SETTINGS.rep_room}</strong> at your slot start time.
              Show your digital booking pass code (e.g. KIT-1024) to the representative and collect
              the physical room key.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm relative">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center text-sm mb-4">
              3
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">
              Use Responsibly & Return Key
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Clean up cooking utensils/turn off appliances and TV. Lock the door and hand the key
              back to Room B-204 promptly before your slot expires.
            </p>
          </div>
        </div>
      </section>

      {/* REPRESENTATIVE NOTICE CARD */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-orange-400 text-xs font-semibold">
              <KeyRound className="w-3.5 h-3.5" />
              Hostel Representative Desk
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">Have Questions or Need Key Assistance?</h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Representative <strong>{DEFAULT_HOSTEL_SETTINGS.rep_name}</strong> is stationed at{' '}
              <strong>{DEFAULT_HOSTEL_SETTINGS.rep_room}</strong>. For urgent queries or key
              handovers, reach out via call or WhatsApp.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <a
              href={`tel:${DEFAULT_HOSTEL_SETTINGS.rep_phone}`}
              className="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
            >
              <Phone className="w-4 h-4" />
              Call Rep: {DEFAULT_HOSTEL_SETTINGS.rep_phone}
            </a>
            <Link
              href="/rep"
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all"
            >
              Rep Login
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

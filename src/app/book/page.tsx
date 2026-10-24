'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FacilityId } from '@/lib/types';
import { FACILITIES, DEFAULT_HOSTEL_SETTINGS } from '@/lib/constants';
import { SlotPicker } from '@/components/SlotPicker';
import { format } from 'date-fns';
import {
  UtensilsCrossed,
  Tv,
  Sparkles,
  Info,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  User,
  KeyRound,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

function BookSlotContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Selected facility (default to kitchen or from query param)
  const initialFacility = (searchParams.get('facility') as FacilityId) || 'kitchen';
  const [facilityId, setFacilityId] = useState<FacilityId>(initialFacility);

  // Selected date (default today)
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Duration
  const [durationHours, setDurationHours] = useState<number>(1);

  // Selected slot from picker
  const [selectedSlot, setSelectedSlot] = useState<{
    startISO: string;
    endISO: string;
    startTime: string;
    endTime: string;
  } | null>(null);

  // Student Form State
  const [formData, setFormData] = useState({
    student_name: '',
    student_roll: '',
    student_room: '',
    student_phone: '',
    purpose: '',
    attendees_count: 1,
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected Facility object
  const facility = FACILITIES.find((f) => f.id === facilityId) || FACILITIES[0];

  const handleFacilityChange = (id: FacilityId) => {
    setFacilityId(id);
    setSelectedSlot(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedSlot) {
      setErrorMessage('Please select an available time slot from the schedule above.');
      return;
    }

    if (!formData.student_name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!formData.student_roll.trim()) {
      setErrorMessage('Please enter your student roll number.');
      return;
    }

    if (!formData.student_room.trim()) {
      setErrorMessage('Please enter your hostel room number (e.g. B-204).');
      return;
    }

    if (!formData.student_phone.trim()) {
      setErrorMessage('Please enter your phone number.');
      return;
    }

    if (!formData.purpose.trim()) {
      setErrorMessage('Please specify the purpose of your booking.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_id: facilityId,
          student_name: formData.student_name.trim(),
          student_roll: formData.student_roll.trim().toUpperCase(),
          student_room: formData.student_room.trim(),
          student_phone: formData.student_phone.trim(),
          purpose: formData.purpose.trim(),
          attendees_count: Number(formData.attendees_count) || 1,
          start_time: selectedSlot.startISO,
          end_time: selectedSlot.endISO,
          notes: formData.notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit booking');
      }

      // Successfully booked! Redirect to the pass page
      router.push(`/booking/${data.booking.booking_code}`);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          'Backend slot conflict detected: Someone just booked this slot. Please pick an alternative time.'
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="py-8 sm:py-12 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <KeyRound className="w-3.5 h-3.5 text-orange-600" />
            Hostel Amenity Key Booking
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Reserve Kitchen or TV Room Slot
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Select your desired facility, choose an available time slot, and collect the physical key
            from the Representative before your slot starts.
          </p>
        </div>

        {/* Facility Selector Tabs */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-200/80 rounded-2xl mb-8 max-w-lg mx-auto shadow-inner">
          <button
            type="button"
            onClick={() => handleFacilityChange('kitchen')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              facilityId === 'kitchen'
                ? 'bg-white text-orange-600 shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            Common Kitchen
          </button>
          <button
            type="button"
            onClick={() => handleFacilityChange('tv-room')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              facilityId === 'tv-room'
                ? 'bg-white text-indigo-600 shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tv className="w-4 h-4" />
            Common TV Room
          </button>
        </div>

        {/* Facility Overview Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{facility.name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  Open {facility.openTime} - {facility.closeTime}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">{facility.description}</p>
            </div>
            <div className="text-xs text-slate-500 sm:text-right shrink-0">
              <span className="font-semibold text-slate-700">Location:</span> {facility.location}
              <div className="text-slate-500 mt-0.5">Capacity: {facility.capacity}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
            {/* Equipment Included */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-800 block mb-1.5">Equipment Provided:</span>
              <ul className="grid grid-cols-1 gap-1 text-slate-600">
                {facility.equipment.map((item, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Essential Rules */}
            <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/60">
              <span className="font-semibold text-amber-900 block mb-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Key & Usage Guidelines:
              </span>
              <ul className="space-y-1 text-amber-900/80">
                {facility.rules.slice(0, 3).map((rule, i) => (
                  <li key={i} className="leading-snug">
                    • {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Slot Selection Section */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm mb-8">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Step 1: Choose Your Time Slot
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Backend slot collision prevention active. Click an available green slot below.
            </p>
          </div>

          <SlotPicker
            facilityId={facilityId}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            selectedSlot={selectedSlot}
            onSlotSelect={setSelectedSlot}
            durationHours={durationHours}
            onDurationChange={setDurationHours}
          />
        </div>

        {/* Student Details Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-orange-600" />
              Step 2: Enter Student & Key Pickup Details
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The representative will verify your hostel room and roll number upon key handover.
            </p>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Booking Error</span>
                <span className="text-xs">{errorMessage}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={formData.student_name}
                onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Roll Number / Student ID *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 21CS045"
                value={formData.student_roll}
                onChange={(e) => setFormData({ ...formData, student_roll: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Hostel Room Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Room B-312"
                value={formData.student_room}
                onChange={(e) => setFormData({ ...formData, student_room: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number / WhatsApp *
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +91 98765 43210"
                value={formData.student_phone}
                onChange={(e) => setFormData({ ...formData, student_phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Purpose of Booking *
              </label>
              <input
                type="text"
                required
                placeholder={
                  facilityId === 'kitchen'
                    ? 'e.g. Cooking dinner for 4 friends, baking birthday cake'
                    : 'e.g. Watching UCL football match, console gaming session'
                }
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Expected Attendees Count
              </label>
              <input
                type="number"
                min="1"
                max="25"
                value={formData.attendees_count}
                onChange={(e) => setFormData({ ...formData, attendees_count: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Notes / Special Requests (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Need extra HDMI cable or large cooking pot"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm"
              />
            </div>
          </div>

          {/* Key Pickup Reminder Box */}
          <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200/80 flex items-start gap-3 text-xs text-orange-950">
            <KeyRound className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-sm text-orange-900">
                Key Handover Instructions
              </span>
              <p className="mt-0.5 leading-relaxed">
                After submitting, you will receive a <strong>Booking Code</strong>. Please visit{' '}
                <strong>Room B-204</strong> right at your slot start time to collect the physical
                key from the representative. Keys must be returned immediately once your slot ends.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className={`w-full py-3.5 px-6 rounded-xl font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                submitting || !selectedSlot
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 active:scale-[0.99] shadow-orange-500/25'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying Slot Free & Locking Booking...
                </>
              ) : (
                <>
                  Confirm Booking & Generate Key Pass
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BookSlotPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-500">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading booking portal...</p>
        </div>
      }
    >
      <BookSlotContent />
    </Suspense>
  );
}

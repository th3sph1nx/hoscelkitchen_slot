import React from 'react';
import Link from 'next/link';
import { KeyRound, Shield, Clock, MapPin, Phone, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white/80 backdrop-blur-sm text-slate-600 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white">
                <KeyRound className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 tracking-tight">HostelKeyDesk</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Official amenity booking and physical key handover portal for the Common Kitchen and
              Common TV & Recreation Lounge.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-full w-fit">
              <Shield className="w-3.5 h-3.5" />
              Backend Overlap Free Checking Active
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
              Student Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/book" className="hover:text-orange-600 transition-colors">
                  Book Common Kitchen Slot
                </Link>
              </li>
              <li>
                <Link href="/book?facility=tv-room" className="hover:text-orange-600 transition-colors">
                  Book Common TV Room Slot
                </Link>
              </li>
              <li>
                <Link href="/my-bookings" className="hover:text-orange-600 transition-colors">
                  Track Booking / Find My Key Pass
                </Link>
              </li>
              <li>
                <Link href="/rep" className="hover:text-orange-600 transition-colors">
                  Representative Admin Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Representative Key Pickup Location */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
              Representative Key Desk
            </h4>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-800">Room B-204 (2nd Floor, Block B)</p>
                  <p className="text-[11px] text-slate-500">Representative: Vaanjinathan</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                <p>Key Handover: 06:00 AM – 11:30 PM</p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-orange-500 shrink-0" />
                <p>Hostel Intercom / WhatsApp: +91 98765 43210</p>
              </div>
            </div>
          </div>

          {/* Golden Rules */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
              Key & Room Etiquette
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-500 list-disc list-inside">
              <li>Return key immediately at slot end time.</li>
              <li>Turn off TV, AC, induction stoves & lights.</li>
              <li>Clean cooking utensils and dispose trash.</li>
              <li>Students face 1-week ban for unreturned keys.</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            Powered by Next.js & Supabase PostgreSQL Free Tier. Ready for instant Vercel deployment.
          </p>
          <p className="flex items-center gap-1">
            Built for hostel students with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </p>
        </div>
      </div>
    </footer>
  );
}

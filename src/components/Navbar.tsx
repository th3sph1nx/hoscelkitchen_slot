'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/navigation';
import { usePathname } from 'next/navigation';
import LinkItem from 'next/link';
import {
  UtensilsCrossed,
  Tv,
  CalendarCheck2,
  Search,
  ShieldCheck,
  Menu,
  X,
  KeyRound,
  Sparkles,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFacilityKeys, setActiveFacilityKeys] = useState<{
    kitchenInUse: boolean;
    tvInUse: boolean;
  }>({ kitchenInUse: false, tvInUse: false });

  // Quick poll of active keys for navbar status badge
  useEffect(() => {
    const fetchActiveKeys = async () => {
      try {
        const res = await fetch('/api/bookings?status=confirmed&keyStatus=collected');
        if (res.ok) {
          const data = await res.json();
          const bookings = data.bookings || [];
          const kitchenInUse = bookings.some((b: any) => b.facility_id === 'kitchen');
          const tvInUse = bookings.some((b: any) => b.facility_id === 'tv-room');
          setActiveFacilityKeys({ kitchenInUse, tvInUse });
        }
      } catch (err) {
        // quiet fallback
      }
    };

    fetchActiveKeys();
    const interval = setInterval(fetchActiveKeys, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { href: '/', label: 'Overview', icon: Sparkles },
    { href: '/book', label: 'Book a Slot', icon: CalendarCheck2 },
    { href: '/my-bookings', label: 'My Bookings', icon: Search },
    { href: '/rep', label: 'Representative Desk', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <LinkItem href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-lg">
                  Hostel<span className="text-orange-600">KeyDesk</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                  Hostel Rep
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Kitchen & TV Room Slot Management
              </p>
            </div>
          </LinkItem>

          {/* Quick Key Status Badges (Desktop) */}
          <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
            <span className="text-slate-400 font-medium">Live Key Status:</span>
            <div className="flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5 text-slate-500" />
              <span>Kitchen:</span>
              {activeFacilityKeys.kitchenInUse ? (
                <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  In Use
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Free (Key in Room)
                </span>
              )}
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-slate-500" />
              <span>TV Room:</span>
              {activeFacilityKeys.tvInUse ? (
                <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  In Use
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Free (Key in Room)
                </span>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              const isRepDesk = link.href === '/rep';

              return (
                <LinkItem
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? isRepDesk
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-orange-50 text-orange-600 font-semibold'
                      : isRepDesk
                      ? 'text-slate-700 hover:bg-slate-100 border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </LinkItem>
              );
            })}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg animate-fadeIn">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <LinkItem
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                  isActive
                    ? 'bg-orange-50 text-orange-600 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </LinkItem>
            );
          })}

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50">
              <span className="text-slate-600 font-medium">Kitchen Key:</span>
              <span
                className={`font-semibold ${
                  activeFacilityKeys.kitchenInUse ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {activeFacilityKeys.kitchenInUse ? '● In Use' : '● Key with Rep'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50">
              <span className="text-slate-600 font-medium">TV Room Key:</span>
              <span
                className={`font-semibold ${
                  activeFacilityKeys.tvInUse ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {activeFacilityKeys.tvInUse ? '● In Use' : '● Key with Rep'}
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

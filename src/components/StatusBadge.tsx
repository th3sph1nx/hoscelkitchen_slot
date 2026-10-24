import React from 'react';
import { BookingStatus, KeyStatus } from '@/lib/types';
import { CheckCircle2, Clock, XCircle, KeyRound, CheckCheck } from 'lucide-react';

interface StatusBadgeProps {
  status?: BookingStatus;
  keyStatus?: KeyStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, keyStatus, size = 'md' }: StatusBadgeProps) {
  const isSmall = size === 'sm';
  const paddingClass = isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm';

  if (keyStatus) {
    switch (keyStatus) {
      case 'not_collected':
        return (
          <span
            className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 ${paddingClass}`}
          >
            <Clock className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            Key Pending Pickup
          </span>
        );
      case 'collected':
        return (
          <span
            className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 animate-pulse ${paddingClass}`}
          >
            <KeyRound className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            Key In Use
          </span>
        );
      case 'returned':
        return (
          <span
            className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${paddingClass}`}
          >
            <CheckCheck className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            Key Returned
          </span>
        );
    }
  }

  if (status) {
    switch (status) {
      case 'confirmed':
        return (
          <span
            className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${paddingClass}`}
          >
            <CheckCircle2 className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            Confirmed
          </span>
        );
      case 'cancelled':
        return (
          <span
            className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200 ${paddingClass}`}
          >
            <XCircle className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            Cancelled
          </span>
        );
      case 'rejected':
        return (
          <span
            className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${paddingClass}`}
          >
            <XCircle className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            Rejected
          </span>
        );
    }
  }

  return null;
}

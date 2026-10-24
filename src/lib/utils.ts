import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeRange(startISO: string, endISO: string): string {
  try {
    const s = new Date(startISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const e = new Date(endISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${s} – ${e}`;
  } catch {
    return `${startISO} – ${endISO}`;
  }
}

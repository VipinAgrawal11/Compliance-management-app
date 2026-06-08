/**
 * Bikram Sambat (Nepali calendar) helpers, built on `nepali-date-converter`.
 *
 * Dates are still STORED as Gregorian (AD) ISO strings in the database; these
 * helpers convert to/from BS purely for display and for the BS calendar grid.
 */
import NepaliDate from 'nepali-date-converter';
import { format } from 'date-fns';
import { formatDate } from '@/lib/utils';

export const NEPALI_MONTHS = [
  'Baishakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
] as const;

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Build a local JS Date from a 'YYYY-MM-DD' (or ISO) string without TZ drift. */
function jsFromIso(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export interface BsParts {
  year: number;
  month: number; // 1-12
  day: number;
  monthName: string;
  weekday: number; // 0 (Sun) - 6 (Sat)
}

/** Convert an AD ISO date string to BS parts. */
export function toBs(iso: string | null | undefined): BsParts | null {
  if (!iso) return null;
  try {
    const nd = new NepaliDate(jsFromIso(iso));
    return {
      year: nd.getYear(),
      month: nd.getMonth() + 1,
      day: nd.getDate(),
      monthName: NEPALI_MONTHS[nd.getMonth()],
      weekday: nd.getDay(),
    };
  } catch {
    return null;
  }
}

export function todayBs(): BsParts {
  return toBs(isoOf(new Date()))!;
}

/** BS (year, month 1-12, day) -> AD JS Date. */
export function bsToAd(year: number, month1: number, day: number): Date {
  return new NepaliDate(year, month1 - 1, day).toJsDate();
}

/** BS (year, month 1-12, day) -> AD ISO 'YYYY-MM-DD'. */
export function bsToAdIso(year: number, month1: number, day: number): string {
  return isoOf(bsToAd(year, month1, day));
}

/** "15 Mangsir 2081" */
export function formatBs(iso: string | null | undefined, fallback = '—'): string {
  const b = toBs(iso);
  return b ? `${b.day} ${b.monthName} ${b.year}` : fallback;
}

/** "15 Mangsir 2081 BS · 29 Nov 2024" */
export function formatBsAd(iso: string | null | undefined, fallback = '—'): string {
  const b = toBs(iso);
  if (!b) return fallback;
  return `${b.day} ${b.monthName} ${b.year} BS · ${formatDate(iso)}`;
}

export interface BsMonthGrid {
  year: number;
  month: number; // 1-12
  monthName: string;
  daysInMonth: number;
  firstWeekday: number; // weekday of day 1 (0 Sun - 6 Sat)
  adRangeLabel: string; // e.g. "Nov – Dec 2024"
  cells: { day: number; adIso: string }[];
}

/** Compute a full BS month for rendering a calendar grid. */
export function bsMonthGrid(year: number, month1: number): BsMonthGrid {
  const first = new NepaliDate(year, month1 - 1, 1);
  const firstAd = first.toJsDate();
  const firstWeekday = first.getDay();

  const nextY = month1 === 12 ? year + 1 : year;
  const nextM = month1 === 12 ? 1 : month1 + 1;
  const nextFirstAd = new NepaliDate(nextY, nextM - 1, 1).toJsDate();
  const daysInMonth = Math.round((nextFirstAd.getTime() - firstAd.getTime()) / 86_400_000);

  const cells: { day: number; adIso: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, adIso: isoOf(new NepaliDate(year, month1 - 1, d).toJsDate()) });
  }

  const lastAd = jsFromIso(cells[cells.length - 1].adIso);
  const startLabel = format(firstAd, 'MMM');
  const endLabel = format(lastAd, 'MMM yyyy');
  const adRangeLabel =
    firstAd.getMonth() === lastAd.getMonth() ? format(firstAd, 'MMM yyyy') : `${startLabel} – ${endLabel}`;

  return {
    year,
    month: month1,
    monthName: NEPALI_MONTHS[month1 - 1],
    daysInMonth,
    firstWeekday,
    adRangeLabel,
    cells,
  };
}

/** Step a BS year/month by ±1 month with wraparound. */
export function stepBsMonth(year: number, month1: number, delta: number): { year: number; month: number } {
  let m = month1 + delta;
  let y = year;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return { year: y, month: m };
}

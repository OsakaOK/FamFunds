// Date helpers — all based on the device's LOCAL time, not UTC.
//
// Why this matters: `new Date().toISOString()` returns a UTC date. For anyone
// west of UTC (e.g. North America), an expense logged at 9 PM on the 30th would
// be stored as the 1st of the next month — landing in the wrong month. These
// helpers keep everything in the user's own timezone.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

// A Date -> 'YYYY-MM-DD' using local time.
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Today's date as 'YYYY-MM-DD' (local).
export function todayLocal() {
  return ymd(new Date());
}

// The current year + 0-based month index, for defaulting the month picker.
export function currentYearMonth() {
  const d = new Date();
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

// First day of a month as 'YYYY-MM-DD'. monthIndex is 0-based (0 = January).
export function monthStart(year: number, monthIndex: number) {
  return `${year}-${pad(monthIndex + 1)}-01`;
}

// The [start, endExclusive) range for a month — use with .gte(start).lt(end).
export function monthRange(year: number, monthIndex: number) {
  const start = monthStart(year, monthIndex);
  const endExclusive =
    monthIndex === 11 ? monthStart(year + 1, 0) : monthStart(year, monthIndex + 1);
  return { start, endExclusive };
}

// A human label like "June 2026".
export function monthLabel(year: number, monthIndex: number) {
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

// The [start, endExclusive) month range that contains a given 'YYYY-MM-DD' date.
export function monthBounds(ymd: string) {
  const year = Number(ymd.slice(0, 4));
  const monthIndex = Number(ymd.slice(5, 7)) - 1;
  return monthRange(year, monthIndex);
}

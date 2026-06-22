// MonthContext — the single "which month am I looking at?" state, shared by
// Home, Charts, Budgets, and Members so they all stay in sync.
//
// Defaults to the current month every time the app opens (we don't remember
// where you last browsed — "now" is almost always what you want), and you can't
// step into the future (there are no expenses there).

import { createContext, useContext, useState, ReactNode } from 'react';
import {
  currentYearMonth,
  monthLabel,
  monthRange,
} from './dates';

type MonthContextValue = {
  year: number;
  monthIndex: number; // 0-based (0 = January)
  label: string; // e.g. "June 2026"
  range: { start: string; endExclusive: string };
  canGoNext: boolean; // false when already on the current month
  prev: () => void;
  next: () => void;
};

const MonthContext = createContext<MonthContextValue | undefined>(undefined);

export function MonthProvider({ children }: { children: ReactNode }) {
  const start = currentYearMonth();
  const [year, setYear] = useState(start.year);
  const [monthIndex, setMonthIndex] = useState(start.monthIndex);

  function prev() {
    if (monthIndex === 0) {
      setYear(year - 1);
      setMonthIndex(11);
    } else {
      setMonthIndex(monthIndex - 1);
    }
  }

  // Block stepping past the current month.
  const now = currentYearMonth();
  const canGoNext = year < now.year || (year === now.year && monthIndex < now.monthIndex);

  function next() {
    if (!canGoNext) return;
    if (monthIndex === 11) {
      setYear(year + 1);
      setMonthIndex(0);
    } else {
      setMonthIndex(monthIndex + 1);
    }
  }

  const value: MonthContextValue = {
    year,
    monthIndex,
    label: monthLabel(year, monthIndex),
    range: monthRange(year, monthIndex),
    canGoNext,
    prev,
    next,
  };

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useMonth() {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error('useMonth must be used inside a <MonthProvider>');
  return ctx;
}

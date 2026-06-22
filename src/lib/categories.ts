// The default expense categories that ship with the app (from the project plan).
// Kept in one place so every screen uses the same list.

// The categories families can pick from. (Transport, Utilities, Childcare, and
// Education were trimmed at the user's request — their emoji/colors are kept
// below so any older expenses that used them still render nicely.)
export const CATEGORIES = [
  'Groceries',
  'Dining',
  'Health',
  'Entertainment',
  'Shopping',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

// A distinct color per category, used in charts and legends.
export const CATEGORY_COLOR: Record<string, string> = {
  Groceries: '#22c55e',
  Dining: '#f97316',
  Transport: '#3b82f6',
  Utilities: '#eab308',
  Childcare: '#ec4899',
  Education: '#8b5cf6',
  Health: '#ef4444',
  Entertainment: '#06b6d4',
  Shopping: '#a855f7',
  Other: '#6b7280',
};

// A little emoji for each category, used in the feed and pickers.
export const CATEGORY_EMOJI: Record<string, string> = {
  Groceries: '🛒',
  Dining: '🍽️',
  Transport: '🚗',
  Utilities: '💡',
  Childcare: '🍼',
  Education: '📚',
  Health: '🏥',
  Entertainment: '🎬',
  Shopping: '🛍️',
  Other: '📦',
};

// The default expense categories that ship with the app (from the project plan).
// Kept in one place so every screen uses the same list.

export const CATEGORIES = [
  'Groceries',
  'Dining',
  'Transport',
  'Utilities',
  'Childcare',
  'Education',
  'Health',
  'Entertainment',
  'Shopping',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

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

// The app's design tokens — colors, spacing, radii. Every screen reads from here
// (via useTheme) instead of hard-coding values, so light/dark + visual changes
// stay consistent in one place.

export type ThemeMode = 'light' | 'dark';

export type Colors = {
  bg: string; // screen background
  card: string; // cards / rows
  headerBg: string; // top bar + tab bar
  text: string; // primary text
  subtext: string; // secondary text
  border: string; // borders / dividers
  inputBg: string; // text input background
  primary: string; // brand blue
  primaryText: string; // text on primary
  success: string; // under budget / positive money
  warning: string; // approaching limit
  danger: string; // over budget / destructive
  track: string; // empty progress-bar track
  chip: string; // unselected chip / subtle fill
  accentBg: string; // soft highlight box
  tabInactive: string; // inactive tab icon/label
};

// "Emerald & Sand" — emerald-green brand on warm sand neutrals.
export const lightColors: Colors = {
  bg: '#f4f6f2', // warm sand
  card: '#ffffff',
  headerBg: '#ffffff',
  text: '#14241d', // forest
  subtext: '#5f7065',
  border: '#e3e8df',
  inputBg: '#f4f6f2',
  primary: '#059669', // emerald
  primaryText: '#ffffff',
  success: '#059669',
  warning: '#d97706', // amber
  danger: '#dc2626',
  track: '#e3e8df',
  chip: '#eaf0e7',
  accentBg: '#ecfdf5', // emerald tint
  tabInactive: '#9aa89f',
};

export const darkColors: Colors = {
  bg: '#0e1512', // deep forest charcoal
  card: '#16201b',
  headerBg: '#121a16',
  text: '#ecf3ee',
  subtext: '#93a39a',
  border: '#243029',
  inputBg: '#0e1512',
  primary: '#059669', // emerald (white text stays legible)
  primaryText: '#ffffff',
  success: '#34d399', // brighter green for fills/icons on dark
  warning: '#fbbf24',
  danger: '#f87171',
  track: '#243029',
  chip: '#243029',
  accentBg: '#06291e', // deep emerald tint
  tabInactive: '#6b7c72',
};

// 4/8pt spacing rhythm and a small radius scale, used across screens.
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const RADIUS = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

// A consistent card elevation (works on native + web).
export const cardShadow = {
  shadowColor: '#0f172a',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;

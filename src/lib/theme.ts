// The app's color palettes. Every screen reads colors from here (via useTheme)
// instead of hard-coding hex values, so light/dark mode "just works".

export type ThemeMode = 'light' | 'dark';

export type Colors = {
  bg: string; // screen background
  card: string; // cards / rows
  headerBg: string; // top header + nav bar
  text: string; // primary text
  subtext: string; // secondary text
  border: string; // input + divider borders
  inputBg: string; // text input background
  primary: string; // brand blue (buttons, links)
  primaryText: string; // text on primary
  danger: string; // sign out / destructive
  track: string; // empty progress-bar track
  chip: string; // unselected chip background
  accentBg: string; // soft highlight box (invite code, etc.)
};

export const lightColors: Colors = {
  bg: '#f3f4f6',
  card: '#ffffff',
  headerBg: '#ffffff',
  text: '#111827',
  subtext: '#6b7280',
  border: '#d1d5db',
  inputBg: '#f9fafb',
  primary: '#2563eb',
  primaryText: '#ffffff',
  danger: '#ef4444',
  track: '#e5e7eb',
  chip: '#f3f4f6',
  accentBg: '#eff6ff',
};

export const darkColors: Colors = {
  bg: '#0b1120',
  card: '#1f2937',
  headerBg: '#111827',
  text: '#f9fafb',
  subtext: '#9ca3af',
  border: '#374151',
  inputBg: '#0b1120',
  primary: '#3b82f6',
  primaryText: '#ffffff',
  danger: '#f87171',
  track: '#374151',
  chip: '#374151',
  accentBg: '#172554',
};

/**
 * Design System - Color Palette
 * Centralized color definitions for the Flo application
 */

export const colors = {
  // Primary colors
  primary: '#6C63FF',      // Purple - main brand color
  accent: '#FF6584',       // Pink - highlights and CTAs
  teal: '#43C6AC',         // Teal - success states and secondary accents

  // Background colors
  dark: '#1a1a2e',         // Dark background
  card: '#16213e',         // Card background
  card2: '#0f3460',        // Card background 2

  // Text colors
  text: '#e0e0e0',         // Light text
  textDark: '#ffffff',     // Dark text (for light backgrounds)
  muted: '#888',           // Muted text
  mutedLight: '#aaa',      // Muted light text

  // Category colors
  family: '#FF6584',       // Pink
  health: '#43C6AC',       // Teal
  work: '#6C63FF',         // Purple
  school: '#FFD166',       // Yellow
  activities: '#F77F00',   // Orange
  wellbeing: '#A8DADC',    // Light blue

  // Status colors
  success: '#43C6AC',      // Teal
  error: '#FF6584',        // Pink
  warning: '#FFD166',      // Yellow
  info: '#6C63FF',         // Purple

  // Semantic colors
  border: '#2a2a4e',       // Border color
  borderLight: '#3a3a5e',  // Light border color
  overlay: 'rgba(0, 0, 0, 0.5)',  // Overlay
  overlayLight: 'rgba(0, 0, 0, 0.3)',  // Light overlay
} as const;

export type ColorKey = keyof typeof colors;

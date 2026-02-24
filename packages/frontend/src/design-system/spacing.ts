/**
 * Design System - Spacing Tokens
 * Consistent spacing values for margins, padding, and gaps
 */

export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.2rem',     // 19px
  xxl: '1.5rem',    // 24px
  xxxl: '2rem',     // 32px
  huge: '2.5rem',   // 40px
  massive: '3rem',  // 48px
} as const;

export const borderRadius = {
  sm: '8px',
  md: '10px',
  lg: '12px',
  xl: '14px',
  xxl: '16px',
  xxxl: '20px',
  huge: '24px',
  massive: '30px',
} as const;

export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;

/**
 * Design System - Responsive Breakpoints
 * Screen size thresholds for mobile-first responsive design
 */

export const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  large: '1400px',
} as const;

export const mediaQueries = {
  mobile: `(max-width: ${breakpoints.mobile})`,
  tablet: `(max-width: ${breakpoints.tablet})`,
  desktop: `(min-width: ${breakpoints.desktop})`,
  large: `(min-width: ${breakpoints.large})`,
  tabletUp: `(min-width: 481px)`,
  desktopUp: `(min-width: 1025px)`,
} as const;

export type BreakpointKey = keyof typeof breakpoints;
export type MediaQueryKey = keyof typeof mediaQueries;

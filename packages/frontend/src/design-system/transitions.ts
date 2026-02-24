/**
 * Design System - Transition Tokens
 * Consistent animation timing for smooth interactions
 */

export const transitions = {
  fast: '0.2s ease-in-out',
  normal: '0.3s ease-in-out',
  slow: '0.5s ease-in-out',
} as const;

export const timings = {
  fast: 200,      // milliseconds
  normal: 300,    // milliseconds
  slow: 500,      // milliseconds
} as const;

export type TransitionKey = keyof typeof transitions;
export type TimingKey = keyof typeof timings;

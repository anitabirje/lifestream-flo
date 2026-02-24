/**
 * Design System - Shadow Tokens
 * Consistent shadow values for elevation and depth
 */

export const shadows = {
  small: '0 2px 8px rgba(0,0,0,0.2)',
  medium: '0 4px 16px rgba(0,0,0,0.3)',
  large: '0 8px 32px rgba(0,0,0,0.4)',
} as const;

export type ShadowKey = keyof typeof shadows;

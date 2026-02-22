/**
 * Design System - Typography Scale
 * Hierarchical system of font sizes, weights, and line heights
 */

export const typography = {
  // Heading sizes with responsive scaling using clamp()
  h1: {
    size: 'clamp(2.8rem, 5.5vw, 4.8rem)',
    weight: 900,
    lineHeight: 1.08,
  },
  h2: {
    size: 'clamp(1.8rem, 3.5vw, 2.6rem)',
    weight: 900,
    lineHeight: 1.2,
  },
  h3: {
    size: '1.4rem',
    weight: 800,
    lineHeight: 1.3,
  },
  h4: {
    size: '1rem',
    weight: 700,
    lineHeight: 1.4,
  },

  // Body text sizes
  body: {
    large: { size: '1.1rem', weight: 400, lineHeight: 1.75 },
    regular: { size: '0.9rem', weight: 400, lineHeight: 1.6 },
    small: { size: '0.85rem', weight: 400, lineHeight: 1.6 },
    xsmall: { size: '0.78rem', weight: 400, lineHeight: 1.5 },
  },

  // Font weights
  weights: {
    regular: 400,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },

  // Font family
  fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
} as const;

export type TypographyKey = keyof typeof typography;

# Flo Design System

## Overview

The Flo Design System provides a comprehensive set of design tokens, components, and patterns for building consistent, accessible, and performant user interfaces across the Flo family calendar application.

## Color Palette

### Primary Colors
- **Primary (Purple)**: `#6C63FF` - Main brand color for primary actions and highlights
- **Accent (Pink)**: `#FF6584` - Secondary brand color for CTAs and alerts
- **Teal**: `#43C6AC` - Success states and secondary accents

### Background Colors
- **Dark**: `#1a1a2e` - Main background color
- **Card**: `#16213e` - Card and container backgrounds
- **Card 2**: `#0f3460` - Alternative card background

### Text Colors
- **Text**: `#e0e0e0` - Primary text color
- **Text Dark**: `#ffffff` - Text on light backgrounds
- **Muted**: `#888` - Secondary text color
- **Muted Light**: `#aaa` - Tertiary text color

### Category Colors
- **Family**: `#FF6584` (Pink)
- **Health**: `#43C6AC` (Teal)
- **Work**: `#6C63FF` (Purple)
- **School**: `#FFD166` (Yellow)
- **Activities**: `#F77F00` (Orange)
- **Wellbeing**: `#A8DADC` (Light Blue)

### Status Colors
- **Success**: `#43C6AC` (Teal)
- **Error**: `#FF6584` (Pink)
- **Warning**: `#FFD166` (Yellow)
- **Info**: `#6C63FF` (Purple)

## Typography

### Font Family
- Primary: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif

### Heading Sizes
- **H1**: `clamp(2.8rem, 5.5vw, 4.8rem)` - Page titles
- **H2**: `clamp(1.8rem, 3.5vw, 2.6rem)` - Section titles
- **H3**: `1.4rem` - Subsection titles
- **H4**: `1rem` - Card titles

### Body Text Sizes
- **Large**: `1.1rem` - Prominent body text
- **Regular**: `0.9rem` - Standard body text
- **Small**: `0.85rem` - Secondary text
- **Extra Small**: `0.78rem` - Tertiary text

### Font Weights
- **Regular**: 400
- **Semibold**: 600
- **Bold**: 700
- **Extra Bold**: 800
- **Black**: 900

## Spacing

All spacing values use consistent increments for visual harmony:

- **XS**: `0.25rem` (4px)
- **SM**: `0.5rem` (8px)
- **MD**: `0.75rem` (12px)
- **LG**: `1rem` (16px)
- **XL**: `1.2rem` (19px)
- **XXL**: `1.5rem` (24px)
- **XXXL**: `2rem` (32px)
- **Huge**: `2.5rem` (40px)
- **Massive**: `3rem` (48px)

## Border Radius

- **SM**: `8px`
- **MD**: `10px`
- **LG**: `12px`
- **XL**: `14px`
- **XXL**: `16px`
- **XXXL**: `20px`
- **Huge**: `24px`
- **Massive**: `30px`

## Shadows

- **Small**: `0 2px 8px rgba(0,0,0,0.2)`
- **Medium**: `0 4px 16px rgba(0,0,0,0.3)`
- **Large**: `0 8px 32px rgba(0,0,0,0.4)`

## Transitions

- **Fast**: `0.2s ease-in-out`
- **Normal**: `0.3s ease-in-out`
- **Slow**: `0.5s ease-in-out`

## Responsive Breakpoints

- **Mobile**: `max-width: 480px`
- **Tablet**: `max-width: 768px`
- **Desktop**: `min-width: 1024px`
- **Large**: `min-width: 1400px`

## Component Usage

### Buttons

```tsx
// Primary button
<button className="btn btn-primary">Get Started</button>

// Secondary button
<button className="btn btn-secondary">Learn More</button>

// Ghost button
<button className="btn btn-ghost">Cancel</button>
```

### Forms

```tsx
// Form group
<div className="form-group">
  <label htmlFor="email" className="form-label">Email</label>
  <input id="email" type="email" className="form-input" />
</div>

// Form error
<div className="form-error">Please enter a valid email</div>

// Form checkbox
<div className="form-checkbox">
  <input id="remember" type="checkbox" />
  <label htmlFor="remember">Remember me</label>
</div>
```

### Cards

```tsx
<div className="card">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</div>
```

### Typography

```tsx
<h1 className="h1">Heading 1</h1>
<h2 className="h2">Heading 2</h2>
<p className="body-large">Large body text</p>
<p className="body-regular">Regular body text</p>
```

### Utilities

```tsx
// Spacing
<div className="p-lg m-xl gap-xxl">Content</div>

// Text alignment
<div className="text-center">Centered text</div>

// Flexbox
<div className="flex flex-between">
  <span>Left</span>
  <span>Right</span>
</div>

// Grid
<div className="grid grid-cols-3">
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
</div>

// Gradient text
<h1 className="gradient-text">Gradient Text</h1>
```

## CSS Variables

All design tokens are available as CSS custom properties:

```css
:root {
  --color-primary: #6C63FF;
  --color-accent: #FF6584;
  --font-size-h1: clamp(2.8rem, 5.5vw, 4.8rem);
  --spacing-lg: 1rem;
  --border-radius-lg: 12px;
  --shadow-medium: 0 4px 16px rgba(0,0,0,0.3);
  --transition-normal: 0.3s ease-in-out;
}
```

## Accessibility

- All interactive elements have focus indicators
- Color contrast meets WCAG AA standards
- Semantic HTML elements are used throughout
- ARIA labels are provided for screen readers
- Keyboard navigation is fully supported

## Best Practices

1. **Use CSS Variables**: Always use CSS custom properties instead of hardcoding colors or spacing
2. **Mobile First**: Design for mobile first, then enhance for larger screens
3. **Semantic HTML**: Use semantic elements (header, nav, main, section, footer)
4. **Accessibility**: Ensure all interactive elements are keyboard accessible
5. **Performance**: Use CSS animations instead of JavaScript animations
6. **Consistency**: Follow the design system for all new components

## Extending the Design System

To add new design tokens:

1. Add the token to the appropriate file in `src/design-system/`
2. Export it from `src/design-system/index.ts`
3. Add the CSS custom property to `src/design-system/design-system.css`
4. Document the token in this file

## Support

For questions or issues with the design system, please refer to the component documentation or contact the design team.

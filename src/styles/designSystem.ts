/**
 * ATLAS DESIGN SYSTEM v2.0
 * 
 * Modern, premium design system with animations, effects, and emotional design.
 * This is what makes Atlas feel world-class and competitive.
 */

// Color Palette - Modern, Premium, Trustworthy
export const colors = {
  // Primary - Teal/Blue (trust, stability, growth)
  primary: {
    50: '#f0fdf9',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6', // Main brand color
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },

  // Secondary - Emerald (growth, prosperity)
  secondary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#145231',
  },

  // Accent - Amber (warning, attention)
  accent: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Danger - Red (crisis, urgent)
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Success - Green (achievement, progress)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#145231',
  },

  // Neutral - Gray (backgrounds, text)
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
};

// Typography System
export const typography = {
  // Display - Hero headlines
  display: {
    xl: {
      fontSize: '4rem', // 64px
      lineHeight: '1.1',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    lg: {
      fontSize: '3.5rem', // 56px
      lineHeight: '1.1',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    md: {
      fontSize: '3rem', // 48px
      lineHeight: '1.2',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
  },

  // Heading - Section headers
  heading: {
    xl: {
      fontSize: '2rem', // 32px
      lineHeight: '1.3',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    lg: {
      fontSize: '1.5rem', // 24px
      lineHeight: '1.4',
      fontWeight: 700,
    },
    md: {
      fontSize: '1.25rem', // 20px
      lineHeight: '1.5',
      fontWeight: 600,
    },
    sm: {
      fontSize: '1.125rem', // 18px
      lineHeight: '1.5',
      fontWeight: 600,
    },
  },

  // Body - Main content
  body: {
    lg: {
      fontSize: '1.125rem', // 18px
      lineHeight: '1.6',
      fontWeight: 400,
    },
    md: {
      fontSize: '1rem', // 16px
      lineHeight: '1.6',
      fontWeight: 400,
    },
    sm: {
      fontSize: '0.875rem', // 14px
      lineHeight: '1.5',
      fontWeight: 400,
    },
    xs: {
      fontSize: '0.75rem', // 12px
      lineHeight: '1.5',
      fontWeight: 400,
    },
  },

  // Caption - Small text
  caption: {
    md: {
      fontSize: '0.875rem', // 14px
      lineHeight: '1.5',
      fontWeight: 500,
    },
    sm: {
      fontSize: '0.75rem', // 12px
      lineHeight: '1.4',
      fontWeight: 500,
    },
  },
};

// Spacing System (8px grid)
export const spacing = {
  0: '0',
  1: '0.25rem', // 4px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
};

// Shadow System - Depth hierarchy
export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
};

// Border Radius - Modern, friendly
export const borderRadius = {
  none: '0',
  sm: '0.25rem', // 4px
  md: '0.5rem', // 8px
  lg: '0.75rem', // 12px
  xl: '1rem', // 16px
  '2xl': '1.5rem', // 24px
  '3xl': '2rem', // 32px
  full: '9999px',
};

// Animation Durations
export const animations = {
  // Fast - micro-interactions
  fast: '150ms',
  // Normal - standard transitions
  normal: '300ms',
  // Slow - emphasis animations
  slow: '500ms',
  // Slower - page transitions
  slower: '700ms',
};

// Easing Functions
export const easing = {
  // Linear
  linear: 'linear',
  // Ease in/out - natural motion
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  // Spring-like - bouncy, playful
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  // Elastic - emphasis
  elastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

// Transition Presets
export const transitions = {
  // Fade
  fade: `opacity ${animations.normal} ${easing.easeInOut}`,
  // Slide
  slideUp: `transform ${animations.normal} ${easing.easeOut}`,
  slideDown: `transform ${animations.normal} ${easing.easeOut}`,
  slideLeft: `transform ${animations.normal} ${easing.easeOut}`,
  slideRight: `transform ${animations.normal} ${easing.easeOut}`,
  // Scale
  scale: `transform ${animations.normal} ${easing.easeInOut}`,
  // All
  all: `all ${animations.normal} ${easing.easeInOut}`,
};

// Glassmorphism Effect
export const glassmorphism = {
  light: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  dark: {
    background: 'rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
};

// Gradient Presets
export const gradients = {
  // Primary gradient - brand
  primary: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
  // Success gradient - positive
  success: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  // Warning gradient - attention
  warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  // Danger gradient - urgent
  danger: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  // Subtle - backgrounds
  subtle: 'linear-gradient(135deg, #f0fdf9 0%, #f0fdf4 100%)',
};

// Component Presets
export const components = {
  // Button - Primary
  buttonPrimary: {
    background: colors.primary[500],
    color: '#ffffff',
    padding: `${spacing[3]} ${spacing[4]}`,
    borderRadius: borderRadius.lg,
    fontWeight: 600,
    fontSize: '1rem',
    transition: transitions.all,
    cursor: 'pointer',
    border: 'none',
    boxShadow: shadows.md,
    '&:hover': {
      background: colors.primary[600],
      boxShadow: shadows.lg,
      transform: 'translateY(-2px)',
    },
    '&:active': {
      transform: 'translateY(0)',
      boxShadow: shadows.md,
    },
  },

  // Card - Elevated
  cardElevated: {
    background: '#ffffff',
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    boxShadow: shadows.lg,
    transition: transitions.all,
    '&:hover': {
      boxShadow: shadows.xl,
      transform: 'translateY(-4px)',
    },
  },

  // Card - Glassmorphic
  cardGlass: {
    ...glassmorphism.light,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    transition: transitions.all,
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.8)',
    },
  },

  // Input - Modern
  input: {
    padding: `${spacing[3]} ${spacing[4]}`,
    borderRadius: borderRadius.lg,
    border: `2px solid ${colors.neutral[200]}`,
    fontSize: '1rem',
    transition: transitions.all,
    '&:focus': {
      outline: 'none',
      borderColor: colors.primary[500],
      boxShadow: `0 0 0 3px ${colors.primary[100]}`,
    },
  },
};

// Z-index Scale
export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};

// Breakpoints - Mobile-first
export const breakpoints = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Media Queries
export const media = {
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  '2xl': `@media (min-width: ${breakpoints['2xl']})`,
};

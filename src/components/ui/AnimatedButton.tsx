/**
 * ANIMATED BUTTON COMPONENT
 * 
 * Modern, premium button with animations and emotional design.
 * Part of Atlas's modern UX/UI overhaul.
 */

'use client';

import React from 'react';
import { colors, shadows, borderRadius, animations, easing } from '@/styles/designSystem';

interface AnimatedButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  className = '',
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isActive, setIsActive] = React.useState(false);

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: '8px 16px',
      fontSize: '0.875rem',
    },
    md: {
      padding: '12px 24px',
      fontSize: '1rem',
    },
    lg: {
      padding: '16px 32px',
      fontSize: '1.125rem',
    },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: colors.primary[500],
      color: '#ffffff',
      border: 'none',
      boxShadow: shadows.md,
    },
    secondary: {
      background: colors.secondary[500],
      color: '#ffffff',
      border: 'none',
      boxShadow: shadows.md,
    },
    outline: {
      background: 'transparent',
      color: colors.primary[500],
      border: `2px solid ${colors.primary[500]}`,
      boxShadow: 'none',
    },
    ghost: {
      background: 'transparent',
      color: colors.primary[500],
      border: 'none',
      boxShadow: 'none',
    },
  };

  const baseStyle: React.CSSProperties = {
    ...sizeStyles[size],
    ...variantStyles[variant],
    borderRadius: borderRadius.lg,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: `all ${animations.normal} ${easing.easeInOut}`,
    opacity: disabled ? 0.5 : 1,
  };

  const hoverStyle: React.CSSProperties = isHovered && !disabled ? {
    transform: 'translateY(-2px)',
    boxShadow: variant === 'ghost' ? 'none' : shadows.lg,
  } : {};

  const activeStyle: React.CSSProperties = isActive && !disabled ? {
    transform: 'translateY(0)',
    boxShadow: variant === 'ghost' ? 'none' : shadows.md,
  } : {};

  const finalStyle: React.CSSProperties = {
    ...baseStyle,
    ...hoverStyle,
    ...activeStyle,
  };

  return (
    <button
      style={finalStyle}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onMouseDown={() => !disabled && setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
    >
      {loading ? '⏳ Loading...' : children}
    </button>
  );
};

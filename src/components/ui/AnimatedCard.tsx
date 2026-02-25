/**
 * ANIMATED CARD COMPONENT
 * 
 * Modern, premium card with glassmorphism, animations, and emotional design.
 * Part of Atlas's modern UX/UI overhaul.
 */

'use client';

import React from 'react';
import { colors, shadows, borderRadius, animations, easing, glassmorphism } from '@/styles/designSystem';

interface AnimatedCardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'glass' | 'subtle';
  hover?: 'lift' | 'glow' | 'scale' | 'none';
  onClick?: () => void;
  className?: string;
  delay?: number;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  variant = 'elevated',
  hover = 'lift',
  onClick,
  className = '',
  delay = 0,
}) => {
  const baseStyles: React.CSSProperties = {
    borderRadius: borderRadius.xl,
    padding: '24px',
    transition: `all ${animations.normal} ${easing.easeInOut}`,
    cursor: onClick ? 'pointer' : 'default',
    animation: `fadeInUp ${animations.slow} ${easing.easeOut} ${delay}ms both`,
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    elevated: {
      ...baseStyles,
      background: '#ffffff',
      boxShadow: shadows.lg,
    },
    glass: {
      ...baseStyles,
      ...glassmorphism.light,
    },
    subtle: {
      ...baseStyles,
      background: colors.neutral[50],
      border: `1px solid ${colors.neutral[200]}`,
    },
  };

  const hoverTransforms: Record<string, React.CSSProperties> = {
    lift: {
      transform: 'translateY(-8px)',
      boxShadow: shadows.xl,
    },
    glow: {
      boxShadow: `0 0 30px ${colors.primary[300]}`,
    },
    scale: {
      transform: 'scale(1.02)',
    },
    none: {},
  };

  const [isHovered, setIsHovered] = React.useState(false);

  const finalStyle: React.CSSProperties = {
    ...variantStyles[variant],
    ...(isHovered && hover !== 'none' ? hoverTransforms[hover] : {}),
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div
        style={finalStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        className={className}
      >
        {children}
      </div>
    </>
  );
};

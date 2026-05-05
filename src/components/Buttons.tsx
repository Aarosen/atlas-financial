'use client';

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { useState } from 'react';
import Link from 'next/link';

export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'md' | 'sm';

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  onClick,
  disabled,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  // REM-37-008 FIX: Button double-click protection
  // Prevent accidental double-clicks from triggering multiple submissions
  const [isClicking, setIsClicking] = useState(false);
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isClicking) {
      e.preventDefault();
      return;
    }
    
    setIsClicking(true);
    
    // Call the original onClick if provided
    if (onClick) {
      onClick(e);
    }
    
    // Re-enable after 500ms to prevent accidental double-clicks
    setTimeout(() => setIsClicking(false), 500);
  };
  
  const variantClass = variant === 'secondary' ? 'btnSecondary' : 'btnPrimary';
  const sizeClass = size === 'sm' ? 'btnSm' : 'btnMd';
  const cn = ['btn', variantClass, sizeClass, className].filter(Boolean).join(' ');
  return (
    <button 
      className={cn} 
      onClick={handleClick}
      disabled={disabled || isClicking}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PrimaryBtn({ onClick, children, disabled }: { onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <Button onClick={onClick} disabled={disabled} variant="primary" size="md">
      {children}
    </Button>
  );
}

export function GhostBtn({ onClick, children, disabled }: { onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <Button onClick={onClick} disabled={disabled} variant="secondary" size="md">
      {children}
    </Button>
  );
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const variantClass = variant === 'secondary' ? 'btnSecondary' : 'btnPrimary';
  const sizeClass = size === 'sm' ? 'btnSm' : 'btnMd';
  const cn = ['btn', variantClass, sizeClass, className].filter(Boolean).join(' ');
  return (
    <Link href={href} className={cn} {...rest}>
      {children}
    </Link>
  );
}

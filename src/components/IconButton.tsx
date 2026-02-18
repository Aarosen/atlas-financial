import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ButtonSize, ButtonVariant } from '@/components/Buttons';

export function IconButton({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const variantClass = variant === 'secondary' ? 'btnSecondary' : 'btnPrimary';
  const sizeClass = size === 'sm' ? 'btnSm' : 'btnMd';
  const cn = ['btn', variantClass, sizeClass, 'iconBtn', className].filter(Boolean).join(' ');
  return (
    <button className={cn} {...rest}>
      {children}
    </button>
  );
}

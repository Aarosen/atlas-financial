import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'md' | 'sm';

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const variantClass = variant === 'secondary' ? 'btnSecondary' : 'btnPrimary';
  const sizeClass = size === 'sm' ? 'btnSm' : 'btnMd';
  const cn = ['btn', variantClass, sizeClass, className].filter(Boolean).join(' ');
  return (
    <button className={cn} {...rest}>
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

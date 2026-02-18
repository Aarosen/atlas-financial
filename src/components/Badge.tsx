import type { HTMLAttributes, ReactNode } from 'react';

export function Badge({ children, className, ...rest }: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  const cn = ['badge', className].filter(Boolean).join(' ');
  return (
    <div className={cn} {...rest}>
      {children}
    </div>
  );
}

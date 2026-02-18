import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ children, className, ...rest }: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  const cn = ['card', className].filter(Boolean).join(' ');
  return (
    <div className={cn} {...rest}>
      {children}
    </div>
  );
}

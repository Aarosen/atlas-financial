import type { HTMLAttributes, ReactNode } from 'react';

export function PageContainer({
  children,
  className,
  maxWidth,
  style,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  maxWidth?: number;
} & HTMLAttributes<HTMLDivElement>) {
  const cn = [className].filter(Boolean).join(' ');
  return (
    <div
      className={cn}
      style={{
        width: '100%',
        maxWidth: maxWidth ?? 820,
        margin: '0 auto',
        paddingLeft: 'var(--padX)',
        paddingRight: 'var(--padX)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Stack({
  children,
  gap = 14,
  className,
  style,
  ...rest
}: {
  children: ReactNode;
  gap?: number;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  const cn = [className].filter(Boolean).join(' ');
  return (
    <div
      className={cn}
      style={{
        display: 'grid',
        gap,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Inline({
  children,
  gap = 12,
  align = 'center',
  justify,
  wrap = true,
  className,
  style,
  ...rest
}: {
  children: ReactNode;
  gap?: number;
  align?: 'stretch' | 'flex-start' | 'center' | 'flex-end' | 'baseline';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  wrap?: boolean;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  const cn = [className].filter(Boolean).join(' ');
  return (
    <div
      className={cn}
      style={{
        display: 'flex',
        alignItems: align,
        justifyContent: justify,
        gap,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Grid({
  children,
  gap = 14,
  columns,
  className,
  style,
  ...rest
}: {
  children: ReactNode;
  gap?: number;
  columns?: string;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  const cn = [className].filter(Boolean).join(' ');
  return (
    <div
      className={cn}
      style={{
        display: 'grid',
        gap,
        gridTemplateColumns: columns,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

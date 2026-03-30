'use client';

interface LoadingSkeletonProps {
  lines?: number;
  height?: string;
  className?: string;
}

export function LoadingSkeleton({
  lines = 3,
  height = 'h-4',
  className = '',
}: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${height} bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded animate-pulse`}
          style={{
            width: i === lines - 1 ? '75%' : '100%',
          }}
        />
      ))}
    </div>
  );
}

export function ActionPipelineLoadingSkeleton() {
  return (
    <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950 rounded-lg p-4 mb-4 border border-teal-200 dark:border-teal-800">
      <div className="h-5 bg-teal-200 dark:bg-teal-800 rounded w-32 mb-3 animate-pulse" />
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
            <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded mt-1 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 animate-pulse" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-64 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-40 mb-2 animate-pulse" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full animate-pulse" />
        </div>
      ))}
    </div>
  );
}

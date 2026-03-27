// TASK 2.6: Progress bar component for profile completeness
export function ProgressBar({ 
  value, 
  max = 100, 
  label,
  showLabel = true 
}: { 
  value: number; 
  max?: number; 
  label?: string;
  showLabel?: boolean;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div style={{ width: '100%' }}>
      {showLabel && label && (
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink2)' }}>{label}</label>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink3)' }}>{Math.round(percentage)}%</span>
        </div>
      )}
      <div 
        style={{
          width: '100%',
          height: 8,
          borderRadius: 999,
          background: 'var(--bg2)',
          border: '1px solid var(--bdr)',
          overflow: 'hidden',
          position: 'relative',
        }}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: percentage < 50 ? 'var(--amber)' : percentage < 80 ? 'var(--sky)' : 'var(--teal)',
            borderRadius: 999,
            transition: 'width 0.3s ease, background-color 0.3s ease',
          }}
          aria-hidden
        />
      </div>
    </div>
  );
}

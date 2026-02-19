export type SparklinePoint = { x: number; y: number };

export function buildSparkline(values: number[]): SparklinePoint[] {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v, idx) => ({ x: idx, y: (v - min) / span }));
}

export type BenchmarkResult = {
  name: string;
  score: number;
  maxScore: number;
  percentile: number;
};

export type CompetitorBenchmark = {
  name: string;
  empathy: number;
  explainability: number;
  personalization: number;
  accuracy: number;
  latency: number;
};

const competitors: Record<string, CompetitorBenchmark> = {
  nerdwallet: {
    name: 'NerdWallet',
    empathy: 6,
    explainability: 7,
    personalization: 5,
    accuracy: 8,
    latency: 2000,
  },
  monarch: {
    name: 'Monarch Money',
    empathy: 7,
    explainability: 6,
    personalization: 7,
    accuracy: 7,
    latency: 1500,
  },
  ynab: {
    name: 'YNAB',
    empathy: 8,
    explainability: 6,
    personalization: 6,
    accuracy: 8,
    latency: 1200,
  },
};

export function benchmarkAtlas(args: {
  empathy: number;
  explainability: number;
  personalization: number;
  accuracy: number;
  latency: number;
}): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];

  Object.entries(competitors).forEach(([key, comp]) => {
    const empathyScore = args.empathy > comp.empathy ? 1 : args.empathy === comp.empathy ? 0.5 : 0;
    const explainScore = args.explainability > comp.explainability ? 1 : args.explainability === comp.explainability ? 0.5 : 0;
    const personScore = args.personalization > comp.personalization ? 1 : args.personalization === comp.personalization ? 0.5 : 0;
    const accuracyScore = args.accuracy > comp.accuracy ? 1 : args.accuracy === comp.accuracy ? 0.5 : 0;
    const latencyScore = args.latency < comp.latency ? 1 : args.latency === comp.latency ? 0.5 : 0;

    const totalScore = empathyScore + explainScore + personScore + accuracyScore + latencyScore;
    const maxScore = 5;
    const percentile = Math.round((totalScore / maxScore) * 100);

    results.push({
      name: comp.name,
      score: totalScore,
      maxScore,
      percentile,
    });
  });

  return results.sort((a, b) => b.percentile - a.percentile);
}

/**
 * TASK 1.4: S10 - Cashflow Forecast Route
 * /conversation/forecast
 */

'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CashflowForecast } from '@/screens/CashflowForecast';

function ForecastContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get financial data from query params
  const monthlyIncome = parseFloat(searchParams.get('income') || '0');
  const monthlyExpenses = parseFloat(searchParams.get('expenses') || '0');
  const currentSavings = parseFloat(searchParams.get('savings') || '0');

  return (
    <CashflowForecast
      monthlyIncome={monthlyIncome}
      monthlyExpenses={monthlyExpenses}
      currentSavings={currentSavings}
      onClose={() => router.back()}
    />
  );
}

export default function ForecastPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
      <ForecastContent />
    </Suspense>
  );
}

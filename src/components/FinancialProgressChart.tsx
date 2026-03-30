'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FinancialSnapshot {
  id: string;
  created_at: string;
  income: number;
  expenses: number;
  savings: number;
  debt: number;
}

interface ChartData {
  date: string;
  savings: number;
  netWorth: number;
}

export function FinancialProgressChart({ userId, accessToken }: { userId: string | null; accessToken?: string }) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchSnapshots = async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch('/api/snapshots/history', {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch financial snapshots');
        }

        const snapshots: FinancialSnapshot[] = await response.json();

        // Transform snapshots into chart data
        const chartData = snapshots
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((snapshot) => ({
            date: new Date(snapshot.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
            savings: snapshot.savings || 0,
            netWorth: (snapshot.savings || 0) - (snapshot.debt || 0),
          }));

        setData(chartData);
      } catch (err) {
        console.error('Error fetching financial snapshots:', err);
        setError('Failed to load financial progress');
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshots();
  }, [userId]);

  if (loading) {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <p className="text-slate-600 dark:text-slate-400 text-sm">Loading financial progress...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          No financial data yet. Start a conversation to track your progress.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-80 bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Financial Progress</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#64748b"
            tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
          />
          <Tooltip
            formatter={(value) => `$${(value as number).toLocaleString()}`}
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#f1f5f9',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="savings"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Savings"
          />
          <Line
            type="monotone"
            dataKey="netWorth"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
            name="Net Worth"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

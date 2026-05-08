/**
 * TASK 1.1: S9 - Transaction Ledger Screen
 * Displays transaction history with categorization
 * Allows add, remove, and CSV import
 */

'use client';

import React, { useState } from 'react';
import { categorizer, type CategorizedTransaction, type TransactionCategory } from '@/lib/ai/categorizer';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: TransactionCategory;
  confidence: number;
}

interface TransactionLedgerProps {
  onClose?: () => void;
}

export function TransactionLedger({ onClose }: TransactionLedgerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [categoryTotals, setCategoryTotals] = useState<Record<TransactionCategory, number>>({
    housing: 0,
    utilities: 0,
    food: 0,
    transportation: 0,
    healthcare: 0,
    insurance: 0,
    debt_payment: 0,
    savings: 0,
    investment: 0,
    entertainment: 0,
    dining: 0,
    shopping: 0,
    subscription: 0,
    education: 0,
    childcare: 0,
    personal_care: 0,
    gifts: 0,
    travel: 0,
    other: 0,
  });

  const handleAddTransaction = () => {
    if (!newDescription.trim() || !newAmount.trim()) {
      alert('Please enter description and amount');
      return;
    }

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const categorized = categorizer.categorize(newDescription, amount);
    const transaction: Transaction = {
      id: `txn_${Date.now()}`,
      description: newDescription,
      amount,
      date: new Date().toISOString().split('T')[0],
      category: categorized.category,
      confidence: categorized.confidence,
    };

    const updated = [...transactions, transaction];
    setTransactions(updated);
    updateCategoryTotals(updated);
    setNewDescription('');
    setNewAmount('');
  };

  const handleRemoveTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    updateCategoryTotals(updated);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n').filter(line => line.trim());
      const newTransactions: Transaction[] = [];

      for (let i = 1; i < lines.length; i++) {
        const [description, amountStr] = lines[i].split(',').map(s => s.trim());
        if (!description || !amountStr) continue;

        const amount = parseFloat(amountStr);
        if (isNaN(amount)) continue;

        const categorized = categorizer.categorize(description, amount);
        newTransactions.push({
          id: `txn_${Date.now()}_${i}`,
          description,
          amount,
          date: new Date().toISOString().split('T')[0],
          category: categorized.category,
          confidence: categorized.confidence,
        });
      }

      const updated = [...transactions, ...newTransactions];
      setTransactions(updated);
      updateCategoryTotals(updated);
    };
    reader.readAsText(file);
  };

  const updateCategoryTotals = (txns: Transaction[]) => {
    const categorized = txns.map(t => ({
      description: t.description,
      amount: t.amount,
      category: t.category,
      confidence: t.confidence,
      rule: '',
    }));
    const totals = categorizer.getCategoryTotals(categorized);
    setCategoryTotals(totals);
  };

  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Transaction Ledger</h2>
        {onClose && <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--bdr)', cursor: 'pointer' }}>Close</button>}
      </div>

      <div>
        {/* Add Transaction Form */}
        <div style={{ padding: 16, border: '1px solid var(--bdr)', borderRadius: 8, marginBottom: 16 }}>
          <h3>Add Transaction</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Description (e.g., Whole Foods grocery)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--bdr)', borderRadius: 4 }}
            />
            <input
              type="number"
              placeholder="Amount"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--bdr)', borderRadius: 4 }}
            />
            <button onClick={handleAddTransaction} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              Add Transaction
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            <label>Import CSV (description, amount)</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              style={{ padding: '8px 12px', border: '1px solid var(--bdr)', borderRadius: 4 }}
            />
          </div>
        </div>

        {/* Category Totals */}
        <div style={{ padding: 16, border: '1px solid var(--bdr)', borderRadius: 8, marginBottom: 16 }}>
          <h3>Spending by Category</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
            {Object.entries(categoryTotals)
              .filter(([_, total]) => total > 0)
              .sort(([_, a], [__, b]) => b - a)
              .map(([category, total]) => (
                <div key={category} style={{ padding: 12, backgroundColor: 'var(--bg2)', borderRadius: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 4 }}>{category.replace('_', ' ')}</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>${total.toFixed(2)}</div>
                </div>
              ))}
          </div>
          <div style={{ padding: 12, backgroundColor: 'var(--bg3)', borderRadius: 6, textAlign: 'center' }}>
            <strong>Total Spent: ${totalSpent.toFixed(2)}</strong>
          </div>
        </div>

        {/* Transaction List */}
        <div style={{ padding: 16, border: '1px solid var(--bdr)', borderRadius: 8, marginBottom: 16 }}>
          <h3>Transactions ({transactions.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transactions.length === 0 ? (
              <p style={{ color: 'var(--ink3)', textAlign: 'center', padding: 20 }}>No transactions yet</p>
            ) : (
              transactions.map(txn => (
                <div key={txn.id} style={{ padding: 12, backgroundColor: 'var(--bg2)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{txn.description}</div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--ink3)' }}>
                      <span>{txn.category}</span>
                      <span>
                        {(txn.confidence * 100).toFixed(0)}% confident
                      </span>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, marginRight: 12 }}>${txn.amount.toFixed(2)}</div>
                  <button onClick={() => handleRemoveTransaction(txn.id)} style={{ padding: '6px 10px', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

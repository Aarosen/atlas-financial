/**
 * TASK 1.3: Bank Sync Card Component
 * Plaid integration UI for connecting bank accounts
 * Displays connected accounts and transactions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { plaidClient, type PlaidAccount, type PlaidTransaction } from '@/lib/services/plaidClient';
import { Card } from '@/components/Card';

interface BankSyncCardProps {
  userId: string;
  onAccountsConnected?: (accounts: PlaidAccount[]) => void;
}

declare global {
  interface Window {
    Plaid?: any;
  }
}

export function BankSyncCard({ userId, onAccountsConnected }: BankSyncCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Load Plaid Link script
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v3/stable/link-initialize.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleConnectBank = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Create link token
      const linkToken = await plaidClient.createLinkToken(userId);

      // Initialize Plaid Link
      if (!window.Plaid) {
        throw new Error('Plaid Link not loaded');
      }

      const handler = window.Plaid.create({
        token: linkToken,
        onSuccess: async (publicToken: string) => {
          try {
            // Exchange public token for access token
            const token = await plaidClient.exchangePublicToken(publicToken);
            setAccessToken(token);

            // Get accounts
            const accts = await plaidClient.getAccounts(token);
            setAccounts(accts);
            setIsConnected(true);
            onAccountsConnected?.(accts);

            // Get recent transactions
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0];
            const txns = await plaidClient.getTransactions(token, startDate, endDate);
            setTransactions(txns);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect account');
          }
        },
        onExit: () => {
          setIsLoading(false);
        },
      });

      handler.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Plaid');
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      if (accessToken) {
        await plaidClient.disconnect(accessToken);
      }
      setIsConnected(false);
      setAccounts([]);
      setTransactions([]);
      setAccessToken(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Bank Sync</h3>
        {isConnected && <span style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 600 }}>Connected</span>}
      </div>

      {error && <div style={{ padding: 12, backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 6, marginBottom: 12 }}>{error}</div>}

      {!isConnected ? (
        <div>
          <p style={{ color: 'var(--ink2)', fontSize: 14, marginBottom: 12 }}>Connect your bank account to automatically track transactions and sync spending data.</p>
          <button
            onClick={handleConnectBank}
            disabled={isLoading}
            style={{
              padding: '10px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {isLoading ? 'Connecting...' : 'Connect Bank Account'}
          </button>
        </div>
      ) : (
        <div>
          {/* Connected Accounts */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Connected Accounts ({accounts.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {accounts.map((account) => (
                <div key={account.accountId} style={{ padding: 12, backgroundColor: 'var(--bg2)', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{account.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink3)' }}>{account.type} • {account.mask}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Balance</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{formatCurrency(account.balance.current)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          {transactions.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Recent Transactions (Last 30 Days)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {transactions.slice(0, 10).map((txn) => (
                  <div key={txn.transactionId} style={{ padding: 10, backgroundColor: 'var(--bg2)', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14 }}>{txn.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink3)' }}>{txn.category.join(', ')}</div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{txn.amount > 0 ? '+' : ''}{formatCurrency(txn.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disconnect Button */}
          <button
            onClick={handleDisconnect}
            disabled={isLoading}
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--bg2)',
              color: 'var(--ink)',
              border: '1px solid var(--bdr)',
              borderRadius: 6,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {isLoading ? 'Disconnecting...' : 'Disconnect Bank Account'}
          </button>
        </div>
      )}
    </Card>
  );
}

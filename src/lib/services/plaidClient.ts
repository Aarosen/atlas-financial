/**
 * TASK 1.3: Plaid Client
 * Handles Plaid Link integration and bank account connection
 * Uses server-side proxy for security
 */

export interface PlaidLinkConfig {
  clientName: string;
  user: {
    clientUserId: string;
  };
  clientId: string;
  secret: string;
  language: string;
  countryCodes: string[];
  products: string[];
  env: 'sandbox' | 'development' | 'production';
}

export interface PlaidAccount {
  accountId: string;
  name: string;
  type: string;
  subtype: string;
  mask: string;
  balance: {
    available: number;
    current: number;
    limit?: number;
  };
}

export interface PlaidTransaction {
  transactionId: string;
  accountId: string;
  amount: number;
  currency: string;
  date: string;
  name: string;
  merchantName?: string;
  category: string[];
  pending: boolean;
}

/**
 * Plaid Client - handles bank account connections
 * All API calls go through server-side proxy at /api/plaid
 */
export class PlaidClient {
  private clientId: string;
  private secret: string;
  private env: 'sandbox' | 'development' | 'production';

  constructor(
    clientId: string = process.env.PLAID_CLIENT_ID || '',
    secret: string = process.env.PLAID_SECRET || '',
    env: 'sandbox' | 'development' | 'production' = (process.env.PLAID_ENV as any) || 'sandbox'
  ) {
    this.clientId = clientId;
    this.secret = secret;
    this.env = env;
  }

  /**
   * Create Plaid Link token for frontend
   */
  async createLinkToken(userId: string): Promise<string> {
    const response = await fetch('/api/plaid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_link_token',
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create link token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.linkToken;
  }

  /**
   * Exchange public token for access token
   */
  async exchangePublicToken(publicToken: string): Promise<string> {
    const response = await fetch('/api/plaid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'exchange_public_token',
        publicToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.accessToken;
  }

  /**
   * Get accounts for connected bank
   */
  async getAccounts(accessToken: string): Promise<PlaidAccount[]> {
    const response = await fetch('/api/plaid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_accounts',
        accessToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get accounts: ${response.statusText}`);
    }

    const data = await response.json();
    return data.accounts || [];
  }

  /**
   * Get transactions for account
   */
  async getTransactions(
    accessToken: string,
    startDate: string,
    endDate: string
  ): Promise<PlaidTransaction[]> {
    const response = await fetch('/api/plaid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_transactions',
        accessToken,
        startDate,
        endDate,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get transactions: ${response.statusText}`);
    }

    const data = await response.json();
    return data.transactions || [];
  }

  /**
   * Disconnect bank account
   */
  async disconnect(accessToken: string): Promise<void> {
    const response = await fetch('/api/plaid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'disconnect',
        accessToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to disconnect: ${response.statusText}`);
    }
  }
}

// Singleton instance
export const plaidClient = new PlaidClient();

/**
 * TASK 1.3: Plaid API Proxy
 * Server-side proxy for Plaid API calls
 * Never expose credentials to frontend
 */

export const runtime = 'edge';

const PLAID_API = 'https://sandbox.plaid.com';
const CLIENT_ID = process.env.PLAID_CLIENT_ID || '';
const SECRET = process.env.PLAID_SECRET || '';

interface PlaidRequest {
  action: 'create_link_token' | 'exchange_public_token' | 'get_accounts' | 'get_transactions' | 'disconnect';
  userId?: string;
  publicToken?: string;
  accessToken?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * POST /api/plaid
 * Handles all Plaid API calls through server-side proxy
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PlaidRequest;
    const { action } = body;

    // Validate credentials
    if (!CLIENT_ID || !SECRET) {
      return new Response(
        JSON.stringify({ error: 'Plaid credentials not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'create_link_token':
        return await createLinkToken(body.userId || '');

      case 'exchange_public_token':
        return await exchangePublicToken(body.publicToken || '');

      case 'get_accounts':
        return await getAccounts(body.accessToken || '');

      case 'get_transactions':
        return await getTransactions(
          body.accessToken || '',
          body.startDate || '',
          body.endDate || ''
        );

      case 'disconnect':
        return await disconnect(body.accessToken || '');

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Plaid API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Create Plaid Link token
 */
async function createLinkToken(userId: string) {
  const response = await fetch(`${PLAID_API}/link/token/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      secret: SECRET,
      client_name: 'Atlas Financial',
      user: { client_user_id: userId },
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    }),
  });

  if (!response.ok) {
    throw new Error(`Plaid API error: ${response.statusText}`);
  }

  const data = await response.json();
  return new Response(JSON.stringify({ linkToken: data.link_token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Exchange public token for access token
 */
async function exchangePublicToken(publicToken: string) {
  const response = await fetch(`${PLAID_API}/item/public_token/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      secret: SECRET,
      public_token: publicToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Plaid API error: ${response.statusText}`);
  }

  const data = await response.json();
  return new Response(JSON.stringify({ accessToken: data.access_token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Get accounts for connected bank
 */
async function getAccounts(accessToken: string) {
  const response = await fetch(`${PLAID_API}/accounts/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      secret: SECRET,
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Plaid API error: ${response.statusText}`);
  }

  const data = await response.json();
  const accounts = data.accounts.map((acc: any) => ({
    accountId: acc.account_id,
    name: acc.name,
    type: acc.type,
    subtype: acc.subtype,
    mask: acc.mask,
    balance: {
      available: acc.balances.available,
      current: acc.balances.current,
      limit: acc.balances.limit,
    },
  }));

  return new Response(JSON.stringify({ accounts }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Get transactions for account
 */
async function getTransactions(accessToken: string, startDate: string, endDate: string) {
  const response = await fetch(`${PLAID_API}/transactions/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      secret: SECRET,
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    }),
  });

  if (!response.ok) {
    throw new Error(`Plaid API error: ${response.statusText}`);
  }

  const data = await response.json();
  const transactions = data.transactions.map((txn: any) => ({
    transactionId: txn.transaction_id,
    accountId: txn.account_id,
    amount: txn.amount,
    currency: txn.iso_currency_code,
    date: txn.date,
    name: txn.name,
    merchantName: txn.merchant_name,
    category: txn.personal_finance_category?.primary || [],
    pending: txn.pending,
  }));

  return new Response(JSON.stringify({ transactions }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Disconnect bank account
 */
async function disconnect(accessToken: string) {
  const response = await fetch(`${PLAID_API}/item/remove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      secret: SECRET,
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Plaid API error: ${response.statusText}`);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

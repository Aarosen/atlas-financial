/**
 * TASK 1.1: S9 - Transaction Ledger Route
 * /conversation/transactions
 */

'use client';

import { useRouter } from 'next/navigation';
import { TransactionLedger } from '@/screens/TransactionLedger';

export default function TransactionsPage() {
  const router = useRouter();

  return (
    <TransactionLedger
      onClose={() => router.back()}
    />
  );
}

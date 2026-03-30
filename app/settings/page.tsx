'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const { userId, email, signOut, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId || ''}`,
        },
        body: JSON.stringify({
          userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      setSuccess('Account deleted successfully. Signing out...');
      setTimeout(() => {
        signOut();
        router.push('/');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 p-4">
        <div className="max-w-2xl mx-auto py-12">
          <h1 className="text-2xl font-bold mb-4">Settings</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Please <Link href="/conversation" className="text-blue-600 hover:underline">sign in</Link> to access settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 p-4">
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>

        {/* Account Information */}
        <div className="mb-8 p-6 border border-slate-200 dark:border-slate-700 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Account Information</h2>
          <div className="space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">Email:</span> {email}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">User ID:</span> {userId}
            </p>
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="mb-8 p-6 border border-slate-200 dark:border-slate-700 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Data & Privacy</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Your financial data is stored securely in our Supabase database. You can request to download or delete your data at any time.
          </p>
          <div className="space-y-2">
            <p className="text-sm">
              <Link href="/privacy" className="text-blue-600 hover:underline">
                View Privacy Policy
              </Link>
            </p>
            <p className="text-sm">
              <Link href="/terms" className="text-blue-600 hover:underline">
                View Terms of Service
              </Link>
            </p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mb-8 p-6 border-2 border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-900/20">
          <h2 className="text-lg font-semibold mb-4 text-red-900 dark:text-red-200">Danger Zone</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded text-red-900 dark:text-red-200 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700 rounded text-green-900 dark:text-green-200 text-sm">
              {success}
            </div>
          )}

          <div className="mb-4">
            <p className="text-sm text-red-900 dark:text-red-200 mb-4">
              Deleting your account will permanently remove all your data, including:
            </p>
            <ul className="text-sm text-red-900 dark:text-red-200 space-y-1 ml-4 list-disc">
              <li>Conversation history</li>
              <li>Financial goals and actions</li>
              <li>Financial snapshots and progress</li>
              <li>All personal information</li>
            </ul>
          </div>

          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm('confirm')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm"
              disabled={isDeleting}
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-red-900 dark:text-red-200 font-medium">
                Type DELETE to confirm account deletion:
              </p>
              <input
                type="text"
                value={deleteConfirm === 'confirm' ? '' : deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                disabled={isDeleting}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm disabled:opacity-50"
                  disabled={isDeleting || deleteConfirm !== 'DELETE'}
                >
                  {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
                </button>
                <button
                  onClick={() => setDeleteConfirm('')}
                  className="px-4 py-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded font-medium text-sm"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="mt-8">
          <Link href="/conversation" className="text-blue-600 hover:underline text-sm">
            ← Back to Conversation
          </Link>
        </div>
      </div>
    </div>
  );
}

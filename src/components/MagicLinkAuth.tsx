import { useState } from 'react';
import { sendMagicLink } from '@/lib/auth/authContext';
import { Button } from '@/components/Buttons';
import { Card } from '@/components/Card';

export function MagicLinkAuth({
  onAuthSuccess,
}: {
  onAuthSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSendLink = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await sendMagicLink(email);

    if (result.success) {
      setSent(true);
      setEmail('');
    } else {
      setError(result.error || 'Failed to send magic link');
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleSendLink();
    }
  };

  if (sent) {
    return (
      <Card
        style={{
          padding: 24,
          textAlign: 'center',
          maxWidth: 400,
          margin: '0 auto',
        }}
      >
        <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>
          Check your email
        </h2>
        <p style={{ marginBottom: 16, color: '#666', lineHeight: 1.5 }}>
          We've sent a magic link to <strong>{email}</strong>. Click the link in
          your email to sign in.
        </p>
        <p style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>
          The link expires in 24 hours.
        </p>
        <Button
          onClick={() => setSent(false)}
          style={{ width: '100%' }}
        >
          Send to different email
        </Button>
      </Card>
    );
  }

  return (
    <Card
      style={{
        padding: 24,
        maxWidth: 400,
        margin: '0 auto',
      }}
    >
      <h2 style={{ marginBottom: 8, fontSize: 20, fontWeight: 600 }}>
        Sign in to Atlas
      </h2>
      <p style={{ marginBottom: 20, color: '#666', fontSize: 14 }}>
        Enter your email to get a magic link. No password needed.
      </p>

      <div style={{ marginBottom: 16 }}>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: error ? '2px solid #ef4444' : '1px solid #ddd',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            backgroundColor: '#fff',
            color: '#000',
          }}
        />
      </div>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            color: '#991b1b',
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      <Button
        onClick={handleSendLink}
        disabled={loading || !email.trim()}
        style={{
          width: '100%',
          opacity: loading || !email.trim() ? 0.6 : 1,
        }}
      >
        {loading ? 'Sending...' : 'Send magic link'}
      </Button>

      <p style={{ marginTop: 16, fontSize: 12, color: '#999', textAlign: 'center' }}>
        Your financial data is encrypted and secure.
      </p>
    </Card>
  );
}

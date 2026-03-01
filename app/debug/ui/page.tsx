'use client';

import { useState } from 'react';
import { Button } from '@/components/Buttons';
import { Card } from '@/components/Card';
import { Textarea } from '@/components/TextInput';
import { IconButton } from '@/components/IconButton';
import { Sun, Moon } from 'lucide-react';

export default function DebugUIPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <div style={{ padding: '40px', background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>UI Components Matrix</h1>
          <IconButton
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </IconButton>
        </div>

        {/* Buttons Section */}
        <div style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Buttons</h2>
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <Card>
              <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>Primary</div>
              <Button variant="primary" size="md">Primary Button</Button>
            </Card>
            <Card>
              <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>Secondary</div>
              <Button variant="secondary" size="md">Secondary Button</Button>
            </Card>
            <Card>
              <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>Small</div>
              <Button variant="primary" size="sm">Small Button</Button>
            </Card>
            <Card>
              <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>Disabled</div>
              <Button variant="primary" size="md" disabled>Disabled Button</Button>
            </Card>
          </div>
        </div>

        {/* Cards Section */}
        <div style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Cards</h2>
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <Card>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Default Card</div>
              <div style={{ color: 'var(--ink2)', fontSize: '14px' }}>This is a default card with standard styling.</div>
            </Card>
            <Card>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Card with Content</div>
              <div style={{ color: 'var(--ink2)', fontSize: '14px', marginBottom: '12px' }}>Cards can contain various content types.</div>
              <Button variant="secondary" size="sm">Action</Button>
            </Card>
          </div>
        </div>

        {/* Inputs Section */}
        <div style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Inputs</h2>
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <Card>
              <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>Text Input</div>
              <input
                type="text"
                placeholder="Enter text..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--bdr)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontFamily: 'inherit',
                }}
              />
            </Card>
            <Card>
              <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>Textarea</div>
              <Textarea
                placeholder="Enter multiple lines..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--bdr)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontFamily: 'inherit',
                  resize: 'none',
                }}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

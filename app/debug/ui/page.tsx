import { Badge } from '@/components/Badge';
import { Button } from '@/components/Buttons';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { TextInput, Textarea } from '@/components/TextInput';
import { ArrowUp, Moon, Sun } from 'lucide-react';

export default function UiDebugPage() {
  return (
    <div className="container page">
      <div style={{ display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 950, letterSpacing: '-0.02em', fontSize: 18 }}>UI Matrix</div>
          <Badge>Debug</Badge>
        </div>

        <Card>
          <div style={{ fontWeight: 950, marginBottom: 12 }}>Buttons</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button variant="primary" size="md">Primary</Button>
            <Button variant="primary" size="md" disabled>Primary disabled</Button>
            <Button variant="secondary" size="md">Secondary</Button>
            <Button variant="secondary" size="md" disabled>Secondary disabled</Button>
            <Button variant="primary" size="sm">Primary sm</Button>
            <Button variant="secondary" size="sm">Secondary sm</Button>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <IconButton aria-label="Theme (dark)"><Moon size={18} aria-hidden /></IconButton>
            <IconButton aria-label="Theme (light)"><Sun size={18} aria-hidden /></IconButton>
            <IconButton variant="primary" aria-label="Send"><ArrowUp size={18} aria-hidden /></IconButton>
          </div>
        </Card>

        <Card>
          <div style={{ fontWeight: 950, marginBottom: 12 }}>Inputs</div>
          <div style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
            <TextInput placeholder="Email" />
            <TextInput placeholder="Disabled" disabled />
            <Textarea placeholder="Message" rows={3} style={{ resize: 'vertical' }} />
          </div>
        </Card>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ fontWeight: 950 }}>Cards</div>
          <div className="gridCards">
            <Card>
              <div style={{ fontWeight: 900 }}>Default Card</div>
              <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>Border, radius, shadow, padding per tokens.</div>
            </Card>
            <Card className="cardLg">
              <div style={{ fontWeight: 900 }}>Large Card</div>
              <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>Variant via className.</div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Card } from '@/components/Card';
import { GhostBtn, PrimaryBtn } from '@/components/Buttons';
import { TopBar, ScreenWrap } from '@/components/TopBar';

export function SettingsScreen({
  theme,
  onToggleTheme,
  apiErr,
  apiStatus,
  onThemeLight,
  onThemeDark,
  speakReplies,
  onToggleSpeakReplies,
  voiceAutoSend,
  onToggleVoiceAutoSend,
  onDeleteLocalData,
  onBackToDashboard,
  canBackToDashboard,
}: {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  apiErr: string | null;
  apiStatus: 'unknown' | 'online' | 'degraded' | 'offline';
  onThemeLight: () => void;
  onThemeDark: () => void;
  speakReplies: boolean;
  onToggleSpeakReplies: () => void;
  voiceAutoSend: boolean;
  onToggleVoiceAutoSend: () => void;
  onDeleteLocalData: () => void;
  onBackToDashboard: () => void;
  canBackToDashboard: boolean;
}) {
  return (
    <ScreenWrap>
      <TopBar title="Settings" theme={theme} onToggleTheme={onToggleTheme} apiErr={apiErr} apiStatus={apiStatus} />
      <div style={{ padding: 'var(--padY) var(--padX)' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 14, width: '100%' }}>
          <Card>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Theme</div>
            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <GhostBtn onClick={onThemeLight}>Light</GhostBtn>
              <GhostBtn onClick={onThemeDark}>Dark</GhostBtn>
            </div>
          </Card>
          <Card>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Data</div>
            <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>Messages you type may be sent to our AI provider to generate responses.</div>
            <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>Atlas stores your financial state locally (IndexedDB today; later Supabase). You can wipe local data anytime.</div>
            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <GhostBtn onClick={onDeleteLocalData}>Delete local data</GhostBtn>
              <PrimaryBtn onClick={onBackToDashboard} disabled={!canBackToDashboard}>
                Back to dashboard
              </PrimaryBtn>
            </div>
          </Card>

          <Card>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Voice</div>
            <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>Speak replies uses your browser’s built-in text-to-speech. You can turn it on any time.</div>
            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <GhostBtn onClick={onToggleSpeakReplies}>{speakReplies ? 'Speak replies: On' : 'Speak replies: Off'}</GhostBtn>
              <GhostBtn onClick={onToggleVoiceAutoSend}>{voiceAutoSend ? 'Voice auto-send: On' : 'Voice auto-send: Off'}</GhostBtn>
            </div>
          </Card>
        </div>
      </div>
    </ScreenWrap>
  );
}

import type { EmotionTag } from './detectEmotion';

export function pickAck(emotion: EmotionTag, _userText: string): string | null {
  switch (emotion) {
    case 'overwhelmed':
      return "Complex is a real word for it — most people who say that have more going on than they think they do. We don't have to untangle it all at once. Let's start with what comes in.";
    case 'shame':
      return "Real quick — there's nothing dumb about any of this. Money is complicated; you're not. We'll go at whatever pace works.";
    case 'analytical':
      return "Got it — you want the numbers to do the talking. I'll keep this efficient and show the math as we go.";
    case 'uncertain':
      return "Approximate is fine. We can sharpen the numbers later — what matters is the picture.";
    case 'motivated':
      return "Love it. Let's make this fast and focused.";
    default:
      return null;
  }
}

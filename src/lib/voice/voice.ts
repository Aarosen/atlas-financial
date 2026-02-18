export type VoiceTranscriptHandler = (text: string) => void;

export type VoiceListeningHandler = (listening: boolean) => void;

export type VoiceSpeakingHandler = (speaking: boolean) => void;

export type VoiceOptions = {
  onTranscript?: VoiceTranscriptHandler;
  onListeningChange?: VoiceListeningHandler;
  onSpeakingChange?: VoiceSpeakingHandler;
};

export type Voice = {
  sttSupported: boolean;
  ttsSupported: boolean;
  startStt: () => void;
  stopStt: () => void;
  speak: (text: string) => void;
  stopSpeak: () => void;
  setOnTranscript: (h?: VoiceTranscriptHandler) => void;
};

export function createVoice(opts: VoiceOptions = {}): Voice {
  const w = typeof window !== 'undefined' ? (window as any) : null;
  const SpeechRecognition = w?.SpeechRecognition || w?.webkitSpeechRecognition;
  const sttSupported = !!SpeechRecognition;
  const ttsSupported = typeof window !== 'undefined' && !!window.speechSynthesis;

  let onTranscript: VoiceTranscriptHandler | undefined = opts.onTranscript;
  let onListeningChange: VoiceListeningHandler | undefined = opts.onListeningChange;
  let onSpeakingChange: VoiceSpeakingHandler | undefined = opts.onSpeakingChange;
  let rec: any | null = null;

  if (sttSupported) {
    rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => onListeningChange?.(true);
    rec.onend = () => onListeningChange?.(false);
    rec.onerror = () => onListeningChange?.(false);

    rec.onresult = (e: any) => {
      const t = e?.results?.[0]?.[0]?.transcript;
      if (typeof t === 'string' && t.trim()) onTranscript?.(t.trim());
    };
  }

  const startStt = () => {
    try {
      rec?.start?.();
    } catch {
      // ignore
    }
  };

  const stopStt = () => {
    try {
      rec?.stop?.();
    } catch {
      // ignore
    }
  };

  const speak = (text: string) => {
    if (!ttsSupported) return;
    const t = (text || '').trim();
    if (!t) return;

    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      onSpeakingChange?.(true);
      u.onend = () => onSpeakingChange?.(false);
      u.onerror = () => onSpeakingChange?.(false);
      window.speechSynthesis.speak(u);
    } catch {
      // ignore
    }
  };

  const stopSpeak = () => {
    if (!ttsSupported) return;
    try {
      window.speechSynthesis.cancel();
      onSpeakingChange?.(false);
    } catch {
      // ignore
    }
  };

  const setOnTranscript = (h?: VoiceTranscriptHandler) => {
    onTranscript = h;
  };

  return {
    sttSupported,
    ttsSupported,
    startStt,
    stopStt,
    speak,
    stopSpeak,
    setOnTranscript,
  };
}

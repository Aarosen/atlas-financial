/**
 * Voice error feedback system for Atlas Financial
 * Provides audio feedback for errors and important messages
 */

export interface VoiceErrorConfig {
  enabled: boolean;
  rate: number; // 0.5 - 2.0
  pitch: number; // 0.5 - 2.0
  volume: number; // 0 - 1
}

const defaultConfig: VoiceErrorConfig = {
  enabled: true,
  rate: 0.9,
  pitch: 1.0,
  volume: 0.8,
};

let synth: SpeechSynthesis | null = null;
let config = { ...defaultConfig };

export function initializeVoiceErrorFeedback(customConfig?: Partial<VoiceErrorConfig>): void {
  if (typeof window === 'undefined') return;

  synth = window.speechSynthesis;
  if (customConfig) {
    config = { ...config, ...customConfig };
  }
}

export function speakError(message: string, severity: 'critical' | 'high' | 'medium' | 'low' = 'medium'): void {
  if (!config.enabled || !synth) return;

  // Adjust rate based on severity
  const rateAdjustment = {
    critical: 0.8, // Slower for critical
    high: 0.85,
    medium: 0.9,
    low: 1.0,
  };

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = config.rate * rateAdjustment[severity];
  utterance.pitch = config.pitch;
  utterance.volume = config.volume;

  // Add error tone prefix for critical errors
  if (severity === 'critical') {
    utterance.text = `Alert. ${message}`;
  }

  synth.cancel();
  synth.speak(utterance);
}

export function speakWarning(message: string): void {
  speakError(`Warning. ${message}`, 'high');
}

export function speakSuccess(message: string): void {
  if (!config.enabled || !synth) return;

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = config.rate;
  utterance.pitch = 1.1; // Slightly higher pitch for success
  utterance.volume = config.volume;

  synth.cancel();
  synth.speak(utterance);
}

export function speakInfo(message: string): void {
  if (!config.enabled || !synth) return;

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = config.rate;
  utterance.pitch = config.pitch;
  utterance.volume = config.volume;

  synth.cancel();
  synth.speak(utterance);
}

export function stopVoiceFeedback(): void {
  if (synth) {
    synth.cancel();
  }
}

export function setVoiceConfig(newConfig: Partial<VoiceErrorConfig>): void {
  config = { ...config, ...newConfig };
}

export function getVoiceConfig(): VoiceErrorConfig {
  return { ...config };
}

export function isVoiceAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!synth) return [];
  return synth.getVoices();
}

export function setVoice(voiceIndex: number): void {
  if (!synth) return;
  const voices = synth.getVoices();
  if (voiceIndex >= 0 && voiceIndex < voices.length) {
    // Store voice preference for future use
    localStorage.setItem('atlas:preferredVoice', voiceIndex.toString());
  }
}

export function getPreferredVoice(): SpeechSynthesisVoice | null {
  if (!synth) return null;
  const voiceIndex = parseInt(localStorage.getItem('atlas:preferredVoice') || '0');
  const voices = synth.getVoices();
  return voices[voiceIndex] || voices[0] || null;
}

// Error message templates
export const errorMessages = {
  networkError: 'Network connection error. Please check your internet connection.',
  apiError: 'API error. Please try again in a moment.',
  authError: 'Authentication error. Please sign in again.',
  rateLimitError: 'Too many requests. Please wait a moment before trying again.',
  timeoutError: 'Request timed out. Please try again.',
  validationError: 'Invalid input. Please check your message and try again.',
  serverError: 'Server error. Our team has been notified. Please try again later.',
  unknownError: 'An unknown error occurred. Please try again.',
};

export function getErrorMessage(errorType: keyof typeof errorMessages): string {
  return errorMessages[errorType] || errorMessages.unknownError;
}

export function speakErrorByType(errorType: keyof typeof errorMessages, severity: 'critical' | 'high' | 'medium' | 'low' = 'high'): void {
  const message = getErrorMessage(errorType);
  speakError(message, severity);
}

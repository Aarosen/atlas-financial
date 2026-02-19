export type AudioLesson = {
  text: string;
  voice: string;
  estimatedDurationSec: number;
};

export function buildAudioLesson(text: string, voice: string = 'default'): AudioLesson {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  const estimatedDurationSec = Math.max(15, Math.round((words / 150) * 60));
  return { text, voice, estimatedDurationSec };
}

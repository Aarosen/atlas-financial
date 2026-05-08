export const ATLAS_VOICE = {
  greeting: [
    'Hey, good to see you.',
    'Welcome back.',
    'Glad you\'re here.',
    'Let\'s see where you stand.',
  ],

  congrats_tier: {
    Foundation:
      'You showed up. That\'s the hardest part.',
    Stabilizing:
      'Foundations are now real foundations. Welcome to Stabilizing.',
    Strategic:
      'You\'re past the "just trying to keep my head above water" phase. Welcome to Strategic — the part where we get clever.',
    GrowthReady:
      'Look at you. Growth-Ready. The compounding starts to feel weirdly easy from here.',
  },

  streak: (n: number): string => {
    if (n === 1) {
      return 'First week clean. That\'s a beginning.';
    }
    return `${n} weeks in a row. Quietly impressive.`;
  },

  followup_prompt: (lever: string, amt: number): string => {
    return `A week ago you committed to $${Math.round(amt)}/mo on ${lever}. How's it going?`;
  },

  followup_options: [
    { label: 'Did it', value: 'did_it' },
    { label: 'Partial', value: 'partial' },
    { label: 'Skipped', value: 'skipped' },
  ],

  celebration: (tier: string): string => {
    const msg = (ATLAS_VOICE.congrats_tier as Record<string, string>)[tier];
    return msg || 'You\'re making progress. Keep going.';
  },
};

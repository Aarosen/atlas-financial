import { Behaviour, BehaviourEvent } from './Behaviour';

export type ToneType = 'baseline' | 'ambitious' | 'gentle';

export class Tone {
  static infer(behaviour: BehaviourEvent[]): ToneType {
    const followups = behaviour.filter((b) => b.kind === 'followup');

    if (followups.length < 3) {
      return 'baseline';
    }

    const did = followups.filter((b) => b.result === 'did_it').length;
    const rate = did / followups.length;

    if (rate >= 0.7) {
      return 'ambitious';
    }

    if (rate <= 0.3) {
      return 'gentle';
    }

    return 'baseline';
  }

  static async inferFromDb(db: any): Promise<ToneType> {
    const beh = await Behaviour.getAll(db);
    return this.infer(beh);
  }

  static scaleSuggestion(baseSuggestion: number, tone: ToneType): number {
    if (tone === 'ambitious') {
      return baseSuggestion * 1.5;
    }
    if (tone === 'gentle') {
      return baseSuggestion * 0.5;
    }
    return baseSuggestion;
  }

  static getTonePromptLine(tone: ToneType): string {
    if (tone === 'ambitious') {
      return 'The user follows through reliably — be direct and slightly ambitious.';
    }
    if (tone === 'gentle') {
      return 'The user is rebuilding momentum — be especially gentle and propose tiny steps.';
    }
    return '';
  }
}

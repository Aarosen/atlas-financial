export interface StreakRecord {
  k: string; // 'streak'
  current: number; // weeks
  lastUpdated: number;
  maxEver: number;
}

export class Streaks {
  static async getOrCreate(db: any): Promise<StreakRecord> {
    let record = await db.get('prefs', 'streak');
    if (!record) {
      record = {
        k: 'streak',
        current: 0,
        lastUpdated: Date.now(),
        maxEver: 0,
      };
      await db.set('prefs', record);
    }
    return record;
  }

  static async update(db: any, weekWasClean: boolean): Promise<StreakRecord> {
    const record = await this.getOrCreate(db);
    const now = Date.now();
    const lastWeek = record.lastUpdated;
    const daysSinceUpdate = (now - lastWeek) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate >= 7) {
      // A week has passed
      if (weekWasClean) {
        record.current += 1;
        record.maxEver = Math.max(record.maxEver, record.current);
      } else {
        record.current = 0;
      }
      record.lastUpdated = now;
      await db.set('prefs', record);
    }

    return record;
  }

  static async getCurrent(db: any): Promise<number> {
    const record = await this.getOrCreate(db);
    return record.current;
  }

  static async getMax(db: any): Promise<number> {
    const record = await this.getOrCreate(db);
    return record.maxEver;
  }
}

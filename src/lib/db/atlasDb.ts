type StoreName = 'fin' | 'conv' | 'strat' | 'plan' | 'prefs' | 'replay' | 'feedback' | 'actions' | 'learned' | 'outcomes' | 'accounts' | 'rules' | 'envelopes' | 'lessons' | 'docs';

export class AtlasDb {
  private name = 'AtlasDB_v7';
  private db: IDBDatabase | null = null;

  async open() {
    if (this.db) return;

    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(this.name, 7);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this.db = req.result;
        resolve();
      };
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        const storeConfigs: Record<StoreName, { keyPath: string; autoIncrement?: boolean }> = {
          fin: { keyPath: 'k' },
          conv: { keyPath: 'id', autoIncrement: true },
          strat: { keyPath: 'k' },
          plan: { keyPath: 'id', autoIncrement: true },
          prefs: { keyPath: 'k' },
          replay: { keyPath: 'id', autoIncrement: true },
          feedback: { keyPath: 'id', autoIncrement: true },
          actions: { keyPath: 'id', autoIncrement: true },
          learned: { keyPath: 'k' },
          outcomes: { keyPath: 'k' },
          accounts: { keyPath: 'id' },
          rules: { keyPath: 'id' },
          envelopes: { keyPath: 'k' },
          lessons: { keyPath: 'k' },
          docs: { keyPath: 'k' },
        };
        (Object.keys(storeConfigs) as StoreName[]).forEach((n) => {
          if (!db.objectStoreNames.contains(n)) {
            db.createObjectStore(n, storeConfigs[n]);
          }
        });
      };
    });
  }

  async set(store: StoreName, value: any) {
    await this.open();
    if (!this.db) throw new Error('db_not_open');

    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction([store], 'readwrite');
      const st = tx.objectStore(store);
      const req = st.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async get<T = any>(store: StoreName, key: any): Promise<T | undefined> {
    await this.open();
    if (!this.db) throw new Error('db_not_open');

    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = this.db!.transaction([store], 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  async all<T = any>(store: StoreName): Promise<T[]> {
    await this.open();
    if (!this.db) throw new Error('db_not_open');

    return await new Promise<T[]>((resolve, reject) => {
      const tx = this.db!.transaction([store], 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve((req.result || []) as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  async nuke() {
    await this.open();
    if (!this.db) throw new Error('db_not_open');

    const stores: StoreName[] = ['fin', 'conv', 'strat', 'plan', 'prefs', 'replay', 'feedback', 'actions', 'learned', 'outcomes', 'accounts', 'rules', 'envelopes', 'lessons', 'docs'];
    await Promise.all(
      stores.map(
        (s) =>
          new Promise<void>((resolve, reject) => {
            const tx = this.db!.transaction([s], 'readwrite');
            const req = tx.objectStore(s).clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          })
      )
    );
  }

  async del(store: StoreName, key: any) {
    await this.open();
    if (!this.db) throw new Error('db_not_open');

    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction([store], 'readwrite');
      const st = tx.objectStore(store);
      const req = st.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

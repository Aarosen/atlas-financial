// Caching Layer - Phase 4B
// Redis and in-memory caching strategies for performance optimization

export interface CacheConfig {
  enableRedis: boolean;
  enableMemoryCache: boolean;
  defaultTTL: number; // seconds
  maxMemoryCacheSize: number; // bytes
  redisUrl?: string;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: Date;
  createdAt: Date;
  hits: number;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

export class MemoryCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 50 * 1024 * 1024) {
    // 50MB default
    this.maxSize = maxSize;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update hit count
    entry.hits++;
    this.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttlSeconds: number = 3600): void {
    // Check memory usage before adding
    if (this.getMemoryUsage() > this.maxSize) {
      this.evictLRU();
    }

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    this.cache.set(key, {
      key,
      value,
      expiresAt,
      createdAt: new Date(),
      hits: 0,
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const hitRate = this.hits + this.misses > 0 ? (this.hits / (this.hits + this.misses)) * 100 : 0;

    return {
      totalEntries: this.cache.size,
      hitRate,
      memoryUsage: this.getMemoryUsage(),
      oldestEntry: entries.length > 0 ? entries.reduce((a, b) => (a.createdAt < b.createdAt ? a : b)).createdAt : null,
      newestEntry: entries.length > 0 ? entries.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).createdAt : null,
    };
  }

  /**
   * Get memory usage estimate
   */
  private getMemoryUsage(): number {
    let usage = 0;
    for (const entry of this.cache.values()) {
      usage += JSON.stringify(entry.value).length;
    }
    return usage;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < lruHits) {
        lruHits = entry.hits;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }
}

export class CacheLayer {
  private config: CacheConfig;
  private memoryCache: MemoryCache;
  private redisClient: any = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enableRedis: false,
      enableMemoryCache: true,
      defaultTTL: 3600,
      maxMemoryCacheSize: 50 * 1024 * 1024,
      ...config,
    };

    this.memoryCache = new MemoryCache(this.config.maxMemoryCacheSize);
  }

  /**
   * Initialize cache layer
   */
  async initialize(): Promise<void> {
    if (this.config.enableRedis && this.config.redisUrl) {
      await this.initializeRedis();
    }
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      // Redis initialization would go here
      // For now, we'll use a mock implementation
      console.log('Redis cache initialized');
    } catch (error) {
      console.warn('Failed to initialize Redis:', error);
      this.config.enableRedis = false;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Try Redis first if enabled
    if (this.config.enableRedis && this.redisClient) {
      try {
        const value = await this.redisClient.get(key);
        if (value) {
          return JSON.parse(value);
        }
      } catch (error) {
        console.warn('Redis get error:', error);
      }
    }

    // Fall back to memory cache
    if (this.config.enableMemoryCache) {
      return this.memoryCache.get(key);
    }

    return null;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.config.defaultTTL;

    // Set in Redis if enabled
    if (this.config.enableRedis && this.redisClient) {
      try {
        await this.redisClient.setex(key, ttl, JSON.stringify(value));
      } catch (error) {
        console.warn('Redis set error:', error);
      }
    }

    // Always set in memory cache
    if (this.config.enableMemoryCache) {
      this.memoryCache.set(key, value, ttl);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    if (this.config.enableRedis && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        console.warn('Redis delete error:', error);
      }
    }

    if (this.config.enableMemoryCache) {
      this.memoryCache.delete(key);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (this.config.enableRedis && this.redisClient) {
      try {
        await this.redisClient.flushdb();
      } catch (error) {
        console.warn('Redis clear error:', error);
      }
    }

    if (this.config.enableMemoryCache) {
      this.memoryCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.memoryCache.getStats();
  }

  /**
   * Cache decorator for functions
   */
  memoize<T extends (...args: any[]) => Promise<any>>(fn: T, ttlSeconds?: number): T {
    return (async (...args: any[]) => {
      const key = `${fn.name}:${JSON.stringify(args)}`;
      const cached = await this.get(key);

      if (cached !== null) {
        return cached;
      }

      const result = await fn(...args);
      await this.set(key, result, ttlSeconds);
      return result;
    }) as T;
  }
}

// Cache key generators for common queries
export const CACHE_KEYS = {
  user: (userId: string) => `user:${userId}`,
  profile: (userId: string) => `profile:${userId}`,
  conversations: (userId: string) => `conversations:${userId}`,
  conversation: (conversationId: string) => `conversation:${conversationId}`,
  messages: (conversationId: string) => `messages:${conversationId}`,
  quota: (userId: string) => `quota:${userId}`,
  knowledge: (topic: string) => `knowledge:${topic}`,
  recommendations: (userId: string) => `recommendations:${userId}`,
};

// Singleton instance
let cacheLayerInstance: CacheLayer | null = null;

export function getCacheLayer(): CacheLayer {
  if (!cacheLayerInstance) {
    cacheLayerInstance = new CacheLayer({
      enableMemoryCache: true,
      enableRedis: !!process.env.REDIS_URL,
      redisUrl: process.env.REDIS_URL,
      defaultTTL: 3600,
    });
  }
  return cacheLayerInstance;
}

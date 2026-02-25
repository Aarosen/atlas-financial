// Database Optimization Strategy - Phase 4A
// Indexing, query optimization, and connection pooling

export interface DatabaseOptimizationConfig {
  enableConnectionPooling: boolean;
  poolSize: number;
  queryTimeout: number;
  cacheQueryResults: boolean;
  enableIndexing: boolean;
  enableQueryOptimization: boolean;
}

export interface QueryPerformanceMetrics {
  queryId: string;
  executionTime: number;
  rowsAffected: number;
  cacheHit: boolean;
  timestamp: Date;
}

export interface IndexDefinition {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist';
}

// Recommended indexes for optimal performance
export const RECOMMENDED_INDEXES: IndexDefinition[] = [
  // Users table indexes
  {
    name: 'idx_users_email',
    table: 'users',
    columns: ['email'],
    unique: true,
    type: 'btree',
  },
  {
    name: 'idx_users_created_at',
    table: 'users',
    columns: ['created_at'],
    unique: false,
    type: 'btree',
  },

  // Profiles table indexes
  {
    name: 'idx_profiles_user_id',
    table: 'profiles',
    columns: ['user_id'],
    unique: true,
    type: 'btree',
  },
  {
    name: 'idx_profiles_updated_at',
    table: 'profiles',
    columns: ['updated_at'],
    unique: false,
    type: 'btree',
  },

  // Conversations table indexes
  {
    name: 'idx_conversations_user_id',
    table: 'conversations',
    columns: ['user_id'],
    unique: false,
    type: 'btree',
  },
  {
    name: 'idx_conversations_user_id_created_at',
    table: 'conversations',
    columns: ['user_id', 'created_at'],
    unique: false,
    type: 'btree',
  },
  {
    name: 'idx_conversations_last_message_at',
    table: 'conversations',
    columns: ['last_message_at'],
    unique: false,
    type: 'btree',
  },

  // Messages table indexes
  {
    name: 'idx_messages_conversation_id',
    table: 'messages',
    columns: ['conversation_id'],
    unique: false,
    type: 'btree',
  },
  {
    name: 'idx_messages_user_id',
    table: 'messages',
    columns: ['user_id'],
    unique: false,
    type: 'btree',
  },
  {
    name: 'idx_messages_created_at',
    table: 'messages',
    columns: ['created_at'],
    unique: false,
    type: 'btree',
  },
  {
    name: 'idx_messages_conversation_id_created_at',
    table: 'messages',
    columns: ['conversation_id', 'created_at'],
    unique: false,
    type: 'btree',
  },

  // Quotas table indexes
  {
    name: 'idx_quotas_user_id',
    table: 'quotas',
    columns: ['user_id'],
    unique: true,
    type: 'btree',
  },
  {
    name: 'idx_quotas_reset_date',
    table: 'quotas',
    columns: ['reset_date'],
    unique: false,
    type: 'btree',
  },
];

export class DatabaseOptimizer {
  private config: DatabaseOptimizationConfig;
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private connectionPool: any[] = [];

  constructor(config: Partial<DatabaseOptimizationConfig> = {}) {
    this.config = {
      enableConnectionPooling: true,
      poolSize: 10,
      queryTimeout: 30000,
      cacheQueryResults: true,
      enableIndexing: true,
      enableQueryOptimization: true,
      ...config,
    };
  }

  /**
   * Initialize database optimization
   */
  async initialize(): Promise<void> {
    if (this.config.enableIndexing) {
      await this.createIndexes();
    }

    if (this.config.enableConnectionPooling) {
      this.initializeConnectionPool();
    }
  }

  /**
   * Create recommended indexes
   */
  private async createIndexes(): Promise<void> {
    for (const index of RECOMMENDED_INDEXES) {
      try {
        await this.createIndex(index);
      } catch (error) {
        console.warn(`Failed to create index ${index.name}:`, error);
      }
    }
  }

  /**
   * Create a single index
   */
  private async createIndex(index: IndexDefinition): Promise<void> {
    const columnList = index.columns.join(', ');
    const uniqueKeyword = index.unique ? 'UNIQUE' : '';
    const typeKeyword = index.type !== 'btree' ? `USING ${index.type}` : '';

    const sql = `CREATE ${uniqueKeyword} INDEX IF NOT EXISTS ${index.name} ON ${index.table} (${columnList}) ${typeKeyword}`;

    // This would be executed against the actual database
    console.log(`Creating index: ${sql}`);
  }

  /**
   * Initialize connection pool
   */
  private initializeConnectionPool(): void {
    this.connectionPool = Array(this.config.poolSize).fill(null).map(() => ({
      id: Math.random().toString(36).substr(2, 9),
      inUse: false,
      createdAt: new Date(),
    }));
  }

  /**
   * Get connection from pool
   */
  getConnection(): any {
    const availableConnection = this.connectionPool.find((conn) => !conn.inUse);

    if (availableConnection) {
      availableConnection.inUse = true;
      return availableConnection;
    }

    // If no available connection, create a new one (up to pool size)
    if (this.connectionPool.length < this.config.poolSize) {
      const newConnection = {
        id: Math.random().toString(36).substr(2, 9),
        inUse: true,
        createdAt: new Date(),
      };
      this.connectionPool.push(newConnection);
      return newConnection;
    }

    throw new Error('Connection pool exhausted');
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(connection: any): void {
    const poolConnection = this.connectionPool.find((conn) => conn.id === connection.id);
    if (poolConnection) {
      poolConnection.inUse = false;
    }
  }

  /**
   * Record query performance metrics
   */
  recordQueryMetrics(queryId: string, executionTime: number, rowsAffected: number, cacheHit: boolean = false): void {
    this.queryMetrics.push({
      queryId,
      executionTime,
      rowsAffected,
      cacheHit,
      timestamp: new Date(),
    });

    // Keep only last 1000 metrics
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }
  }

  /**
   * Get query performance statistics
   */
  getQueryStats(): {
    averageExecutionTime: number;
    slowestQueries: QueryPerformanceMetrics[];
    cacheHitRate: number;
    totalQueries: number;
  } {
    if (this.queryMetrics.length === 0) {
      return {
        averageExecutionTime: 0,
        slowestQueries: [],
        cacheHitRate: 0,
        totalQueries: 0,
      };
    }

    const averageExecutionTime =
      this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) / this.queryMetrics.length;

    const slowestQueries = [...this.queryMetrics].sort((a, b) => b.executionTime - a.executionTime).slice(0, 10);

    const cacheHits = this.queryMetrics.filter((m) => m.cacheHit).length;
    const cacheHitRate = (cacheHits / this.queryMetrics.length) * 100;

    return {
      averageExecutionTime,
      slowestQueries,
      cacheHitRate,
      totalQueries: this.queryMetrics.length,
    };
  }

  /**
   * Get connection pool statistics
   */
  getConnectionPoolStats(): {
    totalConnections: number;
    activeConnections: number;
    availableConnections: number;
    poolUtilization: number;
  } {
    const totalConnections = this.connectionPool.length;
    const activeConnections = this.connectionPool.filter((conn) => conn.inUse).length;
    const availableConnections = totalConnections - activeConnections;
    const poolUtilization = (activeConnections / totalConnections) * 100;

    return {
      totalConnections,
      activeConnections,
      availableConnections,
      poolUtilization,
    };
  }

  /**
   * Generate optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getQueryStats();
    const poolStats = this.getConnectionPoolStats();

    // Query performance recommendations
    if (stats.averageExecutionTime > 100) {
      recommendations.push('Average query execution time is high (>100ms). Consider adding more indexes.');
    }

    if (stats.slowestQueries.length > 0 && stats.slowestQueries[0].executionTime > 1000) {
      recommendations.push('Some queries are very slow (>1s). Review query optimization and indexes.');
    }

    if (stats.cacheHitRate < 50) {
      recommendations.push('Cache hit rate is low (<50%). Consider increasing cache size or TTL.');
    }

    // Connection pool recommendations
    if (poolStats.poolUtilization > 80) {
      recommendations.push('Connection pool utilization is high (>80%). Consider increasing pool size.');
    }

    if (poolStats.availableConnections === 0) {
      recommendations.push('Connection pool is exhausted. Increase pool size immediately.');
    }

    return recommendations;
  }
}

// Singleton instance
let databaseOptimizerInstance: DatabaseOptimizer | null = null;

export function getDatabaseOptimizer(): DatabaseOptimizer {
  if (!databaseOptimizerInstance) {
    databaseOptimizerInstance = new DatabaseOptimizer();
  }
  return databaseOptimizerInstance;
}

// SQL optimization strategies
export const SQL_OPTIMIZATION_STRATEGIES = {
  // Use EXPLAIN to analyze queries
  explainQuery: (sql: string) => `EXPLAIN ANALYZE ${sql}`,

  // Use prepared statements to prevent SQL injection and improve performance
  preparedStatement: (sql: string) => `PREPARE stmt AS ${sql}`,

  // Use batch operations for multiple inserts
  batchInsert: (table: string, columns: string[], values: any[][]) => {
    const columnList = columns.join(', ');
    const valuesList = values.map((row) => `(${row.map((v) => `'${v}'`).join(', ')})`).join(', ');
    return `INSERT INTO ${table} (${columnList}) VALUES ${valuesList}`;
  },

  // Use pagination for large result sets
  pagination: (sql: string, limit: number, offset: number) => `${sql} LIMIT ${limit} OFFSET ${offset}`,

  // Use aggregation functions efficiently
  aggregation: (table: string, groupBy: string, aggregateFunc: string) =>
    `SELECT ${groupBy}, ${aggregateFunc} FROM ${table} GROUP BY ${groupBy}`,

  // Use indexes for WHERE clauses
  indexedWhere: (table: string, indexedColumn: string, value: string) =>
    `SELECT * FROM ${table} WHERE ${indexedColumn} = '${value}'`,
};

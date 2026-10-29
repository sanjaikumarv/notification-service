import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
export type PoolClient = pg.PoolClient;
export type QueryResult<T extends pg.QueryResultRow = any> = pg.QueryResult<T>;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: pg.Pool;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres@localhost:5432/notifications_db';

    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
      this.logger.error(
        'Unexpected error on idle PostgreSQL client',
        err.message,
      );
    });
  }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      client.release();
      this.logger.log('PostgreSQL connection pool established successfully.');
      await this.runMigrations();
    } catch (err: any) {
      this.logger.warn(
        `PostgreSQL initial connection check warning: ${err.message}. Ensure PostgreSQL is running.`,
      );
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('PostgreSQL connection pool closed.');
  }

  getPool(): pg.Pool {
    return this.pool;
  }

  async query<T extends pg.QueryResultRow = any>(
    text: string,
    params: any[] = [],
  ): Promise<QueryResult<T>> {
    try {
      return await this.pool.query<T>(text, params);
    } catch (error: any) {
      this.logger.error(
        `Database query error: ${this.sanitizeErrorMessage(error.message)}`,
      );
      throw error;
    }
  }

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error: any) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr: any) {
        this.logger.error(`Rollback error: ${rollbackErr.message}`);
      }
      this.logger.error(
        `Transaction failed: ${this.sanitizeErrorMessage(error.message)}`,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      let migrationsDir = path.join(__dirname, 'migrations');
      if (!fs.existsSync(migrationsDir)) {
        migrationsDir = path.join(
          process.cwd(),
          'src',
          'database',
          'migrations',
        );
      }
      if (!fs.existsSync(migrationsDir)) {
        migrationsDir = path.join(
          process.cwd(),
          'api',
          'src',
          'database',
          'migrations',
        );
      }

      if (!fs.existsSync(migrationsDir)) {
        this.logger.warn(`Migrations directory not found at ${migrationsDir}`);
        return;
      }

      const files = fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const { rowCount } = await client.query(
          'SELECT id FROM migrations WHERE name = $1',
          [file],
        );

        if (rowCount === 0) {
          this.logger.log(`Applying migration: ${file}`);
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('INSERT INTO migrations (name) VALUES ($1)', [
            file,
          ]);
          await client.query('COMMIT');
          this.logger.log(`Migration applied successfully: ${file}`);
        }
      }
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      this.logger.error(
        `Migration error: ${this.sanitizeErrorMessage(err.message)}`,
      );
      throw err;
    } finally {
      client.release();
    }
  }

  private sanitizeErrorMessage(message: string): string {
    // Redact password or connection URL parts from error messages
    return message.replace(/password=[^\s;]+/gi, 'password=***');
  }
}

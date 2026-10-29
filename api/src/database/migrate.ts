import 'dotenv/config';
import { DatabaseService } from './database.service.js';

async function run() {
  const db = new DatabaseService();
  console.log('Running database migrations...');
  try {
    await db.runMigrations();
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await db.onModuleDestroy();
  }
}

run();


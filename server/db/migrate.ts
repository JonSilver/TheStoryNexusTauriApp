import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './client';
import path from 'node:path';

export const runMigrations = () => {
    try {
        console.log('Running database migrations...');
        migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') });
        console.log('Database migrations completed successfully');
    } catch (error) {
        console.error('Error running migrations:', error);
        throw error;
    }
};

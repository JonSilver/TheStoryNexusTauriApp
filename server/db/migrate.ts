import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./client.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const runMigrations = () => {
    try {
        console.log("Running database migrations...");
        migrate(db, { migrationsFolder: join(__dirname, "migrations") });
        console.log("Database migrations completed successfully");
    } catch (error) {
        console.error("Error running migrations:", error);
        throw error;
    }
};

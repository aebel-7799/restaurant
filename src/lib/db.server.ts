import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_lre6fA0RZmpt@ep-cold-frog-aoqsphum.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

// Initialize the SQL client directly.
export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: "require",
});

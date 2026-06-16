import postgres from "postgres";

function createDatabaseClient() {
  const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_lre6fA0RZmpt@ep-cold-frog-aoqsphum.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
  
  return postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: "require",
  });
}

let _sql: ReturnType<typeof createDatabaseClient> | undefined;

// Export the sql query helper. This is only executable on the server.
export const sql = new Proxy({} as ReturnType<typeof createDatabaseClient>, {
  get(_, prop, receiver) {
    if (!_sql) _sql = createDatabaseClient();
    return Reflect.get(_sql, prop, receiver);
  },
});

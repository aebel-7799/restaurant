import postgres from "postgres";

async function test() {
  try {
    console.log("Testing postgres connection with ssl: 'require'...");
    const connectionString = "postgresql://neondb_owner:npg_lre6fA0RZmpt@ep-cold-frog-aoqsphum.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
    
    const sql = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: "require" as any, // simulating db.server.ts config
    });
    
    const result = await sql`SELECT 1`;
    console.log("Connection successful! Result:", result);
    await sql.end();
  } catch (err) {
    console.error("Connection failed! Error:", err);
  }
}

test();

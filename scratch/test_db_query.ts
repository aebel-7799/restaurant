import postgres from "postgres";

const connectionString = "postgresql://neondb_owner:npg_lre6fA0RZmpt@ep-cold-frog-aoqsphum.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = postgres(connectionString);

async function run() {
  try {
    const result = await sql`SELECT id, name, is_recommended, category_id FROM food_items WHERE is_recommended = true`;
    console.log("Recommended Food Items:", result);
  } catch (err) {
    console.error("Error running query:", err);
  } finally {
    await sql.end();
  }
}

run();

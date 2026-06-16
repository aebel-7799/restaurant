import postgres from "postgres";

const connectionString = "postgresql://neondb_owner:npg_lre6fA0RZmpt@ep-cold-frog-aoqsphum.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = postgres(connectionString);

async function run() {
  try {
    const result = await sql`SELECT category_id, COUNT(*) FROM food_items GROUP BY category_id`;
    console.log("Category IDs in food_items:", result);
    const categories = await sql`SELECT id, name FROM categories`;
    console.log("Categories in categories table:", categories);
  } catch (err) {
    console.error("Error running query:", err);
  } finally {
    await sql.end();
  }
}

run();

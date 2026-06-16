import postgres from "postgres";

const connectionString = "postgresql://neondb_owner:npg_lre6fA0RZmpt@ep-cold-frog-aoqsphum.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = postgres(connectionString);

async function check() {
  try {
    const foodItemsCount = await sql`SELECT COUNT(*)::int as count FROM food_items`;
    const categoriesCount = await sql`SELECT COUNT(*)::int as count FROM categories`;
    const foodSample = await sql`SELECT id, name, price, available FROM food_items LIMIT 5`;

    console.log("Database diagnostic check:");
    console.log("Categories Count:", categoriesCount[0]?.count);
    console.log("Food Items Count:", foodItemsCount[0]?.count);
    console.log("Sample Food Items:", foodSample);
  } catch (err) {
    console.error("Diagnostic error:", err);
  } finally {
    await sql.end();
  }
}

check();

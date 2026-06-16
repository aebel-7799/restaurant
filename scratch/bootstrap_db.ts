import postgres from "postgres";
import { MOCK_CATEGORIES, MOCK_FOOD_ITEMS } from "../src/lib/mock-food";

const connectionString = "postgresql://neondb_owner:npg_lre6fA0RZmpt@ep-cold-frog-aoqsphum.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = postgres(connectionString);

async function main() {
  console.log("Connecting to Neon PostgreSQL...");

  // Drop tables if they exist to start fresh
  console.log("Resetting database tables...");
  await sql`DROP TABLE IF EXISTS delivery_assignments CASCADE`;
  await sql`DROP TABLE IF EXISTS delivery_partners CASCADE`;
  await sql`DROP TABLE IF EXISTS favorites CASCADE`;
  await sql`DROP TABLE IF EXISTS profiles CASCADE`;
  await sql`DROP TABLE IF EXISTS order_items CASCADE`;
  await sql`DROP TABLE IF EXISTS orders CASCADE`;
  await sql`DROP TABLE IF EXISTS coupons CASCADE`;
  await sql`DROP TABLE IF EXISTS food_items CASCADE`;
  await sql`DROP TABLE IF EXISTS categories CASCADE`;

  // Create tables
  console.log("Creating tables...");

  await sql`
    CREATE TABLE categories (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      active BOOLEAN NOT NULL DEFAULT true,
      image VARCHAR(512),
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE food_items (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      description TEXT,
      image VARCHAR(512),
      available BOOLEAN NOT NULL DEFAULT true,
      is_recommended BOOLEAN NOT NULL DEFAULT false,
      is_popular BOOLEAN NOT NULL DEFAULT false,
      rating DECIMAL(3, 2) NOT NULL DEFAULT 5.0,
      rating_count INT NOT NULL DEFAULT 0,
      preparation_time INT NOT NULL DEFAULT 20,
      category_id VARCHAR(255) REFERENCES categories(id) ON DELETE SET NULL,
      restaurant_name VARCHAR(255) DEFAULT 'GrillGo',
      calories INT,
      protein_g INT,
      carbs_g INT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE coupons (
      id VARCHAR(255) PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      type VARCHAR(20) NOT NULL DEFAULT 'flat',
      value DECIMAL(10, 2) NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      min_order_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
      max_discount DECIMAL(10, 2),
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE orders (
      id VARCHAR(255) PRIMARY KEY,
      order_number VARCHAR(50) NOT NULL UNIQUE,
      user_id VARCHAR(255),
      guest_name VARCHAR(255),
      guest_phone VARCHAR(50),
      address TEXT NOT NULL,
      latitude DECIMAL(9, 6),
      longitude DECIMAL(9, 6),
      notes TEXT,
      subtotal DECIMAL(10, 2) NOT NULL,
      delivery_charge DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
      taxes DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
      discount DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
      coupon_code VARCHAR(50),
      total DECIMAL(10, 2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL,
      payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
      order_status VARCHAR(50) NOT NULL DEFAULT 'received',
      estimated_delivery_minutes INT NOT NULL DEFAULT 30,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE order_items (
      id VARCHAR(255) PRIMARY KEY,
      order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE,
      food_id VARCHAR(255),
      name VARCHAR(255) NOT NULL,
      image VARCHAR(512),
      quantity INT NOT NULL DEFAULT 1,
      price DECIMAL(10, 2) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE profiles (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      avatar_url VARCHAR(512),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE favorites (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      food_id VARCHAR(255) REFERENCES food_items(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, food_id)
    )
  `;

  await sql`
    CREATE TABLE delivery_partners (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      status VARCHAR(50) NOT NULL DEFAULT 'online',
      avatar_url VARCHAR(512),
      rating DECIMAL(3, 2) NOT NULL DEFAULT 5.0,
      deliveries_count INT NOT NULL DEFAULT 0,
      user_id VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE delivery_assignments (
      id VARCHAR(255) PRIMARY KEY,
      order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
      rider_id VARCHAR(255) REFERENCES delivery_partners(id) ON DELETE CASCADE,
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  console.log("Seeding categories...");
  for (const cat of MOCK_CATEGORIES) {
    // Determine static image mapping for categories if any
    const images: Record<string, string> = {
      mandi: "/images/yemeni_chicken_mandi.png",
      alfaham: "/images/kanthari_al_faham.png",
      shawarma: "/images/chicken_shawarma_roll.png",
      burger: "/images/classic_beef_burger.png",
      drinks: "/images/seven_up_soda.png",
      juices: "/images/watermelon_juice.png",
      shakes: "/images/mango_milkshake.png",
      hot: "/images/sulaimani_tea.png",
      lime: "/images/mint_lime_drink.png",
      mojitos: "/images/blue_curacao_mojito.png",
    };
    await sql`
      INSERT INTO categories (id, name, active, image, sort_order)
      VALUES (${cat.id}, ${cat.name}, true, ${images[cat.id] ?? null}, 0)
      ON CONFLICT (id) DO NOTHING
    `;
  }

  console.log(`Seeding ${MOCK_FOOD_ITEMS.length} food items...`);
  for (const item of MOCK_FOOD_ITEMS) {
    await sql`
      INSERT INTO food_items (
        id, name, price, description, image, available,
        is_recommended, is_popular, rating, rating_count,
        preparation_time, category_id, restaurant_name,
        calories, protein_g, carbs_g
      ) VALUES (
        ${item.id}, ${item.name}, ${item.price}, ${item.description}, ${item.image}, ${item.available},
        ${item.is_recommended}, ${item.is_popular}, ${item.rating}, ${item.rating_count},
        ${item.preparation_time}, ${item.category_id}, ${item.restaurant_name},
        ${item.calories ?? null}, ${item.protein_g ?? null}, ${item.carbs_g ?? null}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  console.log("Seeding coupons...");
  const coupons = [
    { id: "coupon-1", code: "WELCOME50", type: "percent", value: 50, min_order_amount: 100, max_discount: 100, description: "50% off on your first order" },
    { id: "coupon-2", code: "GRILL100", type: "flat", value: 100, min_order_amount: 500, max_discount: null, description: "Flat ₹100 off on orders above ₹500" },
  ];
  for (const c of coupons) {
    await sql`
      INSERT INTO coupons (id, code, type, value, min_order_amount, max_discount, description)
      VALUES (${c.id}, ${c.code}, ${c.type}, ${c.value}, ${c.min_order_amount}, ${c.max_discount}, ${c.description})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  console.log("Seeding delivery partners (riders)...");
  const riders = [
    { id: "rider-1", name: "Vikram Kumar", phone: "9876543210", status: "online" },
    { id: "rider-2", name: "Rahul Sharma", phone: "9876543211", status: "online" },
    { id: "rider-3", name: "Suresh Pillai", phone: "9876543212", status: "online" },
  ];
  for (const r of riders) {
    await sql`
      INSERT INTO delivery_partners (id, name, phone, status)
      VALUES (${r.id}, ${r.name}, ${r.phone}, ${r.status})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  console.log("Database initialized successfully!");
  await sql.end();
}

main().catch((err) => {
  console.error("Initialization failed:", err);
  process.exit(1);
});

import { createServerFn } from "@tanstack/react-start";
import { sql } from "./db.server";

// Helper function to handle wrapping of input object from client proxy
function unwrapInput<T>(input: T | { data: T }): T {
  if (input && typeof input === "object" && "data" in input) {
    return (input as any).data;
  }
  return input as T;
}

// 1. Fetch menu items, optionally filtered by category_id
export const getFoodItems = createServerFn({ method: "GET" })
  .validator((input: any) => input)
  .handler(async ({ data }) => {
    try {
      const categoryId = unwrapInput(data);
      if (categoryId && categoryId !== "all") {
        return await sql`
          SELECT * FROM food_items 
          WHERE category_id = ${categoryId}
          ORDER BY name ASC
        `;
      }
      return await sql`
        SELECT * FROM food_items 
        ORDER BY name ASC
      `;
    } catch (err: any) {
      console.error("Error in getFoodItems server function:", err);
      return { error: err.message || String(err) };
    }
  });

// 2. Fetch details for a single food item
export const getFoodItem = createServerFn({ method: "POST" })
  .validator((input: any) => input)
  .handler(async ({ data }) => {
    console.log("[SERVER getFoodItem] Raw input data:", data);
    const id = unwrapInput(data);
    console.log("[SERVER getFoodItem] Unwrapped ID:", id);
    const results = await sql`
      SELECT * FROM food_items 
      WHERE id = ${id}
    `;
    console.log("[SERVER getFoodItem] Query results length:", results.length, "Found:", !!results[0]);
    return results[0] || null;
  });

// 3. Fetch orders for a user (or specific guest order IDs)
export const getUserOrders = createServerFn({ method: "POST" })
  .validator((input: any) => input)
  .handler(async ({ data }) => {
    const unwrapped = unwrapInput(data);
    let orders = [];
    
    if (Array.isArray(unwrapped)) {
      // Fetch specific guest order IDs
      if (unwrapped.length > 0) {
        orders = await sql`
          SELECT * FROM orders 
          WHERE id = ANY(${unwrapped})
          ORDER BY created_at DESC
        `;
      }
    } else if (typeof unwrapped === "string" && unwrapped.trim()) {
      // Fetch by registered user ID
      orders = await sql`
        SELECT * FROM orders 
        WHERE user_id = ${unwrapped}
        ORDER BY created_at DESC
        LIMIT 30
      `;
    }
    
    // Fetch order items for each order
    for (const o of orders) {
      o.order_items = await sql`
        SELECT * FROM order_items 
        WHERE order_id = ${o.id}
      `;
    }
    return orders;
  });

// 4. Fetch details for a single order (tracking view)
export const getOrderDetails = createServerFn({ method: "POST" })
  .validator((input: any) => input)
  .handler(async ({ data }) => {
    const orderId = unwrapInput(data);
    const orders = await sql`
      SELECT * FROM orders 
      WHERE id = ${orderId}
    `;
    const order = orders[0] || null;
    if (!order) return null;

    order.order_items = await sql`
      SELECT * FROM order_items 
      WHERE order_id = ${orderId}
    `;

    // Fetch delivery assignments
    const assignments = await sql`
      SELECT da.*, dp.name as rider_name, dp.phone as rider_phone, dp.rating as rider_rating, dp.deliveries_count as rider_deliveries_count
      FROM delivery_assignments da
      JOIN delivery_partners dp ON da.rider_id = dp.id
      WHERE da.order_id = ${orderId}
    `;
    
    if (assignments[0]) {
      order.delivery_assignments = {
        rider_id: assignments[0].rider_id,
        delivery_partners: {
          name: assignments[0].rider_name,
          phone: assignments[0].rider_phone,
          rating: Number(assignments[0].rider_rating),
          deliveries_count: assignments[0].rider_deliveries_count,
        }
      };
    } else {
      order.delivery_assignments = null;
    }

    return order;
  });

// 5. Update order status
export const updateOrderStatusServer = createServerFn({ method: "POST" })
  .validator((input: any) => input)
  .handler(async ({ data }) => {
    const payload = unwrapInput(data);
    await sql`
      UPDATE orders 
      SET order_status = ${payload.status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${payload.orderId}
    `;
    return { success: true };
  });

// 6. Assign rider to order
export const assignRiderServer = createServerFn({ method: "POST" })
  .validator((input: any) => input)
  .handler(async ({ data }) => {
    const payload = unwrapInput(data);
    // Check if assignment exists
    const existing = await sql`
      SELECT id FROM delivery_assignments 
      WHERE order_id = ${payload.orderId}
    `;

    if (existing[0]) {
      await sql`
        UPDATE delivery_assignments 
        SET rider_id = ${payload.riderId}
        WHERE order_id = ${payload.orderId}
      `;
    } else {
      await sql`
        INSERT INTO delivery_assignments (order_id, rider_id)
        VALUES (${payload.orderId}, ${payload.riderId})
      `;
    }

    // Also update order status to 'assigned'
    await sql`
      UPDATE orders 
      SET order_status = 'assigned', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${payload.orderId}
    `;

    return { success: true };
  });

// 7. Toggle food item availability
export const toggleFoodAvailableServer = createServerFn({ method: "POST" })
  .validator((input: any) => input)
  .handler(async ({ data }) => {
    const payload = unwrapInput(data);
    await sql`
      UPDATE food_items 
      SET available = ${payload.available}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${payload.itemId}
    `;
    return { success: true };
  });

// 8. Toggle food recommendation status
export const toggleFoodRecommendServer = createServerFn({ method: "POST" })
  .validator((input: any) => input)
  .handler(async ({ data }) => {
    const payload = unwrapInput(data);
    await sql`
      UPDATE food_items 
      SET is_recommended = ${payload.recommend}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${payload.itemId}
    `;
    return { success: true };
  });

// 9. Save food price
export const saveFoodPriceServer = createServerFn({ method: "POST" })
  .validator((input: any) => input)
  .handler(async ({ data }) => {
    const payload = unwrapInput(data);
    await sql`
      UPDATE food_items 
      SET price = ${payload.price}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${payload.itemId}
    `;
    return { success: true };
  });

// 10. Register new rider
export const createRiderServer = createServerFn({ method: "POST" })
  .validator((input: any) => input)
  .handler(async ({ data }) => {
    const payload = unwrapInput(data);
    const id = `rider-${Math.floor(Math.random() * 90000 + 10000)}`;
    await sql`
      INSERT INTO delivery_partners (id, name, phone, status)
      VALUES (${id}, ${payload.name}, ${payload.phone ?? null}, 'online')
    `;
    return { success: true };
  });

// 11. Claim rider job
export const claimRiderJobServer = createServerFn({ method: "POST" })
  .validator((input: any) => input)
  .handler(async ({ data }) => {
    const payload = unwrapInput(data);
    const existing = await sql`
      SELECT id FROM delivery_assignments 
      WHERE order_id = ${payload.orderId}
    `;

    if (existing[0]) {
      await sql`
        UPDATE delivery_assignments 
        SET rider_id = ${payload.riderId}
        WHERE order_id = ${payload.orderId}
      `;
    } else {
      await sql`
        INSERT INTO delivery_assignments (order_id, rider_id)
        VALUES (${payload.orderId}, ${payload.riderId})
      `;
    }

    await sql`
      UPDATE orders 
      SET order_status = 'assigned', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${payload.orderId}
    `;

    return { success: true };
  });

// 12. Toggle favorite item
export const toggleFavoriteServer = createServerFn({ method: "POST" })
  .validator((input: any) => input)
  .handler(async ({ data }) => {
    const payload = unwrapInput(data);
    const existing = await sql`
      SELECT id FROM favorites 
      WHERE user_id = ${payload.userId} AND food_id = ${payload.foodId}
    `;

    if (existing[0]) {
      await sql`
        DELETE FROM favorites 
        WHERE user_id = ${payload.userId} AND food_id = ${payload.foodId}
      `;
      return { favorited: false };
    } else {
      const favId = `fav-${Math.floor(Math.random() * 90000 + 10000)}`;
      await sql`
        INSERT INTO favorites (id, user_id, food_id)
        VALUES (${favId}, ${payload.userId}, ${payload.foodId})
      `;
      return { favorited: true };
    }
  });

// 13. Fetch favorites list
export const getFavoritesServer = createServerFn({ method: "POST" })
  .validator((input: any) => input)
  .handler(async ({ data }) => {
    const userId = unwrapInput(data);
    const favs = await sql`
      SELECT f.food_id, fi.id, fi.name, fi.image, fi.price
      FROM favorites f
      JOIN food_items fi ON f.food_id = fi.id
      WHERE f.user_id = ${userId}
    `;
    
    return favs.map((f) => ({
      food_id: f.food_id,
      food_items: {
        id: f.id,
        name: f.name,
        image: f.image,
        price: Number(f.price),
      }
    }));
  });

// 14. Fetch all orders (Admin / General view)
export const getAdminOrders = createServerFn({ method: "GET" })
  .handler(async () => {
    const orders = await sql`
      SELECT * FROM orders 
      ORDER BY created_at DESC
    `;
    
    for (const o of orders) {
      o.order_items = await sql`
        SELECT * FROM order_items 
        WHERE order_id = ${o.id}
      `;
      
      const assignments = await sql`
        SELECT da.*, dp.name as rider_name
        FROM delivery_assignments da
        JOIN delivery_partners dp ON da.rider_id = dp.id
        WHERE da.order_id = ${o.id}
      `;
      if (assignments[0]) {
        o.delivery_assignments = {
          rider_id: assignments[0].rider_id,
          delivery_partners: {
            name: assignments[0].rider_name
          }
        };
      } else {
        o.delivery_assignments = null;
      }
    }
    return orders;
  });

// 15. Fetch all registered riders
export const getAdminRiders = createServerFn({ method: "GET" })
  .handler(async () => {
    return await sql`
      SELECT * FROM delivery_partners 
      ORDER BY name ASC
    `;
  });

// 16. Fetch kitchen tickets (received, preparing, packed)
export const getKitchenOrders = createServerFn({ method: "GET" })
  .handler(async () => {
    const orders = await sql`
      SELECT * FROM orders 
      WHERE order_status IN ('received', 'preparing', 'packed')
      ORDER BY created_at ASC
    `;
    
    for (const o of orders) {
      o.order_items = await sql`
        SELECT * FROM order_items 
        WHERE order_id = ${o.id}
      `;
    }
    return orders;
  });

// 17. Fetch/validate a coupon by code
export const validateCouponServer = createServerFn({ method: "POST" })
  .validator((input: any) => input)
  .handler(async ({ data }) => {
    const payload = unwrapInput(data);
    const results = await sql`
      SELECT * FROM coupons 
      WHERE code = ${payload.code.trim().toUpperCase()} AND active = true
    `;
    return results[0] || null;
  });

// 18. Update order live coordinates
export const updateOrderLocationServer = createServerFn({ method: "POST" })
  .validator((input: any) => input)
  .handler(async ({ data }) => {
    const payload = unwrapInput(data);
    await sql`
      UPDATE orders 
      SET latitude = ${payload.latitude}, longitude = ${payload.longitude}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${payload.orderId}
    `;
    return { success: true };
  });

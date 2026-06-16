import { createServerFn } from "@tanstack/react-start";
import { sql } from "./db.server";

// 1. Fetch menu items, optionally filtered by category_id
export const getFoodItems = createServerFn({ method: "GET" })
  .validator((categoryId?: string) => categoryId)
  .handler(async ({ input: categoryId }) => {
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
  });

// 2. Fetch details for a single food item
export const getFoodItem = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ input: id }) => {
    const results = await sql`
      SELECT * FROM food_items 
      WHERE id = ${id}
    `;
    return results[0] || null;
  });

// 3. Fetch orders for a user
export const getUserOrders = createServerFn({ method: "GET" })
  .validator((userId: string) => userId)
  .handler(async ({ input: userId }) => {
    const orders = await sql`
      SELECT * FROM orders 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 30
    `;
    
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
export const getOrderDetails = createServerFn({ method: "GET" })
  .validator((orderId: string) => orderId)
  .handler(async ({ input: orderId }) => {
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
  .validator((input: { orderId: string; status: string }) => input)
  .handler(async ({ input }) => {
    await sql`
      UPDATE orders 
      SET order_status = ${input.status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${input.orderId}
    `;
    return { success: true };
  });

// 6. Assign rider to order
export const assignRiderServer = createServerFn({ method: "POST" })
  .validator((input: { orderId: string; riderId: string }) => input)
  .handler(async ({ input }) => {
    // Check if assignment exists
    const existing = await sql`
      SELECT id FROM delivery_assignments 
      WHERE order_id = ${input.orderId}
    `;

    if (existing[0]) {
      await sql`
        UPDATE delivery_assignments 
        SET rider_id = ${input.riderId}
        WHERE order_id = ${input.orderId}
      `;
    } else {
      await sql`
        INSERT INTO delivery_assignments (order_id, rider_id)
        VALUES (${input.orderId}, ${input.riderId})
      `;
    }

    // Also update order status to 'assigned'
    await sql`
      UPDATE orders 
      SET order_status = 'assigned', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${input.orderId}
    `;

    return { success: true };
  });

// 7. Toggle food item availability
export const toggleFoodAvailableServer = createServerFn({ method: "POST" })
  .validator((input: { itemId: string; available: boolean }) => input)
  .handler(async ({ input }) => {
    await sql`
      UPDATE food_items 
      SET available = ${input.available}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${input.itemId}
    `;
    return { success: true };
  });

// 8. Toggle food recommendation status
export const toggleFoodRecommendServer = createServerFn({ method: "POST" })
  .validator((input: { itemId: string; recommend: boolean }) => input)
  .handler(async ({ input }) => {
    await sql`
      UPDATE food_items 
      SET is_recommended = ${input.recommend}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${input.itemId}
    `;
    return { success: true };
  });

// 9. Save food price
export const saveFoodPriceServer = createServerFn({ method: "POST" })
  .validator((input: { itemId: string; price: number }) => input)
  .handler(async ({ input }) => {
    await sql`
      UPDATE food_items 
      SET price = ${input.price}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${input.itemId}
    `;
    return { success: true };
  });

// 10. Register new rider
export const createRiderServer = createServerFn({ method: "POST" })
  .validator((input: { name: string; phone?: string }) => input)
  .handler(async ({ input }) => {
    const id = `rider-${Math.floor(Math.random() * 90000 + 10000)}`;
    await sql`
      INSERT INTO delivery_partners (id, name, phone, status)
      VALUES (${id}, ${input.name}, ${input.phone ?? null}, 'online')
    `;
    return { success: true };
  });

// 11. Claim rider job
export const claimRiderJobServer = createServerFn({ method: "POST" })
  .validator((input: { orderId: string; riderId: string }) => input)
  .handler(async ({ input }) => {
    const existing = await sql`
      SELECT id FROM delivery_assignments 
      WHERE order_id = ${input.orderId}
    `;

    if (existing[0]) {
      await sql`
        UPDATE delivery_assignments 
        SET rider_id = ${input.riderId}
        WHERE order_id = ${input.orderId}
      `;
    } else {
      await sql`
        INSERT INTO delivery_assignments (order_id, rider_id)
        VALUES (${input.orderId}, ${input.riderId})
      `;
    }

    await sql`
      UPDATE orders 
      SET order_status = 'assigned', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${input.orderId}
    `;

    return { success: true };
  });

// 12. Toggle favorite item
export const toggleFavoriteServer = createServerFn({ method: "POST" })
  .validator((input: { userId: string; foodId: string }) => input)
  .handler(async ({ input }) => {
    const existing = await sql`
      SELECT id FROM favorites 
      WHERE user_id = ${input.userId} AND food_id = ${input.foodId}
    `;

    if (existing[0]) {
      await sql`
        DELETE FROM favorites 
        WHERE user_id = ${input.userId} AND food_id = ${input.foodId}
      `;
      return { favorited: false };
    } else {
      const favId = `fav-${Math.floor(Math.random() * 90000 + 10000)}`;
      await sql`
        INSERT INTO favorites (id, user_id, food_id)
        VALUES (${favId}, ${input.userId}, ${input.foodId})
      `;
      return { favorited: true };
    }
  });

// 13. Fetch favorites list
export const getFavoritesServer = createServerFn({ method: "GET" })
  .validator((userId: string) => userId)
  .handler(async ({ input: userId }) => {
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
  .validator((input: { code: string }) => input)
  .handler(async ({ input }) => {
    const results = await sql`
      SELECT * FROM coupons 
      WHERE code = ${input.code.trim().toUpperCase()} AND active = true
    `;
    return results[0] || null;
  });

// 18. Update order live coordinates
export const updateOrderLocationServer = createServerFn({ method: "POST" })
  .validator((input: { orderId: string; latitude: number; longitude: number }) => input)
  .handler(async ({ input }) => {
    await sql`
      UPDATE orders 
      SET latitude = ${input.latitude}, longitude = ${input.longitude}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${input.orderId}
    `;
    return { success: true };
  });

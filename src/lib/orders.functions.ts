import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "./db.server";

const PlaceOrderInput = z.object({
  user_id: z.string().nullable().optional(),
  guest_name: z.string().min(1).optional().nullable(),
  guest_phone: z.string().min(7).optional().nullable(),
  address: z.string().min(3),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  notes: z.string().optional().nullable(),
  payment_method: z.enum(["upi", "card", "cod", "netbanking", "wallet", "upi", "card", "cod"]), // broad support
  coupon_code: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        food_id: z.string(),
        quantity: z.number().int().min(1).max(50),
        price: z.number().optional().nullable(),
        name: z.string().optional().nullable(),
        image: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      }),
    )
    .min(1),
});

export const placeOrder = createServerFn({ method: "POST" })
  .validator((data: unknown) => PlaceOrderInput.parse(data))
  .handler(async ({ data }) => {
    // Load food items - extract the base food IDs (e.g., 'burger-b1' from 'burger-b1-mayo')
    const baseIds = data.items.map((i) => i.food_id.split("-").slice(0, 2).join("-"));
    const foods = await sql`
      SELECT id, name, image, price, preparation_time 
      FROM food_items 
      WHERE id = ANY(${baseIds})
    `;

    if (!foods || foods.length === 0) throw new Error("No items found");

    const foodById = new Map(foods.map((f) => [f.id, f]));

    let subtotal = 0;
    const lineItems = data.items.map((i) => {
      const baseId = i.food_id.split("-").slice(0, 2).join("-");
      const f = foodById.get(baseId);
      
      // Use client-provided price (which includes custom add-on pricing) or fallback to DB price
      const price = i.price ?? (f ? Number(f.price) : 0);
      const name = i.name ?? (f ? f.name : "Unknown Item");
      const image = i.image ?? (f ? f.image : null);

      subtotal += price * i.quantity;
      return {
        food_id: i.food_id, // Save the full customized food_id (e.g. burger-b1-mayo)
        name: name,
        image: image,
        quantity: i.quantity,
        price: price,
        notes: i.notes ?? null,
      };
    });

    // Coupon
    let discount = 0;
    let appliedCode: string | null = null;
    if (data.coupon_code) {
      const coupons = await sql`
        SELECT * FROM coupons 
        WHERE code = ${data.coupon_code.toUpperCase()} AND active = true
      `;
      const coupon = coupons[0];
      if (coupon && Number(coupon.min_order_amount) <= subtotal) {
        if (coupon.type === "flat") discount = Number(coupon.value);
        else discount = Math.min((subtotal * Number(coupon.value)) / 100, Number(coupon.max_discount ?? 9999));
        appliedCode = coupon.code;
      }
    }

    const delivery_charge = 20; 
    const taxes = Math.round(subtotal * 0.05);
    const total = Math.max(0, subtotal + delivery_charge + taxes - discount);

    const prepMax = Math.max(
      ...lineItems.map((l) => {
        const baseId = l.food_id.split("-").slice(0, 2).join("-");
        return foodById.get(baseId)?.preparation_time ?? 20;
      })
    );
    const eta = prepMax + 15;

    // Order number
    const order_number = `CP${Math.floor(Math.random() * 90000 + 10000)}`;
    const order_id = `order-${Math.floor(Math.random() * 90000 + 10000)}`;

    const orders = await sql`
      INSERT INTO orders (
        id, order_number, user_id, guest_name, guest_phone, address,
        latitude, longitude, notes, subtotal, delivery_charge, taxes,
        discount, coupon_code, total, payment_method, payment_status,
        order_status, estimated_delivery_minutes
      ) VALUES (
        ${order_id}, ${order_number}, ${data.user_id ?? null}, ${data.guest_name ?? null}, ${data.guest_phone ?? null}, ${data.address},
        ${data.latitude ?? null}, ${data.longitude ?? null}, ${data.notes ?? null}, ${subtotal}, ${delivery_charge}, ${taxes},
        ${discount}, ${appliedCode}, ${total}, ${data.payment_method}, 'pending',
        'received', ${eta}
      )
      RETURNING id, order_number
    `;
    const order = orders[0];
    if (!order) throw new Error("Could not create order");

    // Insert line items
    for (const l of lineItems) {
      const item_id = `item-${Math.floor(Math.random() * 90000 + 10000)}`;
      await sql`
        INSERT INTO order_items (id, order_id, food_id, name, image, quantity, price, notes)
        VALUES (${item_id}, ${order.id}, ${l.food_id}, ${l.name}, ${l.image}, ${l.quantity}, ${l.price}, ${l.notes})
      `;
    }

    return { id: order.id, order_number: order.order_number };
  });

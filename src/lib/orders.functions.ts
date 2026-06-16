import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PlaceOrderInput = z.object({
  user_id: z.string().uuid().nullable(),
  guest_name: z.string().min(1).optional().nullable(),
  guest_phone: z.string().min(7).optional().nullable(),
  address: z.string().min(3),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  notes: z.string().optional().nullable(),
  payment_method: z.enum(["upi", "card", "cod", "netbanking", "wallet"]),
  coupon_code: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        food_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
        notes: z.string().optional().nullable(),
      }),
    )
    .min(1),
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PlaceOrderInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load food items
    const ids = data.items.map((i) => i.food_id);
    const { data: foods, error: foodsErr } = await supabaseAdmin
      .from("food_items")
      .select("id,name,image,price,preparation_time")
      .in("id", ids);
    if (foodsErr) throw new Error(foodsErr.message);
    if (!foods || foods.length === 0) throw new Error("No items found");

    const foodById = new Map(foods.map((f) => [f.id, f]));

    let subtotal = 0;
    const lineItems = data.items.map((i) => {
      const f = foodById.get(i.food_id);
      if (!f) throw new Error(`Item ${i.food_id} unavailable`);
      subtotal += Number(f.price) * i.quantity;
      return {
        food_id: f.id,
        name: f.name,
        image: f.image,
        quantity: i.quantity,
        price: Number(f.price),
        notes: i.notes ?? null,
      };
    });

    // Coupon
    let discount = 0;
    let appliedCode: string | null = null;
    if (data.coupon_code) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", data.coupon_code.toUpperCase())
        .eq("active", true)
        .maybeSingle();
      if (coupon && Number(coupon.min_order_amount) <= subtotal) {
        if (coupon.type === "flat") discount = Number(coupon.value);
        else discount = Math.min((subtotal * Number(coupon.value)) / 100, Number(coupon.max_discount ?? 9999));
        appliedCode = coupon.code;
      }
    }

    const delivery_charge = 20; // fallback; UI passes distance-based fee via address geocode in future
    const taxes = Math.round(subtotal * 0.05);
    const total = Math.max(0, subtotal + delivery_charge + taxes - discount);

    const prepMax = Math.max(...lineItems.map((l) => foodById.get(l.food_id)?.preparation_time ?? 20));
    const eta = prepMax + 15;

    // Order number
    const order_number = `CP${Math.floor(Math.random() * 90000 + 10000)}`;

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: data.user_id,
        guest_name: data.guest_name ?? null,
        guest_phone: data.guest_phone ?? null,
        order_number,
        address: data.address,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        notes: data.notes ?? null,
        subtotal,
        delivery_charge,
        taxes,
        discount,
        coupon_code: appliedCode,
        total,
        payment_method: data.payment_method,
        payment_status: data.payment_method === "cod" ? "pending" : "pending",
        order_status: "received",
        estimated_delivery_minutes: eta,
      })
      .select()
      .single();
    if (orderErr || !order) throw new Error(orderErr?.message || "Could not create order");

    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(
      lineItems.map((l) => ({ ...l, order_id: order.id })),
    );
    if (itemsErr) throw new Error(itemsErr.message);

    return { id: order.id, order_number: order.order_number };
  });

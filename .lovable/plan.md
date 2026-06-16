## Scope (v1 — Customer app only)

Build the customer-facing app matching your 7 screenshots, fully wired to a Supabase backend with Google Maps. Admin dashboard, rider app, Razorpay, and FCM are out of scope for v1 (we can add them in follow-ups). Payments will use Cash on Delivery + a "UPI / GPay" placeholder until Razorpay is wired.

## Pages (built to match your screenshots)

1. **Home** (`/`) — location header, search, "Flat 50% OFF" hero, categories chips, Popular Near You, Recommended for You, bottom nav (Home / Search / Orders / Profile).
2. **Search** (`/search`) — full-screen search + category filter.
3. **Food Details** (`/food/$id`) — hero image, rating, description, nutrition pills, quantity stepper, Add to Cart, favorite heart.
4. **Cart / Checkout** (`/cart`) — delivery address card, order summary with steppers, coupon (WELCOME50), payment method tabs, totals, Proceed to Payment.
5. **Address picker** (`/address`) — Google Places autocomplete, draggable pin, current location, save address.
6. **Orders list** (`/orders`) — past orders + Reorder.
7. **Order Tracking** (`/orders/$id`) — map with restaurant/customer/rider markers, status stepper (Received → Preparing → On the Way → Delivered), rider card, order summary, View Receipt. Realtime status + rider location.
8. **Profile** (`/profile`) — addresses, favorites, sign out.
9. **Auth** (`/auth`) — Phone OTP + Google. Guest checkout supported from cart.

Floating WhatsApp button on key pages.

## Database (Supabase)

Tables: `profiles`, `user_roles`, `addresses`, `categories`, `food_items`, `cart_items`, `orders`, `order_items`, `coupons`, `reviews`, `favorites`, `delivery_partners`, `delivery_assignments`, `rider_locations`. RLS on every table scoped to `auth.uid()`; menu/categories/coupons readable by `anon` for guest browsing. Seed 4 categories + ~12 food items + WELCOME50 coupon so the app is usable immediately.

## Backend logic (TanStack server functions)

- Menu/category/search reads, food detail, reviews.
- Cart CRUD (per user; guest cart held in localStorage and merged on login).
- Coupon validation.
- `placeOrder` — validates cart, computes totals server-side, creates order + items, returns order id.
- `getOrder` / orders list.
- Delivery fee calc: 0–3 km ₹20, 3–5 km ₹35, 5–8 km ₹50, >8 km ₹50 + ₹8/km (configurable constant).
- ETA = prep_time + route_duration (from Directions API) + buffer.

## Realtime

- Supabase Realtime subscription on `orders` row (status + ETA updates).
- Subscription on `rider_locations` for the assigned rider (lat/lng updates animated on the tracking map).

## Google Maps (via Lovable-managed connector)

- Places Autocomplete on address picker.
- Reverse geocoding from pin drag / current location.
- Directions API for route polyline on tracking map.
- Distance Matrix for delivery distance/fee at checkout.
- Map JS API for all map surfaces (using browser key; server-side calls via gateway).

## Auth

- Email/password + Google (Lovable Cloud defaults). **Phone OTP requires Twilio/MessageBird config in Supabase** — I'll scaffold the UI; you enable the SMS provider in Cloud settings to activate it.
- Guest checkout: order saved with `user_id = null` + phone/name captured at checkout. Converted to user on later sign-up by phone match.

## Design system

Red/white per screenshots. Tokens added to `src/styles.css`:
- `--primary` deep red `oklch(0.45 0.18 25)` (matches the brand red in your shots)
- `--background` warm off-white `oklch(0.985 0.005 60)`
- `--accent` soft pink for badges/icons
- Card radius `1rem`, soft shadows, Inter-style sans.

## Tech notes

- Restaurant location: I'll seed a placeholder (Bangalore MG Road, 12.9716, 77.5946). Update `RESTAURANT_LOCATION` in `src/lib/restaurant.config.ts` with your real coords.
- Currency: ₹ (INR).
- Mobile-first layouts (max-w-md centered) since screenshots are mobile.
- Lovable Cloud enabled for DB + auth + storage + realtime.
- Google Maps connector linked (you'll click "Allow" once).

## Out of scope for v1 (follow-up turns)

- Admin dashboard, rider app, Razorpay live payments, FCM push, WhatsApp message templating beyond the deep link, image uploads UI (we'll use seeded image URLs).

## Build order

1. Enable Lovable Cloud + Google Maps connector.
2. Migration: schema + RLS + grants + seed data.
3. Design system tokens + shared layout/bottom nav.
4. Home → Details → Cart → Checkout → Address picker.
5. Auth + Orders list + Order tracking (realtime + map).
6. Profile, favorites, reviews, WhatsApp button.

Ready to proceed?
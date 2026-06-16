// Single-restaurant configuration. Edit these values for your restaurant.
export const RESTAURANT = {
  name: "Our Kitchen",
  phone: "+919999999999", // WhatsApp number with country code, no '+' or spaces for wa.me
  whatsappNumber: "919999999999",
  // Restaurant pickup location (used for distance + tracking map)
  latitude: 12.9716,
  longitude: 77.5946,
  address: "MG Road, Bangalore",
  currency: "₹",
  taxRate: 0.05, // 5%
  freeDeliveryAbove: null as number | null,
};

export function formatMoney(amount: number): string {
  return `${RESTAURANT.currency}${Math.round(amount)}`;
}

// Haversine distance in km
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function deliveryFeeFor(distanceInKm: number | null): number {
  if (distanceInKm == null) return 20;
  if (distanceInKm <= 3) return 20;
  if (distanceInKm <= 5) return 35;
  if (distanceInKm <= 8) return 50;
  return 50 + Math.ceil(distanceInKm - 8) * 8;
}

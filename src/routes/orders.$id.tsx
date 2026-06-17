import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { X, HelpCircle, Phone, MessageSquare, Check, Bike, ChefHat, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getOrderDetails, updateOrderLocationServer, updateOrderStatusServer } from "@/lib/db.functions";
import { formatMoney, RESTAURANT, distanceKm } from "@/lib/restaurant.config";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({ meta: [{ title: "Track Order — Our Kitchen" }] }),
  component: TrackPage,
});

function useLeaflet() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).L) {
      setLoaded(true);
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
  }, []);

  return loaded;
}

type Stage = "received" | "preparing" | "on_the_way" | "delivered";
const STAGES: { key: Stage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "received", label: "Received", icon: Check },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "on_the_way", label: "On the Way", icon: Bike },
  { key: "delivered", label: "Delivered", icon: Check },
];

function stageOf(status: string): number {
  switch (status) {
    case "received": return 0;
    case "preparing":
    case "packed": return 1;
    case "assigned":
    case "out_for_delivery": return 2;
    case "delivered": return 3;
    default: return 0;
  }
}

function TrackPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const getOrderDetailsFn = useServerFn(getOrderDetails);
  const updateOrderLocationFn = useServerFn(updateOrderLocationServer);
  const updateOrderStatusFn = useServerFn(updateOrderStatusServer);

  const { data: order } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderDetailsFn({ data: id }),
    refetchInterval: 5000,
  });

  const leafletLoaded = useLeaflet();
  const [riderProgress, setRiderProgress] = useState(0.15);
  const [showReceipt, setShowReceipt] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const riderMarker = useRef<any>(null);

  // Live Location Watch (Updates customer location to database in real-time)
  useEffect(() => {
    if (!order || order.order_status === "delivered" || order.order_status === "cancelled") return;

    if (typeof window !== "undefined" && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            await updateOrderLocationFn({ data: { orderId: order.id, latitude, longitude } });
          } catch (error) {
            console.error("Error updating customer live location:", error);
          }
        },
        (err) => console.log("Watch error:", err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
      
      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [order?.id, order?.order_status]);

  // Simulate rider movement on the way
  useEffect(() => {
    if (!order || (order.order_status !== "out_for_delivery" && order.order_status !== "assigned")) return;
    const interval = setInterval(() => {
      setRiderProgress((prev) => {
        if (prev >= 0.96) {
          return 0.15; // loop simulation for display purposes
        }
        return prev + 0.02;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [order?.order_status]);

  // Update Rider Marker position dynamically
  useEffect(() => {
    if (!leafletLoaded || !leafletMap.current || !order) return;

    const customerLat = order.latitude ? Number(order.latitude) : 12.9780;
    const customerLng = order.longitude ? Number(order.longitude) : 77.6030;
    const restLat = RESTAURANT.latitude;
    const restLng = RESTAURANT.longitude;

    const riderLat = restLat + (customerLat - restLat) * riderProgress;
    const riderLng = restLng + (customerLng - restLng) * riderProgress;

    if (riderMarker.current) {
      riderMarker.current.setLatLng([riderLat, riderLng]);
    }
  }, [riderProgress, leafletLoaded, order]);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || !order) return;

    const customerLat = order.latitude ? Number(order.latitude) : 12.9780;
    const customerLng = order.longitude ? Number(order.longitude) : 77.6030;
    const restLat = RESTAURANT.latitude;
    const restLng = RESTAURANT.longitude;

    const riderLat = restLat + (customerLat - restLat) * riderProgress;
    const riderLng = restLng + (customerLng - restLng) * riderProgress;

    const currentStage = stageOf(order.order_status);

    if (!leafletMap.current) {
      const L = (window as any).L;

      const midLat = (restLat + customerLat) / 2;
      const midLng = (restLng + customerLng) / 2;

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([midLat, midLng], 14);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      leafletMap.current = map;

      // Custom HTML Icons (sidestep Vite asset resolution issues)
      const restaurantIcon = L.divIcon({
        html: `<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-lg border-2 border-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18V6a4 4 0 0 1 8 0v12"/><path d="M18 18V9a4 4 0 0 0-8 0v9"/><path d="M3 18h18a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1Z"/></svg></div>`,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const customerIcon = L.divIcon({
        html: `<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg border-2 border-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const riderIcon = L.divIcon({
        html: `<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 text-white shadow-lg border-2 border-white animate-bounce"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M15 6h5a1 1 0 0 1 1 1v2"/><path d="M12 17.5V14l-3-3-4 3"/><path d="m12 14 4-4 3 2.5"/></svg></div>`,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      L.marker([restLat, restLng], { icon: restaurantIcon }).addTo(map).bindPopup("Kitchen");
      L.marker([customerLat, customerLng], { icon: customerIcon }).addTo(map).bindPopup("Your Location");

      L.polyline([[restLat, restLng], [customerLat, customerLng]], {
        color: "#800020",
        weight: 4,
        opacity: 0.6,
        dashArray: "8, 8",
      }).addTo(map);

      if (currentStage >= 2) {
        riderMarker.current = L.marker([riderLat, riderLng], { icon: riderIcon }).addTo(map).bindPopup("Rider");
      }

      const bounds = L.latLngBounds([[restLat, restLng], [customerLat, customerLng]]);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [leafletLoaded, order, currentStage]);

  useEffect(() => {
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        riderMarker.current = null;
      }
    };
  }, []);

  const handleCancelOrder = async () => {
    if (window.confirm("Are you sure you want to cancel your order?")) {
      try {
        await updateOrderStatusFn({ data: { orderId: order.id, status: "cancelled" } });
        toast.success("Order cancelled successfully");
        qc.invalidateQueries({ queryKey: ["order", id] });
      } catch (err: any) {
        toast.error("Failed to cancel order: " + err.message);
      }
    }
  };

  if (!order) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const currentStage = stageOf(order.order_status);
  const customerLat = order.latitude ? Number(order.latitude) : 12.9780;
  const customerLng = order.longitude ? Number(order.longitude) : 77.6030;

  // Real rider details from DB
  const assignedRider = order.delivery_assignments?.delivery_partners;
  const rider = assignedRider ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-36">
      <header className="flex items-center justify-between px-5 pt-6 pb-3 text-brand">
        <Link to="/orders" aria-label="Close"><X className="h-5 w-5" /></Link>
        <h1 className="text-base font-semibold">Track Order #{order.order_number}</h1>
        <button aria-label="Help"><HelpCircle className="h-5 w-5" /></button>
      </header>

      {/* Interactive Map */}
      <div className="relative mx-5 h-72 overflow-hidden rounded-2xl bg-muted border border-border shadow-soft">
        {!leafletLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <span className="text-xs text-muted-foreground">Loading Map tiles...</span>
          </div>
        )}
        <div ref={mapRef} className="h-full w-full" />
      </div>

      {/* ETA card */}
      <div className={`mx-5 -mt-8 rounded-2xl p-5 text-brand-foreground shadow-soft relative z-10 ${
        order.order_status === "cancelled" ? "bg-red-800" : "bg-brand"
      }`}>
        <div className="text-[10px] font-semibold tracking-widest opacity-80">
          {order.order_status === "cancelled" ? "STATUS" : "ESTIMATED ARRIVAL"}
        </div>
        <div className="text-3xl font-extrabold mt-1">
          {order.order_status === "cancelled" 
            ? "Order Cancelled" 
            : order.order_status === "delivered"
            ? "Delivered!" 
            : `Arriving in ${order.estimated_delivery_minutes} mins`}
        </div>
      </div>

      {/* Live status tracking card */}
      {order.order_status !== "cancelled" && order.order_status !== "delivered" && (
        <div className="mx-5 mt-4 p-4 bg-card border border-border rounded-2xl flex items-center justify-between shadow-soft">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Live Delivery Status</span>
            <span className="text-xs font-semibold text-foreground">
              {order.order_status === "received" && "We have received your order. The kitchen will start preparing it soon."}
              {order.order_status === "preparing" && "Our chefs are cooking your fresh food."}
              {order.order_status === "packed" && "Your order is packed and ready for pickup."}
              {order.order_status === "assigned" && `Rider ${rider?.name ?? ""} is picking up your order.`}
              {order.order_status === "out_for_delivery" && (
                <>
                  Rider is on the way (
                  {distanceKm(
                    RESTAURANT.latitude + (customerLat - RESTAURANT.latitude) * riderProgress,
                    RESTAURANT.longitude + (customerLng - RESTAURANT.longitude) * riderProgress,
                    customerLat,
                    customerLng
                  ).toFixed(2)} km away)
                </>
              )}
            </span>
          </div>
          <span className="relative flex h-2.5 w-2.5 shrink-0 ml-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand"></span>
          </span>
        </div>
      )}

      {/* Geolocation sharing status */}
      {order.order_status !== "cancelled" && order.order_status !== "delivered" && (
        <div className="mx-5 mt-3 flex items-center justify-between rounded-xl bg-card border border-border p-3 shadow-card">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[10px] font-bold text-foreground">Sharing Live Location with Rider</span>
          </div>
          <span className="text-[9px] text-muted-foreground font-semibold">
            GPS: {order.latitude ? Number(order.latitude).toFixed(4) : "---"}, {order.longitude ? Number(order.longitude).toFixed(4) : "---"}
          </span>
        </div>
      )}

      {/* Stepper */}
      <div className="mt-6 px-5">
        <div className="relative flex items-center justify-between">
          <div className="absolute left-5 right-5 top-5 h-0.5 bg-border" />
          <div
            className="absolute left-5 top-5 h-0.5 bg-brand transition-all"
            style={{ width: `calc(${(currentStage / 3) * 100}% - ${(currentStage / 3) * 40}px)` }}
          />
          {STAGES.map((s, i) => {
            const reached = i <= currentStage;
            return (
              <div key={s.key} className="relative flex flex-col items-center gap-1">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    reached ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <s.icon className="h-5 w-5" />
                </div>
                <span className={`text-xs font-semibold ${reached ? "text-brand" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rider card from Database (real info instead of hardcoded Vikram) */}
      {currentStage >= 2 && rider && (
        <div className="mx-5 mt-6 flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card border border-border">
          <img
            src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(rider.name)}`}
            alt="Rider"
            className="h-12 w-12 rounded-full bg-muted border border-border"
          />
          <div className="flex-1">
            <div className="font-extrabold text-sm">{rider.name}</div>
            <div className="text-[11px] text-muted-foreground font-semibold">
              ★ {Number(rider.rating || 5).toFixed(1)} ({rider.deliveries_count || 0} deliveries)
            </div>
          </div>
          {rider.phone && (
            <a 
              href={`tel:${rider.phone}`} 
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand text-brand bg-brand-soft hover:bg-brand hover:text-white transition-all shrink-0"
            >
              <Phone className="h-4 w-4" />
            </a>
          )}
          {rider.phone && (
            <a
              href={`https://wa.me/${rider.phone.replace(/\+/g, "")}?text=Hi%20${encodeURIComponent(rider.name)},%20I'm%20tracking%20my%20order%20%23${order.order_number}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500 text-white hover:bg-green-600 transition-all shrink-0"
            >
              <MessageSquare className="h-4 w-4" />
            </a>
          )}
        </div>
      )}

      {/* Order summary */}
      <h2 className="mt-7 px-5 text-lg font-bold">Order Summary</h2>
      <div className="mt-3 space-y-2 px-5">
        {order.order_items?.map((i: any) => (
          <div key={i.id} className="flex items-center gap-3 rounded-2xl bg-muted p-3">
            <img src={i.image ?? ""} alt={i.name} className="h-12 w-12 rounded-lg object-cover" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{i.quantity}× {i.name}</div>
              {i.notes && <div className="text-xs text-muted-foreground">{i.notes}</div>}
            </div>
            <div className="font-bold text-brand">{formatMoney(Number(i.price) * i.quantity)}</div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-border bg-card p-4 flex flex-col gap-2 z-20">
        <div className="text-center text-xs text-muted-foreground">
          Paying with <span className="font-semibold">{order.payment_method.toUpperCase()}</span>
        </div>
        <div className="flex gap-2.5">
          {order.order_status === "received" && (
            <button
              onClick={handleCancelOrder}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 py-3.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-all"
            >
              <Trash2 className="h-4 w-4" /> Cancel Order
            </button>
          )}
          <button
            onClick={() => setShowReceipt(true)}
            className={`flex-1 flex items-center justify-center rounded-2xl bg-brand py-3.5 text-xs font-bold text-brand-foreground ${
              order.order_status !== "received" ? "w-full flex-none" : ""
            }`}
          >
            View Receipt
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center pb-4 border-b border-dashed border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Receipt</span>
              <h3 className="text-xl font-extrabold text-brand">{RESTAURANT.name}</h3>
              <p className="text-[10px] text-muted-foreground">Order Ref: #{order.order_number}</p>
              <p className="text-[9px] text-muted-foreground">
                Date: {new Date(order.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>

            {/* Itemized list */}
            <div className="py-4 space-y-2 max-h-40 overflow-y-auto border-b border-dashed border-border">
              {order.order_items?.map((item: any) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-bold text-foreground">{formatMoney(Number(item.price) * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="py-4 space-y-1.5 text-xs border-b border-dashed border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatMoney(Number(order.subtotal))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Charge</span>
                <span className="font-semibold">{formatMoney(Number(order.delivery_charge))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST & Restaurant Taxes (5%)</span>
                <span className="font-semibold">{formatMoney(Number(order.taxes))}</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Discount Applied ({order.coupon_code})</span>
                  <span>-{formatMoney(Number(order.discount))}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="py-4 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Amount</span>
                <span className="text-xl font-black text-brand">{formatMoney(Number(order.total))}</span>
              </div>
              <div className="text-right">
                <span className={`rounded-full px-3 py-1 text-[9px] font-extrabold uppercase ${
                  order.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                }`}>
                  {order.payment_status}
                </span>
                <span className="text-[9px] font-bold text-muted-foreground block mt-1">
                  Via {order.payment_method.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={() => setShowReceipt(false)}
              className="mt-2 w-full py-3 rounded-2xl bg-brand text-brand-foreground font-bold text-xs shadow-soft hover:opacity-90 transition-all"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

      <WhatsAppFab message={`Hi, I have a question about order #${order.order_number}`} />
    </div>
  );
}

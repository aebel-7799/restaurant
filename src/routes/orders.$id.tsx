import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { X, HelpCircle, Phone, MessageSquare, Check, Bike, ChefHat } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getOrderDetails, updateOrderLocationServer } from "@/lib/db.functions";
import { formatMoney, RESTAURANT } from "@/lib/restaurant.config";
import { WhatsAppFab } from "@/components/whatsapp-fab";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({ meta: [{ title: "Track Order — Our Kitchen" }] }),
  component: TrackPage,
});

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

  const { data: order } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderDetailsFn({ data: id }),
    refetchInterval: 5000,
  });

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


  if (!order) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const currentStage = stageOf(order.order_status);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">
      <header className="flex items-center justify-between px-5 pt-6 pb-3 text-brand">
        <Link to="/orders" aria-label="Close"><X className="h-5 w-5" /></Link>
        <h1 className="text-base font-semibold">Track Order #{order.order_number}</h1>
        <button aria-label="Help"><HelpCircle className="h-5 w-5" /></button>
      </header>

      {/* Map placeholder */}
      <div className="relative mx-5 h-72 overflow-hidden rounded-2xl bg-muted">
        <img
          src="https://maps.googleapis.com/maps/api/staticmap?center=12.9716,77.5946&zoom=14&size=600x400&maptype=roadmap"
          alt=""
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/80" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-lg">
            <Bike className="h-6 w-6" />
          </div>
          <div className="mt-2 inline-block rounded-full bg-card px-3 py-1 text-xs font-semibold text-brand shadow">
            Rider is on the way
          </div>
        </div>
      </div>

      {/* ETA card */}
      <div className="mx-5 -mt-8 rounded-2xl bg-brand p-5 text-brand-foreground shadow-soft relative">
        <div className="text-[10px] font-semibold tracking-widest opacity-80">ESTIMATED ARRIVAL</div>
        <div className="text-3xl font-extrabold">
          Arriving in {order.estimated_delivery_minutes} mins
        </div>
      </div>

      {/* Geolocation sharing status */}
      <div className="mx-5 mt-3 flex items-center justify-between rounded-xl bg-card border border-border p-3 shadow-card">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[10px] font-bold text-foreground">Sharing Live Location with Rider</span>
        </div>
        <span className="text-[9px] text-muted-foreground font-semibold">
          GPS: {order.latitude?.toFixed(4) ?? "---"}, {order.longitude?.toFixed(4) ?? "---"}
        </span>
      </div>


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

      {/* Rider card (placeholder when assigned) */}
      {currentStage >= 2 && (
        <div className="mx-5 mt-6 flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card">
          <img
            src="https://api.dicebear.com/9.x/avataaars/svg?seed=Vikram"
            alt="Rider"
            className="h-12 w-12 rounded-full bg-muted"
          />
          <div className="flex-1">
            <div className="font-semibold">Vikram</div>
            <div className="text-xs text-muted-foreground">★ 4.9 (2k+ deliveries)</div>
          </div>
          <a href={`tel:${RESTAURANT.phone}`} className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand text-brand">
            <Phone className="h-5 w-5" />
          </a>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500 text-white">
            <MessageSquare className="h-5 w-5" />
          </button>
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
      <div className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-border bg-card p-4">
        <div className="text-center text-xs text-muted-foreground">
          Paying with <span className="font-semibold">{order.payment_method.toUpperCase()}</span>
        </div>
        <Link
          to="/orders/$id"
          params={{ id: order.id }}
          className="mt-3 flex w-full items-center justify-center rounded-2xl bg-brand py-3.5 text-sm font-semibold text-brand-foreground"
        >
          View Receipt
        </Link>
      </div>

      <WhatsAppFab message={`Hi, I have a question about order #${order.order_number}`} />
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bike,
  Navigation,
  Phone,
  MessageSquare,
  DollarSign,
  Briefcase,
  MapPin,
  CheckCircle,
  Truck,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  getAdminRiders,
  getAdminOrders,
  claimRiderJobServer,
  updateOrderStatusServer,
} from "@/lib/db.functions";
import { formatMoney } from "@/lib/restaurant.config";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/delivery")({
  head: () => ({ meta: [{ title: "Rider Portal — Our Kitchen" }] }),
  component: RiderPortalPage,
});

type SubTab = "available" | "my-jobs";

function RiderPortalPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("available");
  const [activeRiderId, setActiveRiderId] = useState<string>("rider-1");
  const [onlineStatus, setOnlineStatus] = useState(true);

  const getAdminRidersFn = useServerFn(getAdminRiders);
  const getAdminOrdersFn = useServerFn(getAdminOrders);
  const claimRiderJobFn = useServerFn(claimRiderJobServer);
  const updateOrderStatusFn = useServerFn(updateOrderStatusServer);

  // 1. Fetch available riders for demo identity selection
  const { data: riders } = useQuery({
    queryKey: ["delivery_riders_list"],
    queryFn: () => getAdminRidersFn(),
  });

  // Automatically select a rider or read from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("grillgo_demo_rider_id");
      if (saved) {
        setActiveRiderId(saved);
      } else if (riders && riders.length > 0) {
        setActiveRiderId(riders[0].id);
        localStorage.setItem("grillgo_demo_rider_id", riders[0].id);
      }
    }
  }, [riders]);

  const activeRider = riders?.find((r) => r.id === activeRiderId);

  // 2. Fetch available orders (status 'packed' or 'assigned' but no assignment/assigned to current rider)
  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ["rider_orders", activeRiderId],
    queryFn: () => getAdminOrdersFn(),
    refetchInterval: 5000,
  });

  // Filter orders by categories
  // "Available": Packed orders with no assignment
  const availableOrders = orders?.filter((o) => {
    const isPacked = o.order_status === "packed";
    const hasNoRider = !o.delivery_assignments;
    return isPacked && hasNoRider;
  }) ?? [];

  const myOrders = orders?.filter((o) => {
    const isAssignedToMe = o.delivery_assignments?.rider_id === activeRiderId;
    const isActive = o.order_status !== "delivered" && o.order_status !== "cancelled";
    return isAssignedToMe && isActive;
  }) ?? [];

  const completedCount = orders?.filter((o) => {
    return o.delivery_assignments?.rider_id === activeRiderId && o.order_status === "delivered";
  }).length ?? 0;

  // Earnings: Flat ₹50 per delivery
  const earnings = completedCount * 50;

  const handleClaimJob = async (orderId: string) => {
    if (!activeRiderId) {
      toast.error("Please register or select a Rider identity first.");
      return;
    }

    try {
      await claimRiderJobFn({ data: { orderId, riderId: activeRiderId } });
      toast.success("Job claimed successfully!");
      setActiveSubTab("my-jobs");
      queryClient.invalidateQueries({ queryKey: ["rider_orders"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: "out_for_delivery" | "delivered") => {
    try {
      await updateOrderStatusFn({ data: { orderId, status } });
      toast.success(`Order status updated to ${status.replace(/_/g, " ")}`);
      queryClient.invalidateQueries({ queryKey: ["rider_orders"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRiderChange = (id: string) => {
    setActiveRiderId(id);
    localStorage.setItem("grillgo_demo_rider_id", id);
    toast.success("Rider identity switched");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-12">
      <header className="sticky top-0 z-20 border-b border-border bg-card px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="text-brand hover:opacity-85">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Bike className="h-5 w-5 text-brand" />
            <span>Rider Portal</span>
          </h1>
        </div>

        {/* Online/Offline Toggle */}
        <button
          onClick={() => setOnlineStatus(!onlineStatus)}
          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
            onlineStatus
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {onlineStatus ? "● Online" : "○ Offline"}
        </button>
      </header>

      {/* Demo Identity Switcher */}
      <div className="mx-5 mt-4 p-3 rounded-2xl bg-card border border-border space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <span>Active Rider Identity</span>
          <span className="text-brand flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Demo Mode
          </span>
        </div>
        <select
          value={activeRiderId}
          onChange={(e) => handleRiderChange(e.target.value)}
          className="w-full text-xs font-bold border border-border rounded-xl px-3 py-2 bg-background"
        >
          {riders?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.phone ?? "No phone"})
            </option>
          ))}
          {riders?.length === 0 && <option value="">No Riders Registered</option>}
        </select>
      </div>

      {/* Earnings & Stats */}
      {activeRider && (
        <div className="mx-5 mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-brand p-4 text-brand-foreground shadow-soft">
            <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider block">Today's Earnings</span>
            <span className="text-2xl font-black block mt-1">{formatMoney(earnings)}</span>
            <span className="text-[9px] opacity-75 block mt-0.5">₹50 flat fee per order</span>
          </div>

          <div className="rounded-2xl bg-card border border-border p-4 shadow-card flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Deliveries</span>
              <span className="text-2xl font-black block mt-1">{completedCount}</span>
            </div>
            <span className="text-[9px] text-green-600 font-semibold block mt-1">★ Completed successfully</span>
          </div>
        </div>
      )}

      {/* Tab controls */}
      <div className="mx-5 mt-4 grid grid-cols-2 gap-1 p-1 bg-muted rounded-xl">
        <button
          onClick={() => setActiveSubTab("available")}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === "available"
              ? "bg-brand text-brand-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Briefcase className="h-4 w-4" /> Available Jobs ({availableOrders.length})
        </button>

        <button
          onClick={() => setActiveSubTab("my-jobs")}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === "my-jobs"
              ? "bg-brand text-brand-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Truck className="h-4 w-4" /> My Deliveries ({myOrders.length})
        </button>
      </div>

      <div className="mt-4 px-5 flex-1">
        {loadingOrders && <p className="text-center text-xs text-muted-foreground py-6">Loading Jobs...</p>}

        {/* Available Jobs */}
        {activeSubTab === "available" && (
          <div className="space-y-3">
            {availableOrders.map((o) => (
              <div key={o.id} className="rounded-2xl bg-card border border-border p-4 shadow-card space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm font-extrabold block">Ticket #{o.order_number}</span>
                    <span className="text-[10px] text-muted-foreground">
                      Ready: {new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[9px] font-bold text-brand uppercase">
                    Packed
                  </span>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">📦 {o.order_items?.length ?? 0} items to deliver</p>
                  <p className="flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
                    <span>{o.address}</span>
                  </p>
                </div>

                <div className="h-px bg-border/50" />

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Customer Pay</span>
                    <span className="text-sm font-black text-brand">{formatMoney(Number(o.total))}</span>
                  </div>

                  <button
                    onClick={() => handleClaimJob(o.id)}
                    className="rounded-xl bg-brand text-brand-foreground px-4 py-2 text-xs font-bold shadow-sm"
                  >
                    Accept & Claim Job
                  </button>
                </div>
              </div>
            ))}

            {availableOrders.length === 0 && (
              <div className="text-center py-12 rounded-2xl bg-card border border-dashed border-border space-y-2">
                <Briefcase className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-xs font-semibold text-muted-foreground">No available delivery jobs right now.</p>
              </div>
            )}
          </div>
        )}

        {/* My Active Deliveries */}
        {activeSubTab === "my-jobs" && (
          <div className="space-y-3">
            {myOrders.map((o) => (
              <div key={o.id} className="rounded-2xl bg-card border border-border p-4 shadow-card space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm font-extrabold block">Ticket #{o.order_number}</span>
                    <span className="text-[10px] text-muted-foreground">Status: {o.order_status.replace(/_/g, " ")}</span>
                  </div>
                  <span className="rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5 text-[9px] font-bold uppercase">
                    Assigned
                  </span>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">
                    {(o.order_items ?? []).map((i: any) => `${i.quantity}x ${i.name}`).join(", ")}
                  </p>
                  <p className="flex items-start gap-1 mt-1 text-foreground font-medium">
                    <MapPin className="h-3.5 w-3.5 text-brand shrink-0" />
                    <span>{o.address}</span>
                  </p>
                  {o.guest_name && (
                    <p className="mt-1">👤 Customer: {o.guest_name}</p>
                  )}
                  {o.notes && (
                    <p className="p-2 bg-yellow-50 rounded-lg text-yellow-800 text-[10px] font-bold">💡 Instructions: {o.notes}</p>
                  )}
                  {o.latitude && o.longitude && (
                    <div className="mt-3.5 p-3.5 bg-brand-soft/60 border border-brand/10 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-black text-brand uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-brand animate-ping" />
                          Live Customer GPS Connected
                        </span>
                        <span>Distance: ~800m</span>
                      </div>
                      
                      <div className="relative h-28 overflow-hidden rounded-xl bg-muted border border-border/80">
                        <img
                          src={`https://maps.googleapis.com/maps/api/staticmap?center=${o.latitude},${o.longitude}&zoom=15&size=400x200&maptype=roadmap&markers=color:red%7C${o.latitude},${o.longitude}`}
                          alt="Customer GPS Location"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          className="absolute inset-0 h-full w-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-card/95 backdrop-blur px-3 py-2 rounded-xl flex items-center justify-between shadow-sm">
                          <span className="text-[10px] font-extrabold text-muted-foreground truncate max-w-[65%]">
                            GPS: {o.latitude.toFixed(5)}, {o.longitude.toFixed(5)}
                          </span>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${o.latitude},${o.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[9px] font-black text-brand bg-brand-soft px-2.5 py-1 rounded-md border border-brand/15 hover:bg-brand/25 transition-all"
                          >
                            Directions
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-px bg-border/50" />


                <div className="flex items-center gap-3">
                  {o.guest_phone && (
                    <a
                      href={`tel:${o.guest_phone}`}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background hover:bg-brand-soft text-brand shrink-0"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background hover:bg-brand-soft text-brand shrink-0"
                  >
                    <Navigation className="h-4 w-4" />
                  </a>

                  {o.order_status === "assigned" && (
                    <button
                      onClick={() => handleUpdateStatus(o.id, "out_for_delivery")}
                      className="flex-1 rounded-xl bg-brand text-brand-foreground py-2.5 text-xs font-bold shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Truck className="h-4 w-4" /> Start Delivery
                    </button>
                  )}

                  {o.order_status === "out_for_delivery" && (
                    <button
                      onClick={() => handleUpdateStatus(o.id, "delivered")}
                      className="flex-1 rounded-xl bg-green-600 text-white py-2.5 text-xs font-bold shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="h-4 w-4" /> Complete Delivery
                    </button>
                  )}
                </div>
              </div>
            ))}

            {myOrders.length === 0 && (
              <div className="text-center py-12 rounded-2xl bg-card border border-dashed border-border space-y-2">
                <Truck className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-xs font-semibold text-muted-foreground">You don't have any active deliveries.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

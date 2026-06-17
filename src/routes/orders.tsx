import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUserOrders } from "@/lib/db.functions";
import { Receipt, RotateCcw, Bike } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { formatMoney } from "@/lib/restaurant.config";
import { toast } from "sonner";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Orders — Our Kitchen" }] }),
  component: OrdersPage,
});

import { useEffect, useState } from "react";

function OrdersPage() {
  const { user } = useAuth();
  const { add } = useCart();
  const [guestOrderIds, setGuestOrderIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      try {
        const raw = localStorage.getItem("grillgo.guest_orders");
        if (raw) {
          setGuestOrderIds(JSON.parse(raw));
        }
      } catch (e) {}
    }
  }, [user]);

  const getUserOrdersFn = useServerFn(getUserOrders);

  const queryKey = user ? ["orders", user.id] : ["orders", "guest", guestOrderIds];
  const queryParam = user ? user.id : guestOrderIds;
  const isEnabled = !!user || guestOrderIds.length > 0;

  const { data: orders, isLoading } = useQuery({
    queryKey,
    enabled: isEnabled,
    queryFn: () => getUserOrdersFn({ data: queryParam }),
  });

  // Sort orders: ongoing/active first, then completed/cancelled, sub-sorted by created_at DESC
  const sortedOrders = orders ? [...orders].sort((a, b) => {
    const isOngoing = (status: string) => 
      status !== "delivered" && status !== "cancelled";
      
    const aOngoing = isOngoing(a.order_status);
    const bOngoing = isOngoing(b.order_status);
    
    if (aOngoing && !bOngoing) return -1;
    if (!aOngoing && bOngoing) return 1;
    
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }) : [];

  if (!user && guestOrderIds.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <Receipt className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Sign in to view your orders.</p>
          <Link to="/auth" className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground">
            Sign in
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="space-y-3 px-5 py-2">
        {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>}
        {sortedOrders.map((o) => {
          const isOngoing = o.order_status !== "delivered" && o.order_status !== "cancelled";
          return (
            <Link
              key={o.id}
              to="/orders/$id"
              params={{ id: o.id }}
              className={`block rounded-2xl p-4 border transition-all duration-200 ${
                isOngoing
                  ? "bg-card border-brand/15 shadow-md ring-1 ring-brand/5"
                  : "bg-card/75 border-border shadow-card hover:bg-card"
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-extrabold text-foreground">#{o.order_number}</span>
                <StatusBadge status={o.order_status} />
              </div>
              <div className="mt-2 line-clamp-1 text-xs text-muted-foreground font-semibold">
                {(o.order_items ?? []).map((i: any) => `${i.quantity}× ${i.name}`).join(", ")}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-black text-brand text-base">{formatMoney(Number(o.total))}</span>
                
                {isOngoing ? (
                  <button className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-[11px] font-bold text-brand-foreground shadow-sm">
                    <Bike className="h-3.5 w-3.5" /> Track Live
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      (o.order_items ?? []).forEach((i: any) =>
                        add({ food_id: i.food_id, name: i.name, image: i.image, price: Number(i.price) }, i.quantity),
                      );
                      toast.success("Items added to cart");
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-all"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Order Again
                  </button>
                )}
              </div>
            </Link>
          );
        })}
        {orders && orders.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No orders yet.</p>
        )}
      </div>
      <div className="flex-1" />
      <BottomNav />
    </div>
  );
}

function Header() {
  return (
    <header className="px-5 pt-6 pb-3">
      <h1 className="text-2xl font-bold">My Orders</h1>
    </header>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    received: "bg-blue-50 text-blue-700 border-blue-200",
    preparing: "bg-amber-50 text-amber-700 border-amber-200",
    packed: "bg-purple-50 text-purple-700 border-purple-200",
    assigned: "bg-indigo-50 text-indigo-700 border-indigo-200",
    out_for_delivery: "bg-orange-50 text-orange-700 border-orange-200",
    delivered: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };
  const c = colors[status] ?? "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${c}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}


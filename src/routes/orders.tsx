import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUserOrders } from "@/lib/db.functions";
import { Receipt, RotateCcw } from "lucide-react";
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
        {orders?.map((o) => (
          <Link
            key={o.id}
            to="/orders/$id"
            params={{ id: o.id }}
            className="block rounded-2xl bg-card p-4 shadow-card"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">#{o.order_number}</span>
              <StatusBadge status={o.order_status} />
            </div>
            <div className="mt-2 line-clamp-1 text-sm text-muted-foreground">
              {(o.order_items ?? []).map((i: any) => `${i.quantity}× ${i.name}`).join(", ")}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-bold text-brand">{formatMoney(Number(o.total))}</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  (o.order_items ?? []).forEach((i: any) =>
                    add({ food_id: i.food_id, name: i.name, image: i.image, price: Number(i.price) }, i.quantity),
                  );
                  toast.success("Items added to cart");
                }}
                className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Order Again
              </button>
            </div>
          </Link>
        ))}
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
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  const c = colors[status] ?? "bg-brand-soft text-brand";
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${c}`}>{status.replace(/_/g, " ")}</span>;
}

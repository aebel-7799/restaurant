import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Flame, PackageCheck, AlertCircle, ChefHat, BellRing } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getKitchenOrders, updateOrderStatusServer } from "@/lib/db.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/kitchen")({
  head: () => ({ meta: [{ title: "Kitchen Screen — Our Kitchen" }] }),
  component: KitchenPage,
});

function KitchenPage() {
  const queryClient = useQueryClient();
  const [enableSound, setEnableSound] = useState(true);
  const [lastOrderIds, setLastOrderIds] = useState<string[]>([]);

  const getKitchenOrdersFn = useServerFn(getKitchenOrders);
  const updateOrderStatusFn = useServerFn(updateOrderStatusServer);

  // Fetch only active cooking/preparation orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ["kitchen_orders"],
    queryFn: () => getKitchenOrdersFn(),
    refetchInterval: 5000,
  });

  const playChime = () => {
    if (!enableSound) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.error("Failed to play chime", e);
    }
  };

  // Local detection for new incoming orders
  useEffect(() => {
    if (!orders) return;
    const currentIds = orders.map((o) => o.id);
    const newOrders = orders.filter((o) => o.order_status === "received" && !lastOrderIds.includes(o.id));
    if (newOrders.length > 0 && lastOrderIds.length > 0) {
      playChime();
      newOrders.forEach((o) => {
        toast.info("🛎️ New order received in the kitchen!", {
          description: `Order #${o.order_number} has been placed.`,
        });
      });
    }
    setLastOrderIds(currentIds);
  }, [orders]);

  const updateStatus = async (orderId: string, status: "preparing" | "packed" | "cancelled") => {
    try {
      await updateOrderStatusFn({ data: { orderId, status } });
      toast.success(`Order status updated to ${status}`);
      queryClient.invalidateQueries({ queryKey: ["kitchen_orders"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Live timer hook for cards
  const useElapsed = (createdAt: string) => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
      const calculate = () => {
        const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
        setSeconds(diff >= 0 ? diff : 0);
      };
      calculate();
      const interval = setInterval(calculate, 1000);
      return () => clearInterval(interval);
    }, [createdAt]);

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const ElapsedDisplay = ({ createdAt }: { createdAt: string }) => {
    const timeStr = useElapsed(createdAt);
    // Alert color if order is older than 15 mins (900 seconds)
    const isLate = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000) > 900;
    
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
        isLate ? "bg-red-100 text-red-700 animate-pulse" : "bg-muted text-muted-foreground"
      }`}>
        <Clock className="h-3 w-3" />
        {timeStr}
      </span>
    );
  };

  // Split by category
  const receivedOrders = orders?.filter((o) => o.order_status === "received") ?? [];
  const preparingOrders = orders?.filter((o) => o.order_status === "preparing") ?? [];
  const packedOrders = orders?.filter((o) => o.order_status === "packed") ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background pb-12">
      <header className="sticky top-0 z-20 border-b border-border bg-card px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="text-brand hover:opacity-85">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-brand" />
            <span>Kitchen Display</span>
          </h1>
        </div>

        <button
          onClick={() => {
            setEnableSound(!enableSound);
            playChime();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
            enableSound
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-muted text-muted-foreground border-border"
          }`}
        >
          <BellRing className={`h-3.5 w-3.5 ${enableSound ? "animate-bounce" : ""}`} />
          {enableSound ? "Chime On" : "Chime Off"}
        </button>
      </header>

      {/* Grid summary stats */}
      <div className="grid grid-cols-3 gap-2.5 mx-5 mt-4">
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Incoming</span>
          <span className="text-xl font-black text-blue-600 block mt-1">{receivedOrders.length}</span>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Preparing</span>
          <span className="text-xl font-black text-amber-500 block mt-1">{preparingOrders.length}</span>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Ready / Packed</span>
          <span className="text-xl font-black text-green-600 block mt-1">{packedOrders.length}</span>
        </div>
      </div>

      <div className="mt-5 px-5 space-y-4">
        {isLoading && <p className="text-center text-xs text-muted-foreground py-6">Loading Kitchen Tickets...</p>}

        {orders && orders.length === 0 && (
          <div className="text-center py-20 rounded-2xl bg-card border border-dashed border-border space-y-2">
            <ChefHat className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-muted-foreground">Kitchen is clean! No pending orders.</p>
          </div>
        )}

        {/* Incoming Orders Section */}
        {receivedOrders.length > 0 && (
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
              <span>Incoming Tickets ({receivedOrders.length})</span>
            </h2>
            <div className="space-y-3">
              {receivedOrders.map((o) => (
                <KitchenTicketCard key={o.id} order={o} onUpdateStatus={updateStatus} />
              ))}
            </div>
          </div>
        )}

        {/* Preparing Orders Section */}
        {preparingOrders.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <h2 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Preparing / In Progress ({preparingOrders.length})</span>
            </h2>
            <div className="space-y-3">
              {preparingOrders.map((o) => (
                <KitchenTicketCard key={o.id} order={o} onUpdateStatus={updateStatus} />
              ))}
            </div>
          </div>
        )}

        {/* Packed Orders Section */}
        {packedOrders.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <h2 className="text-xs font-bold text-green-600 uppercase tracking-widest flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span>Ready for Pickup / Packed ({packedOrders.length})</span>
            </h2>
            <div className="space-y-3">
              {packedOrders.map((o) => (
                <KitchenTicketCard key={o.id} order={o} onUpdateStatus={updateStatus} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function KitchenTicketCard({ order, onUpdateStatus }: { order: any; onUpdateStatus: any }) {
    return (
      <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
        <div className="border-b border-border/60 bg-muted/30 px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-sm font-black text-foreground">Ticket #{order.order_number}</span>
            <span className="text-[10px] text-muted-foreground block">
              Time: {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <ElapsedDisplay createdAt={order.created_at} />
        </div>

        <div className="p-4 space-y-3">
          <ul className="space-y-2.5">
            {order.order_items?.map((item: any) => (
              <li key={item.id} className="flex justify-between items-start gap-4 text-sm">
                <div className="flex-1">
                  <div className="font-bold flex items-center gap-2">
                    <span className="text-brand font-black bg-brand-soft text-[11px] h-5 w-5 rounded-full flex items-center justify-center">
                      {item.quantity}
                    </span>
                    <span>{item.name}</span>
                  </div>
                  {item.notes && (
                    <span className="text-xs text-brand font-bold bg-brand-soft px-2 py-0.5 rounded-md inline-block mt-1">
                      ✏️ {item.notes}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {order.notes && (
            <div className="p-2.5 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-800 font-medium">
              💡 Customer Notes: {order.notes}
            </div>
          )}

          <div className="h-px bg-border/50 pt-1" />

          <div className="flex gap-2">
            {order.order_status === "received" && (
              <button
                onClick={() => onUpdateStatus(order.id, "preparing")}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-brand text-brand-foreground py-2.5 text-xs font-bold shadow-sm"
              >
                <Flame className="h-4 w-4" /> Start Preparing
              </button>
            )}

            {order.order_status === "preparing" && (
              <button
                onClick={() => onUpdateStatus(order.id, "packed")}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-green-600 text-white py-2.5 text-xs font-bold shadow-sm"
              >
                <PackageCheck className="h-4 w-4" /> Mark Packed & Ready
              </button>
            )}

            <button
              onClick={() => {
                if (confirm("Are you sure you want to cancel this order ticket?")) {
                  onUpdateStatus(order.id, "cancelled");
                }
              }}
              className="px-3 rounded-xl border border-border bg-background hover:bg-red-50 text-red-600 flex items-center justify-center"
              title="Cancel Order"
            >
              <AlertCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }
}

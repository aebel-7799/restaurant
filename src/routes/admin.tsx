import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Utensils,
  Bike,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  getAdminOrders,
  getFoodItems,
  getAdminRiders,
  updateOrderStatusServer,
  assignRiderServer,
  toggleFoodAvailableServer,
  toggleFoodRecommendServer,
  saveFoodPriceServer,
  createRiderServer,
} from "@/lib/db.functions";
import { formatMoney } from "@/lib/restaurant.config";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Our Kitchen" }] }),
  component: AdminPage,
});

type Tab = "analytics" | "orders" | "menu" | "riders";

function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("analytics");
  const queryClient = useQueryClient();

  const getAdminOrdersFn = useServerFn(getAdminOrders);
  const getFoodItemsFn = useServerFn(getFoodItems);
  const getAdminRidersFn = useServerFn(getAdminRiders);
  const updateOrderStatusFn = useServerFn(updateOrderStatusServer);
  const assignRiderFn = useServerFn(assignRiderServer);
  const toggleFoodAvailableFn = useServerFn(toggleFoodAvailableServer);
  const toggleFoodRecommendFn = useServerFn(toggleFoodRecommendServer);
  const saveFoodPriceFn = useServerFn(saveFoodPriceServer);
  const createRiderFn = useServerFn(createRiderServer);

  // Queries
  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ["admin_orders"],
    queryFn: () => getAdminOrdersFn(),
  });

  const { data: foodItems, isLoading: loadingFood } = useQuery({
    queryKey: ["admin_food"],
    queryFn: () => getFoodItemsFn({ data: "all" }),
  });

  const { data: riders, isLoading: loadingRiders } = useQuery({
    queryKey: ["admin_riders"],
    queryFn: () => getAdminRidersFn(),
  });

  // State for editing menu items
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");

  // State for order selection & rider assignment
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Database actions
  const handleUpdateOrderStatus = async (orderId: string, status: any) => {
    try {
      await updateOrderStatusFn({ data: { orderId, status } });
      toast.success(`Order status updated to ${status.replace(/_/g, " ")}`);
      queryClient.invalidateQueries({ queryKey: ["admin_orders"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAssignRider = async (orderId: string, riderId: string) => {
    try {
      await assignRiderFn({ data: { orderId, riderId } });
      toast.success("Rider assigned successfully");
      setSelectedOrderId(null);
      queryClient.invalidateQueries({ queryKey: ["admin_orders"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleToggleFoodAvailable = async (itemId: string, currentVal: boolean) => {
    try {
      await toggleFoodAvailableFn({ data: { itemId, available: !currentVal } });
      toast.success("Food availability updated");
      queryClient.invalidateQueries({ queryKey: ["admin_food"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleToggleFoodRecommend = async (itemId: string, currentVal: boolean) => {
    try {
      await toggleFoodRecommendFn({ data: { itemId, recommend: !currentVal } });
      toast.success("Recommendation status updated");
      queryClient.invalidateQueries({ queryKey: ["admin_food"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSavePrice = async (itemId: string) => {
    const parsed = parseFloat(editPrice);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      await saveFoodPriceFn({ data: { itemId, price: parsed } });
      toast.success("Price updated successfully");
      setEditingItemId(null);
      queryClient.invalidateQueries({ queryKey: ["admin_food"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCreateRider = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;

    if (!name) return;

    try {
      await createRiderFn({ data: { name, phone } });
      toast.success("Rider registered successfully");
      e.currentTarget.reset();
      queryClient.invalidateQueries({ queryKey: ["admin_riders"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Computations for Analytics
  const totalRevenue = orders
    ?.filter((o) => o.order_status === "delivered")
    .reduce((acc, o) => acc + Number(o.total), 0) ?? 0;

  const activeOrdersCount = orders
    ?.filter((o) => o.order_status !== "delivered" && o.order_status !== "cancelled")
    .length ?? 0;

  const totalItemsCount = foodItems?.length ?? 0;
  const availableItemsCount = foodItems?.filter((f) => f.available).length ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-12">
      <header className="sticky top-0 z-20 border-b border-border bg-card px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="text-brand hover:opacity-85">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold">Admin Console</h1>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          Live Database
        </span>
      </header>

      {/* Navigation tabs */}
      <div className="mx-5 mt-4 grid grid-cols-4 gap-1 p-1 bg-muted rounded-xl">
        {(["analytics", "orders", "menu", "riders"] as Tab[]).map((tab) => {
          const active = activeTab === tab;
          const icons = {
            analytics: LayoutDashboard,
            orders: ShoppingBag,
            menu: Utensils,
            riders: Bike,
          };
          const Icon = icons[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center gap-1 py-2 text-[10px] font-bold rounded-lg capitalize transition-all ${
                active ? "bg-brand text-brand-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab}
            </button>
          );
        })}
      </div>

      <div className="mt-4 px-5 flex-1">
        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-card p-4 shadow-card border border-border flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Total Revenue</span>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
                <div className="mt-2 text-2xl font-black text-brand">{formatMoney(totalRevenue)}</div>
                <div className="text-[9px] text-green-600 font-semibold mt-1">★ Delivered orders</div>
              </div>

              <div className="rounded-2xl bg-card p-4 shadow-card border border-border flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Active Orders</span>
                  <TrendingUp className="h-4 w-4 text-brand" />
                </div>
                <div className="mt-2 text-2xl font-black">{activeOrdersCount}</div>
                <div className="text-[9px] text-muted-foreground font-semibold mt-1">Preparing & On the way</div>
              </div>

              <div className="rounded-2xl bg-card p-4 shadow-card border border-border flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Total Orders</span>
                  <ShoppingBag className="h-4 w-4 text-brand" />
                </div>
                <div className="mt-2 text-2xl font-black">{orders?.length ?? 0}</div>
                <div className="text-[9px] text-muted-foreground font-semibold mt-1">All time records</div>
              </div>

              <div className="rounded-2xl bg-card p-4 shadow-card border border-border flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Menu Catalog</span>
                  <Utensils className="h-4 w-4 text-brand" />
                </div>
                <div className="mt-2 text-2xl font-black">
                  {availableItemsCount} <span className="text-xs text-muted-foreground font-normal">/ {totalItemsCount}</span>
                </div>
                <div className="text-[9px] text-muted-foreground font-semibold mt-1">Active / Total items</div>
              </div>
            </div>

            <div className="rounded-2xl bg-card p-4 shadow-card border border-border">
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand" />
                <span>Recent System Events</span>
              </h2>
              {loadingOrders ? (
                <p className="text-xs text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-3">
                  {orders?.slice(0, 5).map((o) => (
                    <div key={o.id} className="flex justify-between items-start text-xs border-b border-border/40 pb-2 last:border-0 last:pb-0">
                      <div>
                        <span className="font-semibold block">Order #{o.order_number} placed</span>
                        <span className="text-[10px] text-muted-foreground">
                          {o.guest_name ?? "Registered User"} • {o.order_items?.length ?? 0} items
                        </span>
                      </div>
                      <span className="font-bold text-brand">{formatMoney(Number(o.total))}</span>
                    </div>
                  ))}
                  {orders?.length === 0 && (
                    <p className="text-xs text-muted-foreground">No recent events.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold flex items-center justify-between">
              <span>All System Orders</span>
              <span className="text-xs text-muted-foreground font-normal">Count: {orders?.length ?? 0}</span>
            </h2>

            {loadingOrders && <p className="text-center text-xs text-muted-foreground">Loading...</p>}

            {orders?.map((o) => {
              const assignedRiderName = o.delivery_assignments?.delivery_partners?.name;
              return (
                <div key={o.id} className="rounded-2xl bg-card p-4 shadow-card border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-extrabold text-foreground">#{o.order_number}</span>
                      <span className="text-[10px] text-muted-foreground block">
                        {new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[10px] font-bold text-brand capitalize">
                      {o.order_status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">
                      {(o.order_items ?? []).map((i: any) => `${i.quantity}x ${i.name}`).join(", ")}
                    </p>
                    <p>📍 {o.address}</p>
                    {o.guest_name && (
                      <p>👤 {o.guest_name} ({o.guest_phone || "No phone"})</p>
                    )}
                    {assignedRiderName && (
                      <p className="text-brand font-semibold">🚴 Rider: {assignedRiderName}</p>
                    )}
                  </div>

                  <div className="h-px bg-border/50" />

                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <span className="text-sm font-black text-brand">{formatMoney(Number(o.total))}</span>

                    <div className="flex gap-2">
                      <select
                        value={o.order_status}
                        onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                        className="text-[11px] font-semibold border border-border rounded-lg px-2 py-1 bg-background"
                      >
                        <option value="received">Received</option>
                        <option value="preparing">Preparing</option>
                        <option value="packed">Packed</option>
                        <option value="assigned">Assigned</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <button
                        onClick={() => setSelectedOrderId(o.id === selectedOrderId ? null : o.id)}
                        className="text-[11px] font-bold bg-brand text-brand-foreground rounded-lg px-2 py-1 shadow-sm"
                      >
                        {selectedOrderId === o.id ? "Close" : "Rider..."}
                      </button>
                    </div>
                  </div>

                  {/* Assign Rider Dropdown Panel */}
                  {selectedOrderId === o.id && (
                    <div className="mt-3 p-3 bg-muted rounded-xl space-y-2">
                      <label className="text-[10px] font-bold block uppercase tracking-wider text-muted-foreground">
                        Assign Delivery Rider
                      </label>
                      <div className="grid grid-cols-1 gap-1">
                        {riders?.map((rider) => (
                          <button
                            key={rider.id}
                            onClick={() => handleAssignRider(o.id, rider.id)}
                            className="text-left text-xs bg-card hover:bg-brand-soft border border-border p-2 rounded-lg font-medium flex justify-between items-center"
                          >
                            <span>{rider.name}</span>
                            <span className="text-[9px] font-bold bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">
                              {rider.status}
                            </span>
                          </button>
                        ))}
                        {riders?.length === 0 && (
                          <p className="text-xs text-muted-foreground p-2">No riders registered yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {orders?.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-12">No orders in database.</p>
            )}
          </div>
        )}

        {/* Menu/Inventory Tab */}
        {activeTab === "menu" && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold">Menu Inventory List</h2>

            {loadingFood && <p className="text-center text-xs text-muted-foreground">Loading...</p>}

            <div className="space-y-2">
              {foodItems?.map((item) => (
                <div key={item.id} className="rounded-2xl bg-card p-3 shadow-card border border-border flex items-center justify-between gap-3">
                  <img src={item.image ?? ""} alt="" className="h-10 w-10 rounded-lg object-cover bg-muted" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold block truncate">{item.name}</span>
                    {editingItemId === item.id ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-16 border border-border rounded px-1.5 py-0.5 text-xs outline-none bg-background font-bold text-brand"
                          placeholder="Price"
                        />
                        <button
                          onClick={() => handleSavePrice(item.id)}
                          className="bg-brand text-brand-foreground text-[10px] font-bold px-2 py-0.5 rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingItemId(null)}
                          className="bg-muted text-foreground text-[10px] px-1.5 py-0.5 rounded"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => {
                          setEditingItemId(item.id);
                          setEditPrice(item.price.toString());
                        }}
                        className="text-xs font-black text-brand cursor-pointer hover:underline"
                      >
                        {formatMoney(item.price)} ✏️
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleFoodRecommend(item.id, item.is_recommended)}
                      className="flex flex-col items-center gap-0.5"
                    >
                      <span className="text-[8px] font-semibold text-muted-foreground">Recommend</span>
                      {item.is_recommended ? (
                        <ToggleRight className="h-5 w-5 text-brand" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>

                    <button
                      onClick={() => handleToggleFoodAvailable(item.id, item.available)}
                      className="flex flex-col items-center gap-0.5"
                    >
                      <span className="text-[8px] font-semibold text-muted-foreground">Available</span>
                      {item.available ? (
                        <ToggleRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Riders Tab */}
        {activeTab === "riders" && (
          <div className="space-y-4">
            {/* New rider registration */}
            <div className="rounded-2xl bg-card p-4 shadow-card border border-border space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Register New Rider
              </h3>
              <form onSubmit={handleCreateRider} className="space-y-2">
                <input
                  name="name"
                  type="text"
                  placeholder="Rider Full Name"
                  className="w-full text-xs rounded-xl border border-border bg-background p-2.5 outline-none"
                  required
                />
                <input
                  name="phone"
                  type="tel"
                  placeholder="Phone Number (Optional)"
                  className="w-full text-xs rounded-xl border border-border bg-background p-2.5 outline-none"
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-brand py-2 text-xs font-bold text-brand-foreground shadow"
                >
                  Add Rider Partner
                </button>
              </form>
            </div>

            {/* Riders List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                Active Riders
              </h3>
              {loadingRiders && <p className="text-xs text-muted-foreground">Loading...</p>}
              {riders?.map((rider) => (
                <div key={rider.id} className="rounded-2xl bg-card p-3.5 shadow-card border border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block">{rider.name}</span>
                    <span className="text-[10px] text-muted-foreground">📞 {rider.phone ?? "No phone number"}</span>
                  </div>
                  <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-bold uppercase">
                    {rider.status}
                  </span>
                </div>
              ))}
              {riders?.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No riders registered yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

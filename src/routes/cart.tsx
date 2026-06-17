import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Home, Ticket, ArrowRight, X } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { validateCouponServer } from "@/lib/db.functions";
import { placeOrder } from "@/lib/orders.functions";
import { formatMoney, RESTAURANT, deliveryFeeFor } from "@/lib/restaurant.config";
import { QtyStepper } from "@/components/qty-stepper";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — Our Kitchen" }] }),
  component: CartPage,
});

type PaymentMethod = "upi" | "card" | "cod";

function CartPage() {
  const { items, setQty, clear, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>("upi");
  const [address, setAddress] = useState("123, Luxury Heights, Gourmet…");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [showAddressDrawer, setShowAddressDrawer] = useState(false);

  // Load selected location from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("grillgo.selected_location");
      if (saved) {
        try {
          const loc = JSON.parse(saved);
          if (loc && loc.fullAddress) {
            setAddress(loc.fullAddress);
          }
          if (loc && loc.lat && loc.lng) {
            setCoords({ lat: loc.lat, lng: loc.lng });
          }
        } catch (e) {}
      }
      
    }
  }, []);

  const requestLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation not supported by your browser");
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setCoords({ lat: latitude, lng: longitude });
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              setAddress(data.display_name);
              toast.success("Live address resolved!");
            } else {
              setAddress(`📍 GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            }
          } else {
            setAddress(`📍 GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        } catch (err) {
          console.warn("Reverse geocoding error:", err);
          setAddress(`📍 GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
        setLocLoading(false);
        toast.success("Live location captured successfully!");
      },
      (err) => {
        setLocLoading(false);
        console.warn("Location error:", err);
        // Provide mock coordinates if permission denied so they can still test
        setCoords({ lat: 12.9716, lng: 77.5946 });
        setAddress("MG Road, Bengaluru, Karnataka, India");
        toast.success("Using default GPS coordinates (Demo Mode)");
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };


  const deliveryFee = deliveryFeeFor(null);
  const taxes = Math.round(subtotal * RESTAURANT.taxRate);
  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal + deliveryFee + taxes - discount);

  const validateCouponFn = useServerFn(validateCouponServer);
  const applyCoupon = async () => {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    const data = await validateCouponFn({ data: { code } });
    if (!data) return toast.error("Invalid coupon");
    if (Number(data.min_order_amount) > subtotal)
      return toast.error(`Minimum order ${formatMoney(Number(data.min_order_amount))}`);
    const d =
      data.type === "flat"
        ? Number(data.value)
        : Math.min((subtotal * Number(data.value)) / 100, Number(data.max_discount ?? 9999));
    setAppliedCoupon({ code: data.code, discount: Math.round(d) });
    toast.success(`${data.code} applied`);
  };

  const placeOrderFn = useServerFn(placeOrder);
  const submit = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error("Cart is empty");
      if (!address.trim()) throw new Error("Add delivery address");
      if (!user && (!guestName.trim() || !guestPhone.trim()))
        throw new Error("Add name & phone for guest checkout");
      return placeOrderFn({
        data: {
          user_id: user?.id ?? null,
          guest_name: user ? null : guestName,
          guest_phone: user ? null : guestPhone,
          address,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          notes: null,
          payment_method: payment,
          coupon_code: appliedCoupon?.code ?? null,
          items: items.map((i) => ({ 
            food_id: i.food_id, 
            quantity: i.quantity,
            price: i.price,
            name: i.name,
            image: i.image,
            notes: i.notes ?? null
          })),
        },
      });

    },
    onSuccess: (res) => {
      clear();
      toast.success("Order placed!");
      if (!user) {
        try {
          const raw = localStorage.getItem("grillgo.guest_orders");
          const list = raw ? JSON.parse(raw) : [];
          list.push(res.id);
          localStorage.setItem("grillgo.guest_orders", JSON.stringify(list));
        } catch (e) {
          console.error("Error saving guest order to localStorage:", e);
        }
      }
      navigate({ to: "/orders/$id", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold">Your cart is empty</h1>
        <p className="text-sm text-muted-foreground">Browse the menu to add items.</p>
        <Link to="/" className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground">
          Browse menu
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-44">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background px-5 pt-6 pb-3">
        <Link to="/" aria-label="Back"><ArrowLeft className="h-5 w-5 text-brand" /></Link>
        <h1 className="text-base font-semibold text-brand">My Cart</h1>
        <button onClick={clear} className="text-sm font-semibold text-brand">Clear All</button>
      </header>

      {/* Address card */}
      <section className="px-5">
        <div className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Home className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-semibold tracking-wider text-muted-foreground">DELIVERY TO</div>
              <div className="text-sm font-medium line-clamp-1">{address}</div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddressDrawer(true)}
              className="text-sm font-semibold text-brand"
            >
              Edit
            </button>
          </div>

          <div className="h-px bg-border/50 my-1" />

          <button
            type="button"
            onClick={requestLocation}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
              coords
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-brand-soft text-brand border-brand/20 hover:bg-brand/10"
            }`}
          >
            <span>📍</span>
            <span>
              {locLoading
                ? "Accessing GPS..."
                : coords
                ? `Live GPS coordinates linked (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
                : "Share Live GPS location for delivery boy tracking"}
            </span>
          </button>
        </div>
      </section>


      <h2 className="mt-6 px-5 text-lg font-bold">Order Summary</h2>
      <div className="mt-3 space-y-3 px-5">
        {items.map((i) => (
          <div key={i.food_id} className="flex gap-3 rounded-2xl bg-card p-3 shadow-card">
            <img src={i.image ?? ""} alt={i.name} className="h-20 w-20 rounded-xl object-cover" />
            <div className="flex-1">
              <div className="font-semibold leading-tight">{i.name}</div>
              <div className="mt-1 flex items-end justify-between">
                <div className="font-bold text-brand">{formatMoney(i.price * i.quantity)}</div>
                <QtyStepper value={i.quantity} onChange={(v) => setQty(i.food_id, v)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Coupon */}
      <section className="mt-5 px-5">
        {appliedCoupon ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-brand bg-brand-soft p-4">
            <Ticket className="h-5 w-5 text-brand" />
            <div className="flex-1">
              <div className="font-semibold text-brand">{appliedCoupon.code} Applied</div>
              <div className="text-xs text-foreground/80">You saved {formatMoney(appliedCoupon.discount)} on this order</div>
            </div>
            <button
              onClick={() => setAppliedCoupon(null)}
              className="rounded-full bg-card px-3 py-1.5 text-sm font-semibold"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Coupon code (e.g. WELCOME50)"
              className="flex-1 rounded-2xl bg-muted px-4 py-3 text-sm outline-none"
            />
            <button onClick={applyCoupon} className="rounded-2xl bg-brand px-4 text-sm font-semibold text-brand-foreground">
              Apply
            </button>
          </div>
        )}
      </section>

      {/* Payment */}
      <h2 className="mt-7 px-5 text-lg font-bold">Payment Method</h2>
      <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar px-5 pb-1">
        <PayBox label="UPI / GPay" active={payment === "upi"} onClick={() => setPayment("upi")} />
        <PayBox label="Card" active={payment === "card"} onClick={() => setPayment("card")} />
        <PayBox label="Cash" active={payment === "cod"} onClick={() => setPayment("cod")} />
      </div>

      {/* Guest fields */}
      {!user && (
        <section className="mt-5 space-y-2 px-5">
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-2xl bg-muted px-4 py-3 text-sm outline-none"
          />
          <input
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            placeholder="Phone number"
            className="w-full rounded-2xl bg-muted px-4 py-3 text-sm outline-none"
          />
          <Link to="/auth" className="text-xs text-brand">Sign in for faster checkout →</Link>
        </section>
      )}

      {/* Totals */}
      <section className="mt-6 mx-5 rounded-2xl bg-card p-5 shadow-card text-sm">
        <Row label="Item Total" value={formatMoney(subtotal)} />
        <Row label="Delivery Fee" value={formatMoney(deliveryFee)} />
        <Row label="Taxes & Charges" value={formatMoney(taxes)} />
        {appliedCoupon && (
          <Row label={`Discount (${appliedCoupon.code})`} value={`- ${formatMoney(discount)}`} highlight />
        )}
        <div className="my-3 h-px bg-border" />
        <Row label="Grand Total" value={formatMoney(total)} bold />
      </section>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-border bg-card">
        <div className="flex items-center justify-between px-5 pt-3">
          <div>
            <div className="text-xs text-muted-foreground">TO PAY</div>
            <div className="text-lg font-bold">{formatMoney(total)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-brand">Estimated Delivery</div>
            <div className="text-sm font-semibold">25 - 30 Mins</div>
          </div>
        </div>
        <div className="p-4">
          <button
            disabled={submit.isPending}
            onClick={() => submit.mutate()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-sm font-semibold text-brand-foreground disabled:opacity-60"
          >
            {submit.isPending ? "Placing…" : "Proceed to Payment"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* --- SELECT ADDRESS DRAWER --- */}
      {showAddressDrawer && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 z-40 max-w-[28rem] mx-auto transition-opacity animate-in fade-in duration-200"
            onClick={() => setShowAddressDrawer(false)}
          />
          
          {/* Drawer Container */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#121214] text-white rounded-t-[2.5rem] border-t border-[#1E1E22] shadow-2xl px-5 pt-6 pb-8 max-w-[28rem] mx-auto overflow-y-auto max-h-[85vh] transition-transform animate-in slide-in-from-bottom duration-300 no-scrollbar">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1E1E22]">
              <span className="font-bold text-lg text-white">Select Delivery Address</span>
              <button 
                type="button"
                onClick={() => setShowAddressDrawer(false)}
                className="p-1 rounded-full hover:bg-[#1E1E22] transition-colors"
              >
                <X className="h-5 w-5 text-[#A1A1AA]" />
              </button>
            </div>

            {/* Custom Input Field */}
            <div className="mt-4 space-y-2 text-left">
              <label className="block text-[11px] font-bold text-[#A1A1AA] uppercase">Or enter address manually</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter flat/house no, street, locality..."
                className="w-full bg-[#1E1E22] border border-[#2E2E33] rounded-2xl p-4 text-sm text-white placeholder-[#7E6C57] focus:outline-none focus:border-[#7F011F]/50 transition-colors resize-none h-24 font-medium leading-relaxed"
              />
            </div>

            {/* Quick GPS button inside drawer */}
            <button
              type="button"
              onClick={() => {
                requestLocation();
              }}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-bold border bg-[#EA4335]/10 text-[#EA4335] border-[#EA4335]/20 hover:bg-[#EA4335]/20 transition-all"
            >
              <span>📍</span>
              <span>{locLoading ? "Accessing GPS..." : "Detect & use current location via GPS"}</span>
            </button>



            {/* Confirm button */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!address.trim()) {
                    toast.error("Please enter an address");
                    return;
                  }
                  // Save back to local storage selected location as custom
                  localStorage.setItem("grillgo.selected_location", JSON.stringify({
                    title: address.split(",")[0] || "Custom Location",
                    address: address,
                    fullAddress: address,
                    lat: coords?.lat || 9.6824,
                    lng: coords?.lng || 76.9083
                  }));
                  setShowAddressDrawer(false);
                  toast.success("Delivery address updated!");
                }}
                className="w-full py-4 text-sm font-bold bg-[#7F011F] text-white rounded-2xl hover:bg-[#630016] transition-colors shadow-lg"
              >
                Confirm Address
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${bold ? "font-bold" : ""} ${highlight ? "text-brand font-semibold" : ""}`}>
      <span className={highlight ? "" : "text-muted-foreground"}>{label}</span>
      <span className={bold || highlight ? "text-brand" : ""}>{value}</span>
    </div>
  );
}

function PayBox({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-24 w-28 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 text-sm font-semibold ${
        active ? "border-brand bg-brand-soft text-brand" : "border-border bg-card"
      }`}
    >
      <span className="text-xs uppercase tracking-wider">{label}</span>
      {active && <X className="h-4 w-4 rotate-45 opacity-0" />}
    </button>
  );
}

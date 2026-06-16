import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Heart, LogOut, MapPin, User as UserIcon, ShieldAlert, Sparkles, ShoppingBag, CreditCard, ChevronDown, Check, Copy } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getFavoritesServer, getUserOrders } from "@/lib/db.functions";
import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "@/components/bottom-nav";
import { formatMoney } from "@/lib/restaurant.config";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Our Kitchen" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut, loading } = useAuth();
  
  // States for interactive features
  const [demoRole, setDemoRole] = useState<string>("customer");
  const [demoUnlocked, setDemoUnlocked] = useState<boolean>(false);
  const [avatarTaps, setAvatarTaps] = useState<number>(0);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Custom user settings saved locally
  const [primaryAddress, setPrimaryAddress] = useState<string>("123, Luxury Heights, Gourmet Street");
  const [phone, setPhone] = useState<string>("+91 9876543210");

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load saved settings
      const savedRole = localStorage.getItem("grillgo_demo_role") || "customer";
      setDemoRole(savedRole);
      
      const savedAddress = localStorage.getItem("grillgo_user_address");
      if (savedAddress) setPrimaryAddress(savedAddress);
      
      const savedPhone = localStorage.getItem("grillgo_user_phone");
      if (savedPhone) setPhone(savedPhone);

      const savedDevMode = localStorage.getItem("grillgo_dev_mode") === "true";
      setDemoUnlocked(savedDevMode);
    }
  }, []);

  // Server functions
  const getFavoritesFn = useServerFn(getFavoritesServer);
  const getUserOrdersFn = useServerFn(getUserOrders);

  // Fetch real order history statistics
  const { data: orders = [] } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: () => getUserOrdersFn({ data: user!.id }),
  });

  // Fetch user favorites list
  const { data: favs } = useQuery({
    queryKey: ["favs", user?.id],
    enabled: !!user,
    queryFn: () => getFavoritesFn({ data: user!.id }),
  });

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <UserIcon className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Sign in to manage your profile.</p>
          <Link to="/auth" className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground">
            Sign in
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Auto-unlock demo portals for special/development email formats
  const isSpecialEmail = 
    user.email.includes("admin") || 
    user.email.includes("kitchen") || 
    user.email.includes("rider") || 
    user.email.includes("demo") || 
    user.email.includes("aebelantosh"); // auto-unlocked for active reviewer's email

  const showDemoOptions = demoUnlocked || isSpecialEmail;

  // Handle avatar clicks to unlock developer portals
  const handleAvatarClick = () => {
    const nextTaps = avatarTaps + 1;
    setAvatarTaps(nextTaps);
    
    if (nextTaps >= 5) {
      const targetState = !demoUnlocked;
      setDemoUnlocked(targetState);
      localStorage.setItem("grillgo_dev_mode", String(targetState));
      setAvatarTaps(0);
      if (targetState) {
        toast.success("🛠️ Developer Demo Portals unlocked!");
      } else {
        toast.info("🔒 Developer Demo Portals locked.");
      }
    } else {
      const remaining = 5 - nextTaps;
      toast.info(`Tap ${remaining} more time${remaining > 1 ? "s" : ""} to ${demoUnlocked ? "lock" : "unlock"} Demo Portals!`);
    }
  };

  // Helper to copy text to clipboard
  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Coupon code ${code} copied to clipboard!`);
  };

  // Calculate stats
  const totalOrdersCount = orders.length;
  const totalSpentAmount = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const profileName = user.user_metadata.name || user.email.split("@")[0];

  // Demo Coupons list
  const coupons = [
    { code: "WELCOME50", desc: "50% off up to ₹100 on first order", min: "₹100 min order" },
    { code: "GRILL100", desc: "Flat ₹100 off on gourmet items", min: "₹500 min order" },
  ];

  // FAQs list
  const faqs = [
    { q: "How do I track my live order?", a: "Once placed, go to the 'My Orders' page and click on your active order. It will open the real-time tracking map and share your GPS location with the delivery rider." },
    { q: "How are foods prepared and packed?", a: "Our kitchen dashboard handles preparation. Once the chefs mark a ticket 'Packed & Ready', a delivery rider automatically claims the ticket and heads to your location." },
    { q: "Can I cancel my order?", a: "You can request cancellations on the tracking screen or direct phone support before the kitchen starts preparing the meal." },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F5EBD0] pb-28">
      {/* Header section */}
      <header className="bg-[#7F011F] text-[#F5EBD0] px-5 pt-8 pb-7 rounded-b-[2rem] shadow-soft">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleAvatarClick}
            className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white/40 bg-[#F5EBD0] hover:scale-105 transition-transform"
            title="Tap 5 times to toggle Demo Portals"
          >
            <img
              src={`https://api.dicebear.com/9.x/initials/svg?seed=${profileName}`}
              alt="Avatar"
              className="h-full w-full"
            />
            {showDemoOptions && (
              <span className="absolute bottom-0 right-0 bg-[#EA580C] text-white p-0.5 rounded-full text-[8px]" title="Demo Mode Active">
                🛠️
              </span>
            )}
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-white leading-tight capitalize">{profileName}</h1>
            <p className="text-xs text-[#F5EBD0]/80 mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Stats segment */}
        <div className="mt-6 grid grid-cols-3 gap-3 bg-white/10 rounded-2xl p-3 border border-white/5 text-center">
          <div>
            <span className="text-[10px] font-bold text-white/70 block uppercase tracking-wider">Orders</span>
            <span className="text-lg font-black text-white mt-0.5 block">{totalOrdersCount}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-white/70 block uppercase tracking-wider">Spent</span>
            <span className="text-lg font-black text-white mt-0.5 block truncate">{formatMoney(totalSpentAmount)}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-white/70 block uppercase tracking-wider">Favorites</span>
            <span className="text-lg font-black text-white mt-0.5 block">{favs?.length ?? 0}</span>
          </div>
        </div>
      </header>

      {/* Primary Actions */}
      <section className="mt-5 px-5">
        <Link to="/orders" className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-card hover:translate-x-0.5 transition-transform">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
            <span className="font-bold text-[#2E251B] text-sm">Order History</span>
          </div>
          <span className="text-xs font-semibold text-brand">View All &gt;</span>
        </Link>
      </section>

      {/* Address and Info Editor Settings */}
      <section className="mt-4 px-5">
        <div className="rounded-2xl bg-card p-5 shadow-card space-y-4">
          <h2 className="text-sm font-extrabold text-[#2E251B] uppercase tracking-wider">Delivery Settings</h2>
          
          <div className="space-y-3.5">
            <div className="flex items-start justify-between gap-3 text-xs">
              <div className="flex-1">
                <span className="font-bold text-muted-foreground block">Primary Delivery Address</span>
                <span className="font-medium text-[#2E251B] block mt-1 line-clamp-1">{primaryAddress}</span>
              </div>
              <button
                onClick={() => {
                  const addr = prompt("Enter primary address:", primaryAddress);
                  if (addr !== null) {
                    setPrimaryAddress(addr);
                    localStorage.setItem("grillgo_user_address", addr);
                    toast.success("Primary address saved!");
                  }
                }}
                className="text-xs font-bold text-brand hover:underline"
              >
                Edit
              </button>
            </div>

            <div className="h-px bg-border/50" />

            <div className="flex items-start justify-between gap-3 text-xs">
              <div className="flex-1">
                <span className="font-bold text-muted-foreground block">Phone Contact</span>
                <span className="font-medium text-[#2E251B] block mt-1">{phone}</span>
              </div>
              <button
                onClick={() => {
                  const ph = prompt("Enter contact phone:", phone);
                  if (ph !== null) {
                    setPhone(ph);
                    localStorage.setItem("grillgo_user_phone", ph);
                    toast.success("Phone contact updated!");
                  }
                }}
                className="text-xs font-bold text-brand hover:underline"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Coupons/Voucher Center */}
      <section className="mt-5 px-5">
        <h2 className="text-sm font-extrabold text-[#2E251B] uppercase tracking-wider">Voucher Center</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {coupons.map((c) => (
            <div key={c.code} className="w-56 shrink-0 rounded-2xl bg-card border border-dashed border-brand/40 p-4 shadow-card flex flex-col justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold text-brand bg-brand-soft px-2.5 py-0.5 rounded-full inline-block">
                  {c.code}
                </span>
                <p className="text-[11px] font-semibold text-[#4E3D30] mt-2 leading-snug">{c.desc}</p>
              </div>
              <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-border/40">
                <span className="text-[9px] font-bold text-muted-foreground">{c.min}</span>
                <button
                  onClick={() => handleCopyCoupon(c.code)}
                  className="flex items-center gap-1 text-[10px] font-bold text-brand hover:opacity-85"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Demo Roles & Portals - RESTRICTED SECTION */}
      {showDemoOptions ? (
        <section className="mt-5 px-5">
          <div className="rounded-2xl bg-[#EA580C]/5 border border-[#EA580C]/25 p-4 shadow-card space-y-4">
            <div className="flex items-center justify-between text-[#EA580C] font-extrabold text-sm">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="h-4.5 w-4.5" />
                <span>Portals & Demo Roles</span>
              </div>
              <span className="text-[9px] bg-[#EA580C]/10 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">
                Simulated
              </span>
            </div>

            <div>
              <label className="text-[9px] font-extrabold text-muted-foreground block mb-2 uppercase tracking-wider">
                Switch Identity
              </label>
              <div className="grid grid-cols-4 gap-1 p-0.5 bg-muted rounded-xl">
                {(["customer", "admin", "kitchen", "rider"] as const).map((r) => {
                  const active = demoRole === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setDemoRole(r);
                        localStorage.setItem("grillgo_demo_role", r);
                        toast.success(`Role switched to ${r}`);
                      }}
                      className={`py-1.5 text-[9px] font-black rounded-lg capitalize transition-all ${
                        active ? "bg-[#EA580C] text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-border/50" />

            <div className="grid grid-cols-3 gap-2">
              <Link to="/admin" className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-border bg-card hover:bg-orange-50/50 hover:border-orange-200 transition-all">
                <span className="text-xl">🛠️</span>
                <span className="text-[10px] font-extrabold mt-0.5 text-foreground">Admin Portal</span>
              </Link>
              <Link to="/kitchen" className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-border bg-card hover:bg-orange-50/50 hover:border-orange-200 transition-all">
                <span className="text-xl">🍳</span>
                <span className="text-[10px] font-extrabold mt-0.5 text-foreground">Kitchen Panel</span>
              </Link>
              <Link to="/delivery" className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-border bg-card hover:bg-orange-50/50 hover:border-orange-200 transition-all">
                <span className="text-xl">🚴</span>
                <span className="text-[10px] font-extrabold mt-0.5 text-foreground">Rider Hub</span>
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <div className="mt-4 text-center">
          <p className="text-[10px] text-muted-foreground/60 italic">
            * Developer options: Tap profile avatar 5 times to unlock Demo Portals.
          </p>
        </div>
      )}

      {/* Favorites Grid */}
      <section className="mt-5 px-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#2E251B] uppercase tracking-wider">Favorites</h2>
          <Heart className="h-4 w-4 text-brand fill-brand" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {favs?.map((f: any) =>
            f.food_items ? (
              <Link
                key={f.food_id}
                to="/food/$id"
                params={{ id: f.food_items.id }}
                className="overflow-hidden rounded-2xl bg-card shadow-card hover:scale-[1.01] transition-transform"
              >
                <img src={f.food_items.image ?? ""} alt={f.food_items.name} className="h-28 w-full object-cover" />
                <div className="p-3">
                  <div className="text-xs font-bold text-[#2E251B] line-clamp-1">{f.food_items.name}</div>
                  <div className="text-xs font-black text-brand mt-1">{formatMoney(Number(f.food_items.price))}</div>
                </div>
              </Link>
            ) : null,
          )}
          {favs && favs.length === 0 && (
            <div className="col-span-2 py-8 text-center rounded-2xl border border-dashed border-border bg-card text-xs text-muted-foreground">
              No favorites saved yet.
            </div>
          )}
        </div>
      </section>

      {/* Help & Support accordion */}
      <section className="mt-5 px-5">
        <h2 className="text-sm font-extrabold text-[#2E251B] uppercase tracking-wider">Help & Support</h2>
        <div className="mt-3 space-y-2">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div key={index} className="rounded-xl bg-card overflow-hidden shadow-card transition-all">
                <button
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none"
                >
                  <span className="text-xs font-bold text-[#4E3D30]">{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 text-xs text-[#6E5A4B] leading-relaxed border-t border-border/30 pt-2 bg-muted/20">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Sign Out */}
      <div className="px-5 mt-6">
        <button
          onClick={() => {
            signOut();
            toast.success("Signed out successfully");
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-xs font-bold text-brand hover:bg-brand/5 shadow-card transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
      
      <BottomNav />
    </div>
  );
}

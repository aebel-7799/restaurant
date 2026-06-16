import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, Search as SearchIcon, Star, Plus, ShoppingBag, Heart } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getFoodItems } from "@/lib/db.functions";
import { BottomNav } from "@/components/bottom-nav";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { useCart } from "@/hooks/use-cart";
import { formatMoney } from "@/lib/restaurant.config";
import { toast } from "sonner";
import { MOCK_CATEGORIES } from "@/lib/mock-food";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Our Kitchen — Order food in" },
      { name: "description", content: "Signature burgers, pizza & desserts delivered hot in 25–30 minutes." },
      { property: "og:title", content: "Our Kitchen — Order food in" },
      { property: "og:description", content: "Signature burgers, pizza & desserts delivered hot." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [category, setCategory] = useState<string | null>(null);
  const { add, count } = useCart();

  const getFoodItemsFn = useServerFn(getFoodItems);

  const { data: foodItems = [] } = useQuery({
    queryKey: ["foodItems"],
    queryFn: async () => {
      const res = await getFoodItemsFn({ data: "all" });
      if (res && typeof res === "object" && "error" in res) {
        toast.error(`Database Error: ${(res as any).error}`, { duration: 10000 });
        return [];
      }
      return (res || []) as any[];
    },
  });

  const categories = MOCK_CATEGORIES;

  const popular = foodItems.filter((f) => {
    if (category && f.category_id !== category) return false;
    return true;
  });

  const recommended = foodItems.filter((f) => f.is_recommended);

  const displayCategories = [
    { id: null, name: "Meal" }, // "All" maps to "Meal" to keep the mockup's visual style
    ...MOCK_CATEGORIES
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F5EBD0] pb-6">
      {/* Header with Curved Bottom */}
      <header className="bg-[#7F011F] text-[#F5EBD0] px-5 pt-7 pb-8 rounded-b-[2.5rem] shadow-soft">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1 text-[11px] font-bold tracking-wider opacity-85">
              <MapPin className="h-3.5 w-3.5" />
              DELIVER TO
            </div>
            <div className="mt-0.5 font-extrabold text-sm text-white">Home · 123 Street</div>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              to="/cart" 
              aria-label="Cart" 
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#EA580C] px-1 text-[9px] font-bold text-white shadow-sm">
                  {count}
                </span>
              )}
            </Link>
            <Link to="/profile" className="h-9 w-9 overflow-hidden rounded-full border-2 border-white/40 shadow-sm">
              <img
                src="https://api.dicebear.com/9.x/initials/svg?seed=Me"
                alt="Profile"
                className="h-full w-full"
              />
            </Link>
          </div>
        </div>

        {/* Welcome Text */}
        <div className="mt-5">
          <h1 className="text-2xl font-extrabold text-white leading-tight">Good Morning</h1>
          <p className="text-xs font-semibold text-[#F5EBD0]/80 mt-0.5">Rise And Shine! It's Breakfast Time</p>
        </div>

        {/* Search & Filter */}
        <div className="mt-5 flex gap-2">
          <Link
            to="/search"
            className="flex-1 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm hover:bg-white/95 transition-all"
          >
            <SearchIcon className="h-4.5 w-4.5 text-[#7F011F]" />
            <span className="text-xs font-medium text-[#8B7A6C]">Search dishes, snacks, burgers...</span>
          </Link>
          <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#7F011F] text-[#F5EBD0] shadow-sm hover:bg-[#630016] transition-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Categories Section with Circular Outlined Icons */}
      <section className="mt-6">
        <h3 className="px-5 text-sm font-extrabold text-[#2E251B]">Categories</h3>
        <div className="mt-3 flex gap-4 overflow-x-auto no-scrollbar px-5 pb-2">
          {displayCategories.map((c) => (
            <CategoryCircle
              key={c.name}
              label={c.name}
              active={category === c.id}
              onClick={() => {
                setCategory(c.id);
                if (c.isStatic) {
                  toast.info(`${c.name} category is coming soon!`);
                }
              }}
            />
          ))}
        </div>
      </section>

      {/* Best Seller Section (Horizontal Scroll) */}
      <section className="mt-6">
        <div className="flex items-baseline justify-between px-5">
          <h3 className="text-sm font-extrabold text-[#2E251B]">Best Seller</h3>
          <Link to="/search" className="text-xs font-bold text-[#7F011F] hover:underline">View All &gt;</Link>
        </div>
        <div className="mt-3 flex gap-4 overflow-x-auto no-scrollbar px-5 pb-2">
          {recommended?.map((f) => (
            <Link
              key={f.id}
              to="/food/$id"
              params={{ id: f.id }}
              className="w-36 shrink-0 overflow-hidden rounded-3xl bg-card shadow-card hover:scale-[1.02] transition-transform"
            >
              <div className="relative h-28 w-full bg-muted">
                <img src={f.image ?? ""} alt={f.name} className="h-full w-full object-cover" />
                <span className="absolute bottom-2 right-2 rounded-full bg-[#7F011F] px-2.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                  {formatMoney(Number(f.price))}
                </span>
              </div>
              <div className="p-3">
                <div className="text-xs font-bold leading-tight text-[#2E251B] line-clamp-1">{f.name}</div>
                <div className="mt-0.5 text-[9px] text-muted-foreground">{f.restaurant_name}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Special Offer Banner */}
      <section className="mt-6 px-5">
        <div className="flex overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#9C1331] to-[#7F011F] shadow-soft text-white relative">
          <div className="flex-1 p-6 z-10">
            <p className="text-xs font-semibold tracking-wide text-white/90">Experience our</p>
            <p className="text-xs font-semibold tracking-wide text-white/90">delicious new dish</p>
            <h2 className="mt-1.5 text-3xl font-extrabold leading-tight tracking-tight">
              30% OFF
            </h2>
          </div>
          <div className="relative w-36 h-28 self-center overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400"
              alt="Pizza Offer"
              className="absolute -right-2 top-1/2 -translate-y-1/2 h-36 w-36 object-cover rounded-full border-4 border-white/20 shadow-md transform rotate-12"
            />
          </div>
        </div>
      </section>

      {/* Recommend Section (2-Column Grid) */}
      <section className="mt-6 px-5 pb-24">
        <h3 className="text-sm font-extrabold text-[#2E251B]">Recommend</h3>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {popular?.map((f) => (
            <div key={f.id} className="relative overflow-hidden rounded-3xl bg-card shadow-card hover:scale-[1.01] transition-transform">
              <Link to="/food/$id" params={{ id: f.id }} className="block">
                <div className="relative h-36 w-full bg-muted">
                  <img src={f.image ?? ""} alt={f.name} className="h-full w-full object-cover" />
                  
                  {/* Rating Badge */}
                  <span className="absolute left-3 top-3 inline-flex items-center gap-0.5 rounded-full bg-white/90 backdrop-blur-xs px-2 py-0.5 text-[9px] font-extrabold text-[#2E251B] shadow-sm">
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    {Number(f.rating).toFixed(1)}
                  </span>
                  
                  {/* Heart Icon */}
                  <button className="absolute right-3 top-3 flex h-6.5 w-6.5 items-center justify-center rounded-full bg-white/95 backdrop-blur-xs text-[#7F011F] shadow-sm hover:bg-white transition-colors">
                    <Heart className="h-3.5 w-3.5 fill-[#7F011F]" />
                  </button>

                  {/* Price Tag in Bottom Right */}
                  <span className="absolute right-3 bottom-3 rounded-full bg-[#7F011F] px-2.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                    {formatMoney(Number(f.price))}
                  </span>
                </div>
              </Link>
              <div className="p-3">
                <div className="font-bold text-xs text-[#2E251B] line-clamp-1">{f.name}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">{f.restaurant_name}</span>
                  <button
                    onClick={() => {
                      add({ food_id: f.id, name: f.name, image: f.image, price: Number(f.price) });
                      toast.success(`${f.name} added to cart`);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#7F011F] text-white hover:bg-[#630016] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {popular && popular.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">No items in this category.</p>
        )}
      </section>

      <WhatsAppFab />
      <BottomNav />
    </div>
  );
}

function CategoryIcon({ name, className = "h-7 w-7" }: { name: string; className?: string }) {
  const n = name.toLowerCase();
  if (n === "mandi") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 10h16M3 10c0 5 4 8 9 8s9-3 9-8" />
        <path d="M12 6V3M9 6v4M15 6v4" />
        <path d="M2 9c.5-2 2-3 4-3h12c2 0 3.5 1 4 3" />
      </svg>
    );
  }
  if (n === "al faham" || n === "alfaham") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2c1 2 3 3.5 3 5.5a3 3 0 01-6 0c0-2 2-3.5 3-5.5z" />
        <path d="M5 12h14M3 16h18M6 20h12" />
        <path d="M7 12v8M12 12v8M17 12v8" />
      </svg>
    );
  }
  if (n === "shawarma") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M7 3h10v3H7zM9 6h6v12l-3 3-3-3zM8 9h8M8 12h8M9 15h6" />
      </svg>
    );
  }
  if (n === "burgers" || n === "burger") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 11c0-4.5 4-7 9-7s9 2.5 9 7" />
        <path d="M2 11.5h20" />
        <path d="M3 14h18" />
        <path d="M4 14c0 3 3.5 4.5 8 4.5s8-1.5 8-4.5" />
        <circle cx="7" cy="7" r="0.5" fill="currentColor" />
        <circle cx="11" cy="6" r="0.5" fill="currentColor" />
        <circle cx="15" cy="7" r="0.5" fill="currentColor" />
      </svg>
    );
  }
  if (n === "pizza") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M15 11l-5 5" />
        <path d="M19 12c0-3.8-3-7-7-7-2 0-3.9.8-5.2 2.2L19 19c.7-1.3 1-2.8 1-4.2z" />
        <path d="M4.5 7.2L12 20c.5 0 1-.2 1.4-.5L4.5 7.2z" />
        <circle cx="11" cy="10" r="1.2" fill="currentColor" />
        <circle cx="14" cy="14" r="1.2" fill="currentColor" />
        <circle cx="8" cy="14" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  if (n === "sandwiches" || n === "sandwich" || n === "snacks" || n === "snack") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 11c0 5 4 8 9 8s9-3 9-8" />
        <path d="M2 11h20" />
        <path d="M6 8c.5-1 1.5-2 3-1.5s2 1.5 2 3" />
        <path d="M12 7c.5-1.5 2-2 3.5-1s1.5 2 1.5 3" />
        <path d="M9 10c0-1.5 1-2.5 2.5-2.5s2 1 2 2.5" />
      </svg>
    );
  }
  if (n === "desserts" || n === "dessert") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 12h14l-2 9H7l-2-9z" />
        <path d="M5 12c-1.5-1.5-1-4 1-4.5s3 0 3 2.5c0-2.5 2-3.5 4-3s3 2 3 5" />
        <path d="M16 12c2.5-1 3-3.5 1.5-5s-3 .5-3.5 3" />
        <circle cx="12" cy="4.5" r="1.5" fill="currentColor" />
        <path d="M13.5 4.5c.5-1.5 2-2 3.5-1" />
      </svg>
    );
  }
  if (n === "drinks" || n === "drink") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M6 8h12l-1.5 13h-9L6 8z" />
        <path d="M5 8h14" />
        <path d="M7 8c0-1.5 2-2 5-2s5 .5 5 2" />
        <path d="M12 6l2-4h3" />
      </svg>
    );
  }
  if (n === "juices" || n === "juice") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M6 9h12v11a2 2 0 01-2 2H8a2 2 0 01-2-2V9zM5 9h14M10 9V5M9 5h6" />
        <circle cx="12" cy="15" r="2" />
      </svg>
    );
  }
  if (n === "shakes" || n === "shake") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M7 8h10l-1.5 10c-.5 2-2 3-3.5 3s-3-1-3.5-3L7 8z" />
        <path d="M12 8c0-2 1.5-3 3-3M6 8c0-3 3-4 6-4s6 1 6 4" />
        <path d="M14 5l3-3" />
      </svg>
    );
  }
  if (n === "hot" || n === "tea" || n === "coffee") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M17 8h1a4 4 0 110 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8zM6 2v3M10 2v3M14 2v3" />
      </svg>
    );
  }
  if (n === "lime" || n === "lemon") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5" />
      </svg>
    );
  }
  if (n === "mojitos" || n === "mojito") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 3h14v16a2 2 0 01-2 2H7a2 2 0 01-2-2V3zM15 3l-1.5 5" />
        <path d="M8 8h8M5 13h14" />
        <circle cx="12" cy="10" r="1" fill="currentColor" />
        <circle cx="10" cy="15" r="1.5" />
      </svg>
    );
  }
  if (n === "vegan") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 21V10" />
        <path d="M12 10C8.5 10 7 7 9 4.5s5-1 5 1.5c1-1.5 3-1.5 4 .5s0 3.5-2 3.5" />
        <path d="M12 13c-2-1-3-3-2-5.5s3.5-1.5 4 1" />
      </svg>
    );
  }
  // Default "Meal" / Fork & Knife
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3v8a1 1 0 001 1h3a1 1 0 001-1V3" />
      <path d="M8 3v4" />
      <path d="M8.5 12v9" />
      <path d="M16 3v10c0 .5-.2 1-.5 1.5L14 18.5V21" />
      <path d="M16 3c-1.5 1-2 4-2 7h2" />
    </svg>
  );
}

function CategoryCircle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 focus:outline-none"
    >
      <div
        className={`flex h-15 w-15 items-center justify-center rounded-full border-2 transition-all ${
          active
            ? "border-[#7F011F] bg-[#FCE6E9] text-[#7F011F] scale-105 shadow-sm"
            : "border-[#E5D5B8] bg-white text-[#7F011F]/80 hover:border-[#7F011F]/40"
        }`}
      >
        <CategoryIcon name={label} className="h-6 w-6" />
      </div>
      <span
        className={`text-[10px] font-bold tracking-wide ${
          active ? "text-[#7F011F]" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

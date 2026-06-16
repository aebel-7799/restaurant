import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Search as SearchIcon, Plus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getFoodItems } from "@/lib/db.functions";
import { BottomNav } from "@/components/bottom-nav";
import { useCart } from "@/hooks/use-cart";
import { formatMoney } from "@/lib/restaurant.config";
import { toast } from "sonner";
import { MOCK_CATEGORIES } from "@/lib/mock-food";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search — Our Kitchen" }] }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const { add } = useCart();

  const getFoodItemsFn = useServerFn(getFoodItems);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => MOCK_CATEGORIES,
  });

  const { data: foodItems = [] } = useQuery({
    queryKey: ["foodItems"],
    queryFn: () => getFoodItemsFn({ data: "all" }),
  });

  const results = foodItems.filter((f) => {
    if (q.trim() && !f.name.toLowerCase().includes(q.trim().toLowerCase())) return false;
    if (cat && f.category_id !== cat) return false;
    return f.available;
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background px-5 pt-6 pb-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="rounded-full p-1"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex flex-1 items-center gap-3 rounded-2xl bg-muted px-4 py-3">
            <SearchIcon className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search dishes, burgers..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          <Chip label="All" active={cat === null} onClick={() => setCat(null)} />
          {categories?.map((c) => (
            <Chip key={c.id} label={c.name} active={cat === c.id} onClick={() => setCat(c.id)} />
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 px-5 pb-4">
        {results?.map((f) => (
          <div key={f.id} className="overflow-hidden rounded-2xl bg-card shadow-card">
            <Link to="/food/$id" params={{ id: f.id }}>
              <img src={f.image ?? ""} alt={f.name} className="h-32 w-full object-cover" />
            </Link>
            <div className="p-3">
              <div className="text-sm font-semibold leading-tight line-clamp-1">{f.name}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">{f.restaurant_name}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-bold text-brand">{formatMoney(Number(f.price))}</span>
                <button
                  onClick={() => {
                    add({ food_id: f.id, name: f.name, image: f.image, price: Number(f.price) });
                    toast.success("Added to cart");
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground"
                  aria-label="Add"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {results && results.length === 0 && (
          <p className="col-span-2 py-10 text-center text-sm text-muted-foreground">No dishes found.</p>
        )}
      </div>

      <div className="flex-1" />
      <BottomNav />
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${
        active ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card"
      }`}
    >
      {label}
    </button>
  );
}

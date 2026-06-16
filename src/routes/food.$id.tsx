import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Heart, Star, Flame, Beef, Wheat, ShoppingCart } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { getFoodItem, toggleFavoriteServer, getFavoritesServer } from "@/lib/db.functions";
import { formatMoney } from "@/lib/restaurant.config";
import { QtyStepper } from "@/components/qty-stepper";
import { toast } from "sonner";

export const Route = createFileRoute("/food/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Food — Our Kitchen` },
      { name: "description", content: "Order signature dishes delivered hot." },
      { property: "og:title", content: `Food #${params.id}` },
    ],
  }),
  component: FoodDetails,
});

function FoodDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);

  const addOns = [
    { id: "mayo", name: "Lemon Mayo", price: 49 },
    { id: "tomatoes", name: "Sliced Tomatoes", price: 29 },
    { id: "buns", name: "Whole Wheat Buns", price: 39 },
    { id: "peppers", name: "Bell Peppers", price: 19 },
  ];

  const handleToggleIngredient = (id: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getFoodItemFn = useServerFn(getFoodItem);
  const { data: food } = useQuery({
    queryKey: ["food", id],
    queryFn: () => getFoodItemFn({ data: id }),
  });

  const reviews = [
    { id: "r1", rating: 5, review: "Absolutely delicious! Authentic taste and quick delivery.", created_at: new Date().toISOString() }
  ];

  const getFavoritesFn = useServerFn(getFavoritesServer);
  const { data: isFav } = useQuery({
    queryKey: ["fav", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const list = await getFavoritesFn({ data: user!.id });
      return list.some((f) => f.food_id === id);
    },
  });

  const toggleFavoriteFn = useServerFn(toggleFavoriteServer);
  const toggleFav = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to save favorites");
      await toggleFavoriteFn({ data: { userId: user.id, foodId: id } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fav", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!food) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Loading…</div>;
  }

  const addOnsTotal = selectedIngredients.reduce((sum, id) => {
    const ing = addOns.find((i) => i.id === id);
    return sum + (ing ? ing.price : 0);
  }, 0);

  const unitPrice = Number(food.price) + addOnsTotal;
  const totalPrice = unitPrice * qty;

  return (
    <div className="flex min-h-screen flex-col bg-[#F5EBD0] pb-36">
      <div className="relative">
        <img src={food.image ?? ""} alt={food.name} className="h-96 w-full object-cover" />
        <Link 
          to="/" 
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#7F011F] shadow-md hover:scale-105 transition-transform"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <button
          onClick={() => toggleFav.mutate()}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#7F011F] shadow-md hover:scale-105 transition-transform"
          aria-label="Favorite"
        >
          <Heart className={`h-5 w-5 ${isFav ? "fill-[#7F011F] text-[#7F011F]" : "text-[#7F011F]"}`} />
        </button>
      </div>

      <div className="rounded-t-[2.5rem] -mt-8 bg-card pt-8 px-5 z-10 relative">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-extrabold text-[#2E251B] leading-tight">{food.name}</h1>
          <div className="text-right">
            <div className="inline-flex items-center gap-1 text-sm font-extrabold text-[#2E251B] bg-[#FCE6E9] px-3 py-1 rounded-full border border-[#FCE6E9]">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {food.rating}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 font-semibold">
              {food.rating_count > 1000 ? `${(food.rating_count / 1000).toFixed(1)}k` : food.rating_count} reviews
            </div>
          </div>
        </div>

        <h2 className="mt-6 text-[10px] font-extrabold tracking-widest text-muted-foreground uppercase">THE EXPERIENCE</h2>
        <p className="mt-2 text-xs leading-relaxed text-foreground/80">{food.description}</p>

        <h2 className="mt-6 text-[10px] font-extrabold tracking-widest text-muted-foreground uppercase">NUTRITIONAL PROFILE</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {food.calories && <Pill icon={<Flame className="h-4 w-4 text-orange-500" />} label={`${food.calories} kcal`} />}
          {food.protein_g && <Pill icon={<Beef className="h-4 w-4 text-amber-700" />} label={`${food.protein_g}g Protein`} />}
          {food.carbs_g && <Pill icon={<Wheat className="h-4 w-4 text-yellow-600" />} label={`${food.carbs_g}g Carbs`} />}
        </div>

        {/* Add-on Ingredients */}
        <div className="mt-8">
          <h2 className="text-sm font-extrabold text-[#2E251B]">Add on ingredients</h2>
          <div className="mt-3 space-y-3">
            {addOns.map((ing) => {
              const isChecked = selectedIngredients.includes(ing.id);
              return (
                <button
                  key={ing.id}
                  onClick={() => handleToggleIngredient(ing.id)}
                  className="w-full flex items-center justify-between py-2.5 border-b border-[#F1E6DC] text-left focus:outline-none"
                >
                  <span className="text-xs font-bold text-[#473B2E]">{ing.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-extrabold text-[#7F011F] font-mono">+{formatMoney(ing.price)}</span>
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isChecked
                          ? "border-[#7F011F] bg-[#7F011F] text-white"
                          : "border-[#E5D5B8] bg-white"
                      }`}
                    >
                      {isChecked && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between rounded-2xl bg-[#EADFC4] px-5 py-4 border border-[#E5D5B8]">
          <span className="text-sm font-extrabold text-[#2E251B]">Quantity</span>
          <QtyStepper value={qty} onChange={(v) => setQty(Math.max(1, v))} size="md" />
        </div>

        {reviews && reviews.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-extrabold text-[#2E251B]">Reviews</h2>
            <div className="mt-3 space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl bg-[#EADFC4] p-4 border border-[#E5D5B8]">
                  <div className="flex items-center gap-1 text-xs font-bold text-[#2E251B]">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {r.rating}
                  </div>
                  {r.review && <p className="mt-1.5 text-xs text-foreground/80">{r.review}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t border-border bg-card px-5 py-4 z-20 shadow-lg">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Price</div>
            <div className="text-lg font-black text-[#2E251B]">{formatMoney(totalPrice)}</div>
          </div>
          <button
            onClick={() => {
              const selectedNames = selectedIngredients.map(id => addOns.find(i => i.id === id)?.name);
              const customName = selectedNames.length > 0
                ? `${food.name} (with ${selectedNames.join(", ")})`
                : food.name;
              
              const cartFoodId = selectedIngredients.length > 0
                ? `${food.id}-${selectedIngredients.sort().join("-")}`
                : food.id;

              add({
                food_id: cartFoodId,
                name: customName,
                image: food.image,
                price: unitPrice,
                notes: selectedNames.length > 0 ? `With ${selectedNames.join(", ")}` : undefined
              }, qty);

              toast.success(`${food.name} added to cart`);
              navigate({ to: "/cart" });
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#7F011F] hover:bg-[#630016] py-3.5 text-sm font-bold text-white shadow-soft transition-all"
          >
            <ShoppingCart className="h-4.5 w-4.5" /> Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#EADFC4] border border-[#E5D5B8] px-3 py-2 text-xs font-bold text-[#473B2E]">
      {icon} {label}
    </span>
  );
}

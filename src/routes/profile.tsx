import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Heart, LogOut, MapPin, User as UserIcon, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const [demoRole, setDemoRole] = useState<string>("customer");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("grillgo_demo_role") || "customer";
      setDemoRole(saved);
    }
  }, []);


  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: favs } = useQuery({
    queryKey: ["favs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("food_id, food_items(id,name,image,price)")
        .eq("user_id", user!.id);
      return data ?? [];
    },
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="px-5 pt-6 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 overflow-hidden rounded-full bg-muted">
            <img
              src={profile?.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${profile?.name ?? user.email}`}
              alt=""
              className="h-full w-full"
            />
          </div>
          <div>
            <div className="text-lg font-semibold">{profile?.name ?? "Welcome"}</div>
            <div className="text-xs text-muted-foreground">{user.email ?? profile?.phone}</div>
          </div>
        </div>
      </header>

      <section className="mt-2 px-5">
        <Link to="/orders" className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card">
          <MapPin className="h-5 w-5 text-brand" />
          <span className="flex-1 font-medium">My Orders</span>
        </Link>
      </section>

      {/* Demo Roles & Portals */}
      <section className="mt-4 px-5">
        <div className="rounded-2xl bg-card p-4 shadow-card space-y-4">
          <div className="flex items-center gap-2 text-brand font-semibold text-sm">
            <ShieldAlert className="h-4 w-4" />
            <span>Portals & Demo Roles</span>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-2 uppercase tracking-wider">Simulate Role</label>
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
                    className={`py-1.5 text-[10px] font-bold rounded-lg capitalize transition-all ${
                      active ? "bg-brand text-brand-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="grid grid-cols-3 gap-2">
            <Link to="/admin" className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border border-border bg-background hover:bg-brand-soft transition-all">
              <span className="text-lg">🛠️</span>
              <span className="text-[10px] font-bold mt-1">Admin</span>
            </Link>
            <Link to="/kitchen" className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border border-border bg-background hover:bg-brand-soft transition-all">
              <span className="text-lg">🍳</span>
              <span className="text-[10px] font-bold mt-1">Kitchen</span>
            </Link>
            <Link to="/delivery" className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border border-border bg-background hover:bg-brand-soft transition-all">
              <span className="text-lg">🚴</span>
              <span className="text-[10px] font-bold mt-1">Rider</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-5 px-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Favorites</h2>
          <Heart className="h-4 w-4 text-brand" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {favs?.map((f: any) =>
            f.food_items ? (
              <Link
                key={f.food_id}
                to="/food/$id"
                params={{ id: f.food_items.id }}
                className="overflow-hidden rounded-2xl bg-card shadow-card"
              >
                <img src={f.food_items.image ?? ""} alt={f.food_items.name} className="h-28 w-full object-cover" />
                <div className="p-3">
                  <div className="text-sm font-semibold line-clamp-1">{f.food_items.name}</div>
                  <div className="text-sm font-bold text-brand">{formatMoney(Number(f.food_items.price))}</div>
                </div>
              </Link>
            ) : null,
          )}
          {favs && favs.length === 0 && (
            <p className="col-span-2 py-4 text-center text-sm text-muted-foreground">No favorites yet.</p>
          )}
        </div>
      </section>

      <div className="flex-1" />
      <div className="px-5 pb-6">
        <button
          onClick={() => signOut()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-semibold text-brand"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
      <BottomNav />
    </div>
  );
}

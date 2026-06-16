import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ShoppingCart, Receipt, User } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { count } = useCart();

  const items = [
    { to: "/", label: "Home", icon: Home },
    { to: "/cart", label: "Cart", icon: ShoppingCart, badge: count > 0 ? count : undefined },
    { to: "/orders", label: "Orders", icon: Receipt },
    { to: "/profile", label: "Profile", icon: User },
  ] as const;

  return (
    <nav className="sticky bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur">
      <ul className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon, badge }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors relative ${
                  active ? "text-brand" : "text-muted-foreground"
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-black text-brand-foreground">
                      {badge}
                    </span>
                  )}
                </div>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}


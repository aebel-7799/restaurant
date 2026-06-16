import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartItem {
  food_id: string;
  name: string;
  image: string | null;
  price: number;
  quantity: number;
  notes?: string;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (food_id: string, qty: number) => void;
  remove: (food_id: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "ourkitchen.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const count = items.reduce((s, i) => s + i.quantity, 0);
    return {
      items,
      count,
      subtotal,
      add: (item, qty = 1) => {
        setItems((prev) => {
          const ix = prev.findIndex((p) => p.food_id === item.food_id);
          if (ix >= 0) {
            const next = [...prev];
            next[ix] = { ...next[ix], quantity: next[ix].quantity + qty };
            return next;
          }
          return [...prev, { ...item, quantity: qty }];
        });
      },
      setQty: (food_id, qty) => {
        setItems((prev) =>
          qty <= 0
            ? prev.filter((p) => p.food_id !== food_id)
            : prev.map((p) => (p.food_id === food_id ? { ...p, quantity: qty } : p)),
        );
      },
      remove: (food_id) => setItems((prev) => prev.filter((p) => p.food_id !== food_id)),
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

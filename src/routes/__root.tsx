import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { CartProvider } from "@/hooks/use-cart";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-brand">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  const isChunkError =
    error?.message?.includes("Failed to fetch dynamically imported module") ||
    error?.message?.includes("Importing a module script failed") ||
    error?.message?.includes("dynamic import");

  useEffect(() => {
    if (isChunkError) {
      console.warn("Dynamic import error detected. Reloading page to fetch latest bundles...");
      const hasReloaded = sessionStorage.getItem("grillgo.chunk_reload");
      if (!hasReloaded) {
        sessionStorage.setItem("grillgo.chunk_reload", "true");
        
        // Clean SW and caches, then reload with cache-buster
        if (typeof window !== "undefined") {
          const reloadPage = () => {
            const url = new URL(window.location.href);
            url.searchParams.set("u", Date.now().toString());
            window.location.href = url.toString();
          };

          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then((regs) => {
              Promise.all(regs.map((r) => r.unregister())).finally(() => {
                if ("caches" in window) {
                  caches.keys().then((keys) => {
                    Promise.all(keys.map((k) => caches.delete(k))).finally(() => {
                      reloadPage();
                    });
                  });
                } else {
                  reloadPage();
                }
              });
            });
          } else {
            reloadPage();
          }
        }
      }
    }
  }, [isChunkError]);

  const handleReload = () => {
    sessionStorage.removeItem("grillgo.chunk_reload");
    
    if (typeof window !== "undefined") {
      const reloadPage = () => {
        const url = new URL(window.location.href);
        url.searchParams.set("u", Date.now().toString());
        window.location.href = url.toString();
      };

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          Promise.all(regs.map((r) => r.unregister())).finally(() => {
            if ("caches" in window) {
              caches.keys().then((keys) => {
                Promise.all(keys.map((k) => caches.delete(k))).finally(() => {
                  reloadPage();
                });
              });
            } else {
              reloadPage();
            }
          });
        });
      } else {
        reloadPage();
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-semibold text-brand">Something went wrong</h1>
        <div className="text-left bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 overflow-auto max-h-60 max-w-full font-mono text-[10px] leading-relaxed whitespace-pre-wrap select-text">
          <p className="font-bold mb-1.5 text-red-900 text-xs">
            {error.name}: {error.message}
          </p>
          {error.stack}
        </div>
        <div className="flex gap-3 justify-center items-center">
          <button
            onClick={handleReload}
            className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground shadow"
          >
            Reload Page
          </button>
          <a
            href="/?u=home"
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground shadow-sm"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
      { title: "Our Kitchen — Order in" },
      { name: "description", content: "Order signature burgers, pizza, and more — delivered hot." },
      { name: "theme-color", content: "#7a1d1d" },
      { property: "og:title", content: "Our Kitchen — Order in" },
      { name: "twitter:title", content: "Our Kitchen — Order in" },
      { property: "og:description", content: "Order signature burgers, pizza, and more — delivered hot." },
      { name: "twitter:description", content: "Order signature burgers, pizza, and more — delivered hot." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9a26d5b7-7548-465f-984e-1278df43c23f/id-preview-e6acdded--6b46212b-21e2-46d0-8001-8b55f3260bbb.lovable.app-1781609510190.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9a26d5b7-7548-465f-984e-1278df43c23f/id-preview-e6acdded--6b46212b-21e2-46d0-8001-8b55f3260bbb.lovable.app-1781609510190.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("grillgo.saved_addresses");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(item => item && item.id !== "mock-saved-1" && item.id !== "mock-saved-2" && !item.id?.startsWith("mock-"));
            if (cleaned.length !== parsed.length) {
              localStorage.setItem("grillgo.saved_addresses", JSON.stringify(cleaned));
            }
          }
        }

        const recents = localStorage.getItem("grillgo.recent_locations");
        if (recents) {
          const parsed = JSON.parse(recents);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(item => item && item.id !== "mock-recent-1" && item.id !== "mock-recent-2" && !item.id?.startsWith("mock-"));
            if (cleaned.length !== parsed.length) {
              localStorage.setItem("grillgo.recent_locations", JSON.stringify(cleaned));
            }
          }
        }
      } catch (e) {
        console.error("Error cleaning localStorage:", e);
      }
    }

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        if (registrations.length > 0) {
          console.warn("Active service workers found, unregistering for clean updates...");
          Promise.all(
            registrations.map((r) => r.unregister())
          ).then(() => {
            if ("caches" in window) {
              caches.keys().then((keys) => {
                Promise.all(keys.map((k) => caches.delete(k))).then(() => {
                  console.log("Caches cleared. Reloading page...");
                  window.location.reload();
                });
              });
            } else {
              window.location.reload();
            }
          });
        }
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <div id="app-shell">
            <Outlet />
          </div>
          <Toaster position="top-center" richColors />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

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
        const url = new URL(window.location.href);
        url.searchParams.set("u", Date.now().toString());
        window.location.href = url.toString();
      }
    }
  }, [isChunkError]);

  const handleReload = () => {
    sessionStorage.removeItem("grillgo.chunk_reload");
    const url = new URL(window.location.href);
    url.searchParams.set("u", Date.now().toString());
    window.location.href = url.toString();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          {isChunkError
            ? "A new update is available! Please refresh to load the latest version."
            : error.message}
        </p>
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

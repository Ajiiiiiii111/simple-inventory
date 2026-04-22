"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/transactions", label: "Transactions" },
  { href: "/dashboard/chart", label: "Stock Movement" },
  { href: "/dashboard/predictions", label: "Smart Prediction" },
];

export function TopNav() {
  const pathname = usePathname();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const supabaseClient = supabase;

    let isMounted = true;

    async function loadSession() {
      const { data } = await supabaseClient.auth.getSession();

      if (!isMounted) {
        return;
      }

      setIsAuthenticated(Boolean(data.session));
      setUserEmail(data.session?.user.email ?? null);
    }

    void loadSession();

    const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setIsAuthenticated(Boolean(session));
      setUserEmail(session?.user.email ?? null);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  if (pathname === "/") {
    return null;
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-4 sm:px-8 lg:px-12 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Simple Inventory
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Products, transactions, charts, and predictions in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          </nav>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 sm:inline">
                {userEmail ?? "Signed in"}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

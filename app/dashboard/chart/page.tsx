"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import type { MovementRow } from "@/lib/inventory";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type StockMovementRange = "daily" | "weekly" | "monthly" | "yearly";

const rangeLabels: Record<StockMovementRange, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

function normalizeRange(value?: string): StockMovementRange {
  if (value === "weekly" || value === "monthly" || value === "yearly") {
    return value;
  }

  return "daily";
}

function ChartPageContent() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const range = normalizeRange(searchParams.get("range") ?? undefined);
  const [stockMovements, setStockMovements] = useState<MovementRow[]>([]);
  const [message, setMessage] = useState(
    supabase
      ? ""
      : "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.",
  );
  const maxTotal = Math.max(...stockMovements.map((item) => item.in + item.out), 1);

  useEffect(() => {
    const client = supabase;

    if (!client) {
      return;
    }

    const supabaseClient = client;

    let isMounted = true;

    async function fetchSeries(token: string | null) {
      if (!token) {
        if (isMounted) {
          setStockMovements([]);
          setMessage("Sign in to view your stock movement chart.");
        }
        return;
      }

      const response = await fetch(`/api/dashboard/stock-movement?range=${range}`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const body = (await response.json()) as { error?: string; series?: MovementRow[] };

      if (!isMounted) {
        return;
      }

      if (!response.ok) {
        setStockMovements([]);
        setMessage(body.error ?? "Unable to load stock movement.");
        return;
      }

      setStockMovements(Array.isArray(body.series) ? body.series : []);
      setMessage("");
    }

    async function loadSession() {
      const { data } = await supabaseClient.auth.getSession();
      await fetchSeries(data.session?.access_token ?? null);
    }

    void loadSession();

    const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      void fetchSeries(session?.access_token ?? null);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [range, supabase]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2ff_45%,_#e2e8f0_100%)] px-6 py-10 text-slate-900 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Dashboard / Stock Movement Chart
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Daily IN vs OUT stock movement.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Simple chart to help spot inventory trends across different time ranges.
          </p>
        </header>

        {message ? (
          <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm text-slate-700 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
            {message}
          </div>
        ) : null}

        <article className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" /> IN
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-sky-500" /> OUT
            </span>
            </div>

            <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-1">
              {(Object.keys(rangeLabels) as StockMovementRange[]).map((option) => {
                const isActive = option === range;

                return (
                  <Link
                    key={option}
                    href={`/dashboard/chart?range=${option}`}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      isActive ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    {rangeLabels[option]}
                  </Link>
                );
              })}
            </div>
          </div>

          <div
            className={`mt-6 grid gap-3 ${
              range === "daily"
                ? "grid-cols-7"
                : range === "weekly"
                  ? "grid-cols-4 lg:grid-cols-8"
                  : range === "monthly"
                    ? "grid-cols-3 lg:grid-cols-6 xl:grid-cols-12"
                    : "grid-cols-2 lg:grid-cols-5"
            }`}
          >
            {stockMovements.map((day) => (
              <div key={`${day.label}-${day.in}-${day.out}`} className="flex flex-col items-center gap-3">
                <div className="flex h-72 w-full items-end gap-2 rounded-3xl bg-slate-50 p-3">
                  <div
                    className="w-1/2 rounded-full bg-emerald-500"
                    style={{ height: `${Math.max((day.in / maxTotal) * 100, 10)}%` }}
                    title={`IN ${day.in}`}
                  />
                  <div
                    className="w-1/2 rounded-full bg-sky-500"
                    style={{ height: `${Math.max((day.out / maxTotal) * 100, 10)}%` }}
                    title={`OUT ${day.out}`}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-900">{day.label}</p>
                  <p className="text-xs text-slate-500">IN {day.in} / OUT {day.out}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}

export default function ChartPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2ff_45%,_#e2e8f0_100%)] px-6 py-10 text-slate-900 sm:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-7xl rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm text-slate-700 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
            Loading chart...
          </div>
        </main>
      }
    >
      <ChartPageContent />
    </Suspense>
  );
}

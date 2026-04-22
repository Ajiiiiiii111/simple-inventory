"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { recentTransactions, stockMovements } from "@/lib/inventory";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type DashboardSummary = {
  totalProducts: number;
  totalQuantity: number;
  lowStockItems: number;
  outOfStockItems: number;
};

type SummaryCard = {
  label: string;
  detail: string;
  accent: string;
};

const summaryCards: SummaryCard[] = [
  {
    label: "Total Products",
    detail: "Unique items tracked across your account",
    accent: "from-slate-900 to-slate-700",
  },
  {
    label: "Total Quantity",
    detail: "Combined units available in inventory",
    accent: "from-emerald-600 to-teal-500",
  },
  {
    label: "Low Stock Items",
    detail: "Items below the reorder threshold of 10",
    accent: "from-amber-500 to-orange-500",
  },
  {
    label: "Out of Stock Items",
    detail: "Items currently at zero quantity",
    accent: "from-rose-600 to-red-500",
  },
];

const emptySummary: DashboardSummary = {
  totalProducts: 0,
  totalQuantity: 0,
  lowStockItems: 0,
  outOfStockItems: 0,
};

export default function Dashboard() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [message, setMessage] = useState(
    supabase
      ? ""
      : "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.",
  );

  useEffect(() => {
    const client = supabase;

    if (!client) {
      return;
    }

    const supabaseClient = client;
    let isMounted = true;

    async function fetchSummary(token: string | null) {
      if (!token) {
        if (isMounted) {
          setSummary(emptySummary);
          setMessage("Sign in to view your dashboard summary.");
        }
        return;
      }

      const response = await fetch("/api/dashboard/summary", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const body = (await response.json()) as {
        error?: string;
        totalProducts?: number;
        totalQuantity?: number;
        lowStockItems?: number;
        outOfStockItems?: number;
      };

      if (!isMounted) {
        return;
      }

      if (!response.ok) {
        setSummary(emptySummary);
        setMessage(body.error ?? "Unable to load dashboard summary.");
        return;
      }

      setSummary({
        totalProducts: body.totalProducts ?? 0,
        totalQuantity: body.totalQuantity ?? 0,
        lowStockItems: body.lowStockItems ?? 0,
        outOfStockItems: body.outOfStockItems ?? 0,
      });
      setMessage("");
    }

    async function loadSession() {
      const { data } = await supabaseClient.auth.getSession();
      await fetchSummary(data.session?.access_token ?? null);
    }

    void loadSession();

    const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      void fetchSummary(session?.access_token ?? null);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const summaryValues = [
    summary.totalProducts,
    summary.totalQuantity,
    summary.lowStockItems,
    summary.outOfStockItems,
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2ff_45%,_#e2e8f0_100%)] px-6 py-10 text-slate-900 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Inventory Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Quick view of stock health and availability.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Monitor the most important inventory signals at a glance: total product count,
            overall stock, low stock warnings, and out of stock items.
          </p>
        </div>

        {message ? (
          <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm text-slate-700 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
            {message}
          </div>
        ) : null}

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((metric, index) => (
            <article
              key={metric.label}
              className="group overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(15,23,42,0.12)]"
            >
              <div className={`h-1.5 w-16 rounded-full bg-gradient-to-r ${metric.accent}`} />
              <p className="mt-6 text-sm font-medium text-slate-500">{metric.label}</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
                  {summaryValues[index]}
                </h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Summary
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Products
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  Add, edit, delete, and track alerts
                </h2>
              </div>
              <Link
                href="/dashboard/products"
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Open
              </Link>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Manage product records and highlight low or critical stock before it becomes a
              problem.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/dashboard/products"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
              >
                Go to Products
              </Link>
              <Link
                href="/dashboard/predictions"
                className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white"
              >
                View Alerts
              </Link>
            </div>
          </article>

          <article className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Transactions
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  Recent inventory activity
                </h2>
              </div>
              <Link
                href="/dashboard/transactions"
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Open
              </Link>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-500">Product</th>
                    <th className="px-4 py-3 font-semibold text-slate-500">Type</th>
                    <th className="px-4 py-3 font-semibold text-slate-500">Qty</th>
                    <th className="px-4 py-3 font-semibold text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recentTransactions.slice(0, 3).map((transaction) => (
                    <tr key={`${transaction.name}-${transaction.date}-${transaction.type}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">{transaction.name}</td>
                      <td className="px-4 py-3 text-slate-600">{transaction.type}</td>
                      <td className="px-4 py-3 text-slate-600">{transaction.quantity}</td>
                      <td className="px-4 py-3 text-slate-600">{transaction.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <Link
            href="/dashboard/chart"
            className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-1"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Stock Movement Chart
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
              Daily IN vs OUT trends
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              See how incoming and outgoing stock changes across the week.
            </p>
          </Link>

          <Link
            href="/dashboard/predictions"
            className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-1"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Smart Prediction
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
              Items likely to run out soon
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Forecast risky items and act before they hit zero.
            </p>
          </Link>

          <article className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Weekly Activity
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
              Quick movement snapshot
            </h2>
            <div className="mt-5 flex items-end gap-3">
              {stockMovements.map((day) => (
                <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end gap-1 rounded-2xl bg-slate-50 p-2">
                    <div
                      className="w-1/2 rounded-full bg-emerald-500"
                      style={{ height: `${Math.max((day.in / 70) * 100, 10)}%` }}
                      title={`IN ${day.in}`}
                    />
                    <div
                      className="w-1/2 rounded-full bg-sky-500"
                      style={{ height: `${Math.max((day.out / 70) * 100, 10)}%` }}
                      title={`OUT ${day.out}`}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500">{day.label}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

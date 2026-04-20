import Link from "next/link";

import { inventoryMetrics, recentTransactions, stockMovements } from "@/lib/inventory";

export default function Dashboard() {
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

        <section className="grid gap-4 md:grid-cols-[1fr_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
            <span className="text-sm font-medium text-slate-500">Search</span>
            <input
              type="search"
              placeholder="Search products, stock, or transactions"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <Link className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5" href="/dashboard/products?mode=add">
              Add Product
            </Link>
            <Link className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5" href="/dashboard/products?mode=in">
              Stock In
            </Link>
            <Link className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-600/20 transition hover:-translate-y-0.5" href="/dashboard/products?mode=out">
              Stock Out
            </Link>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {inventoryMetrics.map((metric) => (
            <article
              key={metric.label}
              className="group overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(15,23,42,0.12)]"
            >
              <div className={`h-1.5 w-16 rounded-full bg-gradient-to-r ${metric.accent}`} />
              <p className="mt-6 text-sm font-medium text-slate-500">{metric.label}</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
                  {metric.value}
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

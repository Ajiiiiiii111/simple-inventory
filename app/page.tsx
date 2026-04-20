import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2ff_45%,_#e2e8f0_100%)] px-6 py-12 text-slate-900">
      <div className="w-full max-w-4xl rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
          Simple Inventory
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Inventory dashboard with products, transactions, charts, and predictions.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Open the dashboard to manage products, inspect transaction history, review stock
          movement, and catch items before they run out.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
          >
            Open Dashboard
          </Link>
          <Link
            href="/dashboard/products"
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Products
          </Link>
        </div>
      </div>
    </main>
  );
}

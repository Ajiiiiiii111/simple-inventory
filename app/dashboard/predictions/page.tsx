import { predictions } from "@/lib/inventory";

export default function PredictionsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2ff_45%,_#e2e8f0_100%)] px-6 py-10 text-slate-900 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Dashboard / Smart Prediction
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Items likely to run out soon.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            This section highlights products that may need replenishment before stock hits zero.
          </p>
        </header>

        <section className="grid gap-5 lg:grid-cols-2">
          {predictions.map((item) => (
            <article key={item.name} className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold tracking-tight text-slate-950">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-600">Current quantity: {item.currentQuantity}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                    item.risk === "High"
                      ? "bg-rose-100 text-rose-700"
                      : item.risk === "Medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {item.risk} Risk
                </span>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Estimated days left</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                  {item.estimatedDaysLeft} days
                </p>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">{item.recommendation}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

import { stockMovements } from "@/lib/inventory";

export default function ChartPage() {
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
            Simple chart to help spot inventory trends across the week.
          </p>
        </header>

        <article className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" /> IN
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-sky-500" /> OUT
            </span>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-3">
            {stockMovements.map((day) => (
              <div key={day.label} className="flex flex-col items-center gap-3">
                <div className="flex h-72 w-full items-end gap-2 rounded-3xl bg-slate-50 p-3">
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

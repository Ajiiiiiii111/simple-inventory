import { recentTransactions } from "@/lib/inventory";

export default function TransactionsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2ff_45%,_#e2e8f0_100%)] px-6 py-10 text-slate-900 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Dashboard / Transactions
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Recent transaction activity.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Track stock IN and OUT movements for the latest operational activity.
          </p>
        </header>

        <article className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="border-b border-slate-200/80 px-6 py-5 sm:px-7">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Recent Transactions</h2>
            <p className="mt-1 text-sm text-slate-600">Simple activity log with the latest inventory changes.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 sm:px-7">Product Name</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Type</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Quantity</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recentTransactions.map((transaction) => (
                  <tr key={`${transaction.name}-${transaction.date}-${transaction.type}`} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 sm:px-7">{transaction.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                          transaction.type === "IN"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{transaction.quantity}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{transaction.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </main>
  );
}

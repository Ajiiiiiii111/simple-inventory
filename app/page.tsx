import { AuthPanel } from "@/components/auth-panel";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2ff_40%,_#dbeafe_100%)] px-6 py-10 text-slate-900 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-7xl items-center py-8 lg:min-h-[calc(100vh-5rem)]">
        <AuthPanel />
      </div>
    </main>
  );
}

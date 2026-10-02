import { LoginForm } from "@/components/auth/login-form";
import { ArrowUpRight, CheckCircle2, Layers3, ShieldCheck, Ticket } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080d0c] text-[#f4f5f1]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_85%,rgba(119,161,127,0.13),transparent_42%),radial-gradient(ellipse_at_84%_14%,rgba(153,177,134,0.08),transparent_32%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 pb-8 pt-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg border border-[#a9c395]/40 bg-[#a9c395]/10 text-[#a9c395]"><Layers3 className="size-5" aria-hidden /></span>
            <span className="text-base font-bold tracking-tight">IT Service Desk<span className="text-[#a9c395]">.</span></span>
          </div>
          <span className="hidden items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400 sm:inline-flex"><span className="size-1.5 rounded-full bg-[#a9c395]" />Service operations, simplified</span>
        </header>

        <main className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-20 lg:py-14">
          <section className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#a9c395]/25 bg-[#a9c395]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#b9d1a8] lg:mb-6">Your workspace <ArrowUpRight className="size-3.5" aria-hidden /></p>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl xl:text-7xl">Everything IT needs.<br /><span className="text-[#a9c395]">One clear view.</span></h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400 lg:mt-7 lg:text-lg">Manage requests, assets, and service operations in one place. Stay on top of what matters and keep work moving.</p>
            <div className="mt-10 hidden gap-3 sm:grid-cols-3 lg:grid">
              {[
                { icon: Ticket, label: "Resolve requests" },
                { icon: ShieldCheck, label: "Track every asset" },
                { icon: CheckCircle2, label: "Meet service goals" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-zinc-300"><Icon className="size-4 shrink-0 text-[#a9c395]" aria-hidden />{label}</div>
              ))}
            </div>
          </section>
          <div className="w-full max-w-md justify-self-center lg:justify-self-end">
            <LoginForm />
          </div>
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-zinc-500"><span>IT Service Desk · Asset Management</span><span>Secure access for your team</span></footer>
      </div>
    </div>
  );
}

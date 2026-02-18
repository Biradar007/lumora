import Link from 'next/link';

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-16">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Pricing</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Upgrade to Lumora Pro</h1>
        <p className="mt-3 text-sm text-slate-600">
          Free includes 30 AI messages per calendar month with cooldowns. Pro removes chat caps and cooldowns.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Free</h2>
            <p className="mt-2 text-sm text-slate-600">30 AI messages / month</p>
            <p className="mt-1 text-sm text-slate-600">Usage cooldown rules apply</p>
          </section>
          <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
            <h2 className="text-lg font-semibold text-indigo-900">Pro</h2>
            <p className="mt-2 text-sm text-indigo-700">Unlimited AI chat</p>
            <p className="mt-1 text-sm text-indigo-700">No cooldown restrictions</p>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Sign in
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}

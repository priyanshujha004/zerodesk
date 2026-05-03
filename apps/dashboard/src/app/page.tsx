// TODO P4 — landing page
// apps/dashboard/src/app/page.tsx

import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeatureCard {
  icon: string;
  title: string;
  desc: string;
  highlight?: boolean;
}

interface PricingTier {
  name: string;
  price: string;
  sub: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES: FeatureCard[] = [
  {
    icon: '🛍️',
    title: 'Shopify Integration',
    desc: 'One-line embed. Syncs orders, policies, and customer data automatically.',
  },
  {
    icon: '🤖',
    title: 'AI Eligibility Check',
    desc: 'Checks return window, product condition, and policy rules in milliseconds.',
    highlight: true,
  },
  {
    icon: '⚡',
    title: 'Instant Razorpay Refund',
    desc: 'Approved returns trigger refunds automatically — no human needed.',
    highlight: true,
  },
  {
    icon: '🗂️',
    title: 'Human Override Queue',
    desc: 'The hard 20% land cleanly in your team dashboard, fully context-loaded.',
  },
  {
    icon: '📋',
    title: 'Full Audit Trail',
    desc: 'Every decision, timestamped. Built-in SLA tracking and escalation.',
  },
  {
    icon: '🔌',
    title: '1-Line Embed',
    desc: 'Drop one script tag into your Shopify theme. Live in under 5 minutes.',
  },
];

const PRICING: PricingTier[] = [
  {
    name: 'Starter',
    price: '₹2,999',
    sub: 'per month',
    features: [
      '500 returns / month',
      'Shopify + Razorpay',
      'AI auto-resolution',
      'Email notifications',
      '7-day audit history',
    ],
    cta: 'Start free trial',
  },
  {
    name: 'Growth',
    price: '₹9,999',
    sub: 'per month',
    features: [
      '5,000 returns / month',
      'Everything in Starter',
      'Priority SLA routing',
      'Department workflows',
      'Unlimited audit history',
      'Dedicated Slack support',
    ],
    cta: 'Get Growth',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    sub: 'volume pricing',
    features: [
      'Unlimited returns',
      'Everything in Growth',
      'SSO / SAML',
      'Custom AI policy rules',
      'White-label option',
      'Dedicated success manager',
    ],
    cta: 'Contact sales',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Customer opens chat',
    desc: 'Enters their order number. No account needed.',
  },
  {
    n: '02',
    title: 'AI fetches & checks',
    desc: 'Pulls the order from Shopify, applies your return policy rules.',
  },
  {
    n: '03',
    title: 'Instant refund',
    desc: 'Eligible returns are refunded via Razorpay in under 90 seconds.',
  },
  {
    n: '04',
    title: 'Exceptions escalated',
    desc: 'Edge cases go to your team — fully tracked, SLA-managed.',
  },
];

const FAKE_STORES = [
  'Zara India',
  'Meesho Picks',
  'The Souled Store',
  'Bewakoof',
  'Myntra Sellers',
  'Nykaa Fashion',
];

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-black text-emerald-400 tabular-nums leading-none">
        {value}
      </div>
      <div className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
        {label}
      </div>
    </div>
  );
}

function Feature({ card }: { card: FeatureCard }) {
  return (
    <div
      className={`rounded-2xl p-6 border transition-all duration-300 group hover:-translate-y-1 ${
        card.highlight
          ? 'border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10'
          : 'border-white/5 bg-[#12121a] hover:border-white/10'
      }`}
    >
      <div className="text-3xl mb-4">{card.icon}</div>
      <h3 className="text-base font-bold text-white mb-2">{card.title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
    </div>
  );
}

function PricingCard({ tier }: { tier: PricingTier }) {
  return (
    <div
      className={`relative rounded-2xl p-7 flex flex-col border transition-all duration-300 ${
        tier.highlight
          ? 'border-emerald-500/50 bg-emerald-500/5 scale-[1.02]'
          : 'border-white/5 bg-[#12121a]'
      }`}
    >
      {tier.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full">
            MOST POPULAR
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
          {tier.name}
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-white">{tier.price}</span>
          <span className="text-gray-500 text-sm">{tier.sub}</span>
        </div>
      </div>

      <ul className="space-y-2.5 flex-1 mb-8">
        {tier.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
            <svg
              className="h-3.5 w-3.5 text-emerald-500 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 111.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <Link
        href="/register"
        className={`text-center text-sm font-semibold py-3 rounded-xl transition-all ${
          tier.highlight
            ? 'bg-emerald-500 text-black hover:bg-emerald-400'
            : 'border border-white/10 text-white hover:border-white/30'
        }`}
      >
        {tier.cta}
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div
      className="min-h-screen text-white"
      style={{ background: '#0a0a0f', fontFamily: 'system-ui, sans-serif' }}
    >
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 backdrop-blur bg-[#0a0a0f]/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <span className="font-black text-lg tracking-tight">
            Resolve<span className="text-emerald-400">IQ</span>
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="#pricing"
              className="text-sm text-gray-400 hover:text-white hidden sm:block"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm text-gray-400 hover:text-white hidden sm:block"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="bg-emerald-500 text-black text-sm font-bold px-4 py-2 rounded-lg hover:bg-emerald-400 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Glow blob */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20"
          style={{
            background:
              'radial-gradient(ellipse, #6ee7b7 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-8 pt-24 pb-20 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-8 text-xs font-semibold text-emerald-400 uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI-powered returns for Shopify
          </div>

          <h1 className="text-5xl sm:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            Returns resolved
            <br />
            <span className="text-emerald-400">in 90 seconds.</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            AI handles{' '}
            <span className="text-white font-semibold">
              80% of e-commerce returns
            </span>{' '}
            automatically. Your team only sees the hard 20%.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-16">
            <Link
              href="/register"
              className="bg-emerald-500 text-black font-bold text-base px-7 py-3.5 rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
            >
              Add to your Shopify store →
            </Link>
            <Link
              href="#how"
              className="border border-white/10 text-white text-base px-7 py-3.5 rounded-xl hover:border-white/30 transition-all"
            >
              See how it works
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-sm mx-auto border border-white/5 rounded-2xl bg-[#12121a] p-6">
            <StatBadge value="80%" label="auto-resolved" />
            <StatBadge value="90s" label="avg resolution" />
            <StatBadge value="₹0" label="staff cost" />
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section id="how" className="max-w-6xl mx-auto px-4 sm:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            How it works
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            From customer request to refund in your bank — fully automated.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              className="relative rounded-2xl border border-white/5 bg-[#12121a] p-6"
            >
              {/* Step connector line */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute right-0 top-1/2 w-4 h-px bg-white/10 -translate-y-1/2 translate-x-full z-10" />
              )}
              <div className="text-5xl font-black text-white/5 mb-4 leading-none">
                {step.n}
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Everything you need
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Built for Indian e-commerce. Razorpay-native.
            Shopify-first.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((card) => (
            <Feature key={card.title} card={card} />
          ))}
        </div>
      </section>

      {/* ── Social proof ───────────────────────────────────────────── */}
      <section className="border-y border-white/5 py-10 my-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <p className="text-center text-xs font-semibold text-gray-600 uppercase tracking-widest mb-6">
            Trusted by 50+ Shopify stores
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
            {FAKE_STORES.map((store) => (
              <span
                key={store}
                className="text-sm font-semibold text-gray-600 hover:text-gray-400 transition-colors cursor-default"
              >
                {store}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Simple, honest pricing
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            No per-return fees. No surprise charges. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-center">
          {PRICING.map((tier) => (
            <PricingCard key={tier.name} tier={tier} />
          ))}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 py-20 text-center">
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-12">
          <h2 className="text-3xl sm:text-5xl font-black mb-4">
            Ready to automate
            <br />
            your returns?
          </h2>
          <p className="text-gray-500 mb-8 max-w-lg mx-auto">
            Set up in under 5 minutes. Free 14-day trial.
            No credit card required.
          </p>
          <Link
            href="/register"
            className="inline-block bg-emerald-500 text-black font-bold text-lg px-10 py-4 rounded-xl hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20"
          >
            Add to your Shopify store →
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-black text-base tracking-tight">
            Resolve<span className="text-emerald-400">IQ</span>
          </span>
          <div className="flex gap-6 text-sm text-gray-600">
            <Link href="#" className="hover:text-gray-400">
              Privacy
            </Link>
            <Link href="#" className="hover:text-gray-400">
              Terms
            </Link>
            <Link href="#" className="hover:text-gray-400">
              Contact
            </Link>
          </div>
          <span className="text-xs text-gray-700">
            © 2026 ResolveIQ. Built for Indian commerce.
          </span>
        </div>
      </footer>
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> notify-report

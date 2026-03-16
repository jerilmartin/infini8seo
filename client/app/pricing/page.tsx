'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Zap } from 'lucide-react';
import { api } from '@/utils/api';
import { UserMenu } from '@/components/UserMenu';
import { useTheme } from '@/contexts/ThemeContext';
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800']
});

interface Plan {
  name: string;
  price: number;
  priceINR?: number;
  currency: string;
  credits: number;
  features: string[];
  bestFor?: string;
  popular?: boolean;
}

interface SubscriptionStatus {
  tier: string;
  status: string;
  creditsRemaining: number;
  creditsTotal: number;
  expiresAt?: string;
}

export default function PricingPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionStatus | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchPricing();
    fetchSubscriptionStatus();
  }, []);

  const fetchPricing = async () => {
    try {
      const response = await api.get('/api/subscription/pricing');
      setPlans(response.data.plans);
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await api.get('/api/subscription/status');
      setCurrentSubscription(response.data);
    } catch (error) {
      console.log('No subscription status');
    }
  };

  const handleUpgrade = async (tier: string) => {
    setUpgrading(tier);
    try {
      const response = await api.post('/api/subscription/upgrade', {
        tier,
        paymentData: {
          provider: 'stripe',
          payment_id: 'test_payment_' + Date.now()
        }
      });

      if (response.data.success) {
        router.push('/');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Upgrade failed');
    } finally {
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center transition-colors duration-300"
        style={{ backgroundColor: theme === 'light' ? '#F3F3F3' : '#0A0A0A' }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#CA9700' }} />
      </div>
    );
  }

  // Ensure preferred order: free, starter, pro
  const orderedKeys = ['free', 'starter', 'pro'];
  const displayPlans = orderedKeys.map(key => ({ key, plan: plans[key] })).filter(item => item.plan);

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-colors duration-300 ${montserrat.className}`}
      style={{ backgroundColor: theme === 'light' ? '#F3F3F3' : '#0A0A0A' }}
    >

      {/* Background large text "Pricing" and glow */}
      <div className="absolute top-[70px] md:top-[75px] left-1/2 -translate-x-1/2 w-full text-center pointer-events-none z-0" style={{ overflow: 'visible' }}>
        <h2 className="text-[#CA9700] text-xl md:text-3xl font-semibold tracking-wider mb-0 md:mb-2">Infini8 SEO</h2>
        <h1
          className="text-[18vw] md:text-[15vw] font-bold tracking-tighter"
          style={{
            background: 'linear-gradient(to right, #453400 0%, #CA9700 50%, #584200 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1.0,
            paddingBottom: '0.1em',
            opacity: 0.85
          }}
        >
          Pricing
        </h1>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 relative z-10">
        {/* Header navigation */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className={`font-semibold transition-opacity hover:opacity-80 flex items-center gap-1 text-2xl ${theme === 'light' ? 'text-black' : 'text-white'}`}
            >
              <span>infini8</span>
              <span className="text-[#CA9700]"> SEO</span>
            </button>
            <button
              onClick={toggleTheme}
              className="hover:opacity-80 transition-opacity"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              <img
                src={theme === 'dark' ? '/assets/button.svg' : '/assets/button1.svg'}
                alt="Theme Toggle"
                className="w-[62px] h-7"
              />
            </button>
          </div>
          <div className="flex items-center gap-4">
            {/* Currency Toggle */}
            <div
              className="flex items-center border rounded-full p-1"
              style={{
                background: theme === 'light' ? 'rgba(0,0,0,0.05)' : '#131111',
                borderColor: theme === 'light' ? 'rgba(0,0,0,0.1)' : '#222'
              }}
            >
              <button
                onClick={() => setCurrency('USD')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${currency === 'USD' ? 'bg-[#CA9700] text-black' : 'text-zinc-500 hover:text-white'}`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setCurrency('INR')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${currency === 'INR' ? 'bg-[#CA9700] text-black' : 'text-zinc-500 hover:text-white'}`}
              >
                INR (₹)
              </button>
            </div>
            <UserMenu />
          </div>
        </header>



        {/* Pricing Cards Layer */}
        <div
          className="flex flex-col lg:flex-row items-stretch justify-center gap-6 lg:gap-6 max-w-5xl mx-auto mt-44 lg:mt-56 relative z-10"
          onMouseLeave={() => setHoveredPlan(null)}
        >
          {displayPlans.map(({ key, plan }) => {
            const isCurrentPlan = currentSubscription?.tier === key;
            const displayPrice = currency === 'INR' && plan.priceINR ? plan.priceINR : plan.price;
            const currencySymbol = currency === 'INR' ? '₹' : '$';
            // Default to starter if nothing hovered, else highlight hovered
            const isHighlighted = hoveredPlan ? hoveredPlan === key : key === 'starter';

            return (
              <div
                key={key}
                onMouseEnter={() => setHoveredPlan(key)}
                className={`relative rounded-[20px] transition-all duration-300 flex-1 w-full max-w-[300px] ${isHighlighted ? 'z-20 scale-105' : 'z-10 scale-100'}`}
              >
                {/* Gradient Border Ring for highlighted card */}
                {isHighlighted && (
                  <div
                    className="absolute z-[-1] pointer-events-none rounded-[20px]"
                    style={{
                      inset: '-2px',
                      padding: '2px',
                      background: 'linear-gradient(135deg, #453400 0%, #584200 26%, #CA9700 100%)',
                      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      WebkitMaskComposite: 'xor',
                      maskComposite: 'exclude'
                    }}
                  />
                )}

                <div
                  className="h-full rounded-[18px] p-5 flex flex-col items-center text-center transition-all duration-300"
                  style={{
                    background: theme === 'light'
                      ? 'rgba(0, 0, 0, 0.20)'
                      : 'rgba(10, 10, 10, 0.30)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: isHighlighted
                      ? '1px solid transparent'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <h3 className="text-base font-medium text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-4">
                    <span className="text-3xl font-bold text-white">{currencySymbol}{displayPrice}</span>
                    <span className="text-xs font-medium text-zinc-300">/ month</span>
                  </div>

                  <div className="text-xs text-zinc-300 mb-5 min-h-[32px]">
                    {plan.bestFor ? (
                      <div>
                        <span className="block text-white text-xs mb-0.5">{plan.credits} credits per month</span>
                        <span className="block text-[11px]">Best for: {plan.bestFor}</span>
                      </div>
                    ) : (
                      <span className="block leading-relaxed text-xs">
                        Perfect for testing the quality of our AI-generated SEO content.
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 text-left w-full flex-grow mb-6">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 flex-shrink-0 text-[#CA9700]" />
                      <span className="text-xs text-white font-medium">{plan.credits} credits</span>
                    </div>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 flex-shrink-0 text-white/50 mt-0.5" />
                        <span className="text-xs text-white/80 leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleUpgrade(key)}
                    disabled={upgrading === key || isCurrentPlan}
                    className="w-full py-2.5 rounded-full font-semibold text-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#CA9700]/50"
                    style={{
                      backgroundColor: isCurrentPlan ? 'rgba(255,255,255,0.1)' : '#FFFFFF',
                      color: isCurrentPlan ? 'rgba(255,255,255,0.4)' : '#000000',
                      cursor: isCurrentPlan ? 'not-allowed' : 'pointer',
                      border: isCurrentPlan ? '1px solid rgba(255,255,255,0.2)' : 'none'
                    }}
                  >
                    {upgrading === key ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </span>
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : (
                      'Choose Plan'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Credit Breakdown */}
        <div className="mt-24 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="text-center mb-10">
            <h3 className={`text-2xl font-semibold mb-3 ${theme === 'light' ? 'text-black' : 'text-white'}`}>How Credits Work</h3>
            <p className={`text-sm ${theme === 'light' ? 'text-black/60' : 'text-zinc-400'}`}>Credits are deducted based on what you generate</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Blog Generation */}
            <div
              className="p-8 rounded-2xl transition-all border border-white/5 backdrop-blur-xl"
              style={{ background: theme === 'light' ? 'rgba(0, 0, 0, 0.45)' : 'rgba(19, 17, 17, 0.75)' }}
            >
              <h4 className="text-lg font-medium mb-6 text-white text-center">Blog Generation</h4>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <span className="text-zinc-300">1-10 blogs</span>
                  <span className="font-semibold text-white">5 credits each</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <span className="text-zinc-300">11-30 blogs</span>
                  <span className="font-semibold text-white">4 credits each</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300">31-60 blogs</span>
                  <span className="font-semibold text-white">3 credits each</span>
                </div>
              </div>
            </div>

            {/* Site Insights */}
            <div
              className="p-8 rounded-2xl transition-all border border-white/5 backdrop-blur-xl"
              style={{ background: theme === 'light' ? 'rgba(0, 0, 0, 0.45)' : 'rgba(19, 17, 17, 0.75)' }}
            >
              <h4 className="text-lg font-medium mb-6 text-white text-center">Site Insights</h4>
              <div className="space-y-4 text-sm h-full flex flex-col justify-start">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <span className="text-zinc-300">Per analysis</span>
                  <span className="font-semibold text-white">20 credits</span>
                </div>
                <div className="mt-auto pt-4 text-center">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Includes SERP analysis, competitor mapping, and AI recommendations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-24 mb-16 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '400ms' }}>
          <h3 className={`text-2xl font-semibold mb-10 text-center ${theme === 'light' ? 'text-black' : 'text-white'}`}>Frequently Asked Questions</h3>
          <div className="space-y-4">
            {[
              { q: 'Can I cancel anytime?', a: "Yes! You can cancel your subscription at any time. You'll keep your remaining credits until the end of your billing period." },
              { q: 'Do credits roll over?', a: "Credits reset monthly with your subscription. Unused credits don't roll over to the next month to ensure optimal server availability." },
              { q: 'What payment methods do you accept?', a: 'We accept all major credit cards via Stripe (international) and UPI/cards via Razorpay (India).' },
              { q: 'Can I upgrade or downgrade my plan?', a: "Yes! You can upgrade or downgrade at any time. Changes take effect immediately, and we'll prorate the difference automatically." },
            ].map((faq, idx) => (
              <details
                key={idx}
                className="group p-5 cursor-pointer rounded-2xl transition-all duration-200 backdrop-blur-xl"
                style={{
                  background: theme === 'light' ? 'rgba(220, 215, 200, 0.7)' : 'rgba(19, 17, 17, 0.75)',
                  border: theme === 'light' ? '1px solid rgba(202, 151, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.05)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  if (theme === 'light') {
                    el.style.background = 'rgba(202, 151, 0, 0.18)';
                    el.style.borderColor = 'rgba(202, 151, 0, 0.4)';
                  } else {
                    el.style.background = 'rgba(202, 151, 0, 0.15)';
                    el.style.borderColor = 'rgba(202, 151, 0, 0.35)';
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  if (theme === 'light') {
                    el.style.background = 'rgba(220, 215, 200, 0.7)';
                    el.style.borderColor = 'rgba(202, 151, 0, 0.15)';
                  } else {
                    el.style.background = 'rgba(19, 17, 17, 0.75)';
                    el.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                  }
                }}
              >
                <summary className={`text-base font-medium focus:outline-none ${theme === 'light' ? 'text-black' : 'text-white'}`}>{faq.q}</summary>
                <p className={`mt-3 text-sm leading-relaxed ${theme === 'light' ? 'text-black/70' : 'text-zinc-300'}`}>
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

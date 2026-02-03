'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, ArrowRight, Zap, Shield, Sparkles } from 'lucide-react';
import { api } from '@/utils/api';
import { UserMenu } from '@/components/UserMenu';

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
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionStatus | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');

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
      // User not authenticated or no subscription
      console.log('No subscription status');
    }
  };

  const handleUpgrade = async (tier: string) => {
    setUpgrading(tier);
    try {
      // TODO: Integrate with Stripe/Razorpay payment
      // For now, just call the upgrade endpoint
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const paidPlans = Object.entries(plans).filter(([key]) => key !== 'free');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="text-[21px] font-medium text-foreground tracking-tight">infini8seo</div>
            <UserMenu />
          </div>

          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-[28px] font-semibold text-foreground mb-3">
              Choose Your Plan
            </h1>
            <p className="text-[15px] text-secondary-foreground">
              Start with 10 free credits. Upgrade anytime for more content and site insights.
            </p>

            {/* Currency Toggle */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                  currency === 'USD'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setCurrency('INR')}
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                  currency === 'INR'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                INR (₹)
              </button>
            </div>
          </div>
        </header>

        {/* Current Subscription Banner */}
        {currentSubscription && currentSubscription.tier !== 'free' && (
          <div className="mb-8 animate-fade-in">
            <div className="card-elevated p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-[14px] font-medium text-foreground">
                    Current Plan: {currentSubscription.tier.charAt(0).toUpperCase() + currentSubscription.tier.slice(1)}
                  </div>
                  <div className="text-[12px] text-secondary-foreground">
                    {currentSubscription.creditsRemaining} / {currentSubscription.creditsTotal} credits remaining
                  </div>
                </div>
              </div>
              <button
                onClick={() => router.push('/')}
                className="btn-secondary text-[13px] h-9"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '100ms' }}>
          {paidPlans.map(([key, plan]) => {
            const isCurrentPlan = currentSubscription?.tier === key;
            const displayPrice = currency === 'INR' && plan.priceINR ? plan.priceINR : plan.price;
            const currencySymbol = currency === 'INR' ? '₹' : '$';

            return (
              <div
                key={key}
                className={`card-elevated p-6 relative ${
                  plan.popular ? 'ring-2 ring-primary/50' : ''
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6">
                  <h3 className="text-[20px] font-semibold text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-[32px] font-bold text-foreground">
                      {currencySymbol}{displayPrice}
                    </span>
                    <span className="text-[14px] text-secondary-foreground">/month</span>
                  </div>
                  <div className="text-[13px] text-secondary-foreground">
                    {plan.credits} credits per month
                  </div>
                  {plan.bestFor && (
                    <div className="mt-2 text-[12px] text-muted-foreground">
                      Best for: {plan.bestFor}
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-[13px] text-secondary-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleUpgrade(key)}
                  disabled={upgrading === key || isCurrentPlan}
                  className={`w-full h-10 rounded-md font-medium text-[14px] transition-all flex items-center justify-center ${
                    isCurrentPlan
                      ? 'bg-secondary text-secondary-foreground cursor-not-allowed'
                      : plan.popular
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                >
                  {upgrading === key ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Current Plan
                    </>
                  ) : (
                    <>
                      Upgrade to {plan.name}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Free Tier Info */}
        {plans.free && (
          <div className="mt-8 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="card-elevated p-6 bg-secondary/30">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-[16px] font-medium text-foreground mb-2">
                    Free Tier
                  </h4>
                  <p className="text-[13px] text-secondary-foreground mb-3">
                    Get started with {plans.free.credits} free credits. Perfect for testing the quality of our AI-generated content.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {plans.free.features.map((feature, idx) => (
                      <div key={idx} className="px-2 py-1 rounded bg-card text-[11px] text-secondary-foreground">
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Credit Breakdown */}
        <div className="mt-12 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="text-center mb-6">
            <h3 className="text-[18px] font-semibold text-foreground mb-2">
              How Credits Work
            </h3>
            <p className="text-[13px] text-secondary-foreground">
              Credits are deducted based on what you generate
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blog Generation */}
            <div className="card-elevated p-5">
              <h4 className="text-[15px] font-medium text-foreground mb-3">
                Blog Generation
              </h4>
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-secondary-foreground">1-10 blogs</span>
                  <span className="font-medium text-foreground">5 credits each</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-foreground">11-30 blogs</span>
                  <span className="font-medium text-foreground">4 credits each</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-foreground">31-60 blogs</span>
                  <span className="font-medium text-foreground">3 credits each</span>
                </div>
              </div>
            </div>

            {/* Site Insights */}
            <div className="card-elevated p-5">
              <h4 className="text-[15px] font-medium text-foreground mb-3">
                Site Insights
              </h4>
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-secondary-foreground">Per analysis</span>
                  <span className="font-medium text-foreground">20 credits</span>
                </div>
                <div className="mt-3 pt-3 border-t border-border/30">
                  <p className="text-[12px] text-muted-foreground">
                    Includes SERP analysis, competitor mapping, and AI recommendations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '400ms' }}>
          <h3 className="text-[18px] font-semibold text-foreground mb-6 text-center">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            <details className="card-elevated p-4 cursor-pointer">
              <summary className="text-[14px] font-medium text-foreground">
                Can I cancel anytime?
              </summary>
              <p className="mt-2 text-[13px] text-secondary-foreground">
                Yes! You can cancel your subscription at any time. You'll keep your remaining credits until the end of your billing period.
              </p>
            </details>

            <details className="card-elevated p-4 cursor-pointer">
              <summary className="text-[14px] font-medium text-foreground">
                Do credits roll over?
              </summary>
              <p className="mt-2 text-[13px] text-secondary-foreground">
                Credits reset monthly with your subscription. Unused credits don't roll over to the next month.
              </p>
            </details>

            <details className="card-elevated p-4 cursor-pointer">
              <summary className="text-[14px] font-medium text-foreground">
                What payment methods do you accept?
              </summary>
              <p className="mt-2 text-[13px] text-secondary-foreground">
                We accept all major credit cards via Stripe (international) and UPI/cards via Razorpay (India).
              </p>
            </details>

            <details className="card-elevated p-4 cursor-pointer">
              <summary className="text-[14px] font-medium text-foreground">
                Can I upgrade or downgrade my plan?
              </summary>
              <p className="mt-2 text-[13px] text-secondary-foreground">
                Yes! You can upgrade or downgrade at any time. Changes take effect immediately, and we'll prorate the difference.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

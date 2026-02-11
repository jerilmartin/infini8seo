'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, ArrowRight, Zap, Shield, Sparkles } from 'lucide-react';
import { api } from '@/utils/api';
import { UserMenu } from '@/components/UserMenu';
import { useTheme } from '@/contexts/ThemeContext';

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
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: theme === 'dark' ? '#000000' : '#FFFEF9' }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FFC004' }} />
      </div>
    );
  }

  const paidPlans = Object.entries(plans).filter(([key]) => key !== 'free');

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ background: theme === 'dark' ? '#000000' : '#FFFEF9' }}
    >
      {/* Dark mode golden blur - diagonal from top-left to bottom-right */}
      {theme === 'dark' && (
        <div 
          className="absolute pointer-events-none z-0"
          style={{
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'linear-gradient(to bottom right, transparent 0%, transparent 20%, rgba(255, 192, 4, 0.15) 35%, rgba(255, 192, 4, 0.25) 50%, rgba(255, 192, 4, 0.15) 65%, transparent 80%, transparent 100%)',
            filter: 'blur(500px)'
          }}
        />
      )}
      {/* Light mode golden blur - diagonal from top-left to bottom-right */}
      {theme === 'light' && (
        <div 
          className="absolute pointer-events-none z-0"
          style={{
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'linear-gradient(to bottom right, transparent 0%, transparent 25%, rgba(171, 128, 0, 0.08) 40%, rgba(171, 128, 0, 0.12) 50%, rgba(171, 128, 0, 0.08) 60%, transparent 75%, transparent 100%)',
            filter: 'blur(350px)'
          }}
        />
      )}

      <div className="max-w-7xl mx-auto px-6 py-4 relative z-10">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="font-semibold transition-opacity hover:opacity-80"
                style={{ fontSize: '24px', lineHeight: '1' }}
              >
                <span style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>infini8</span>
                <span className="text-[#FFC004]"> SEO</span>
              </button>
              
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-10 h-10 rounded-lg hover:opacity-80 transition-opacity"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
            <UserMenu />
          </div>

          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-[28px] font-semibold mb-3" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
              Choose Your Plan
            </h1>
            <p className="text-[15px]" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>
              Start with 10 free credits. Upgrade anytime for more content and site insights.
            </p>

            {/* Currency Toggle */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all`}
                style={currency === 'USD' ? (theme === 'light' ? {
                  background: 'linear-gradient(180deg, rgba(171, 128, 0, 0.15) 0%, rgba(255, 192, 4, 0.25) 50%, rgba(171, 128, 0, 0.15) 100%)',
                  color: '#000000'
                } : {
                  background: '#241A06',
                  color: '#FFFFFF'
                }) : {
                  color: theme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'
                }}
              >
                USD ($)
              </button>
              <button
                onClick={() => setCurrency('INR')}
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all`}
                style={currency === 'INR' ? (theme === 'light' ? {
                  background: 'linear-gradient(180deg, rgba(171, 128, 0, 0.15) 0%, rgba(255, 192, 4, 0.25) 50%, rgba(171, 128, 0, 0.15) 100%)',
                  color: '#000000'
                } : {
                  background: '#241A06',
                  color: '#FFFFFF'
                }) : {
                  color: theme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'
                }}
              >
                INR (₹)
              </button>
            </div>
          </div>
        </header>

        {/* Current Subscription Banner */}
        {currentSubscription && currentSubscription.tier !== 'free' && (
          <div className="mb-8 animate-fade-in">
            <div 
              className="p-4 flex items-center justify-between rounded-xl"
              style={theme === 'light' ? {
                background: 'linear-gradient(to right, rgb(223, 217, 199) 0%, rgb(235, 230, 215) 50%, rgb(245, 242, 235) 100%)',
                border: '1px solid rgba(171, 128, 0, 0.3)'
              } : {
                background: 'rgba(255, 192, 4, 0.08)',
                border: '1px solid rgba(255, 192, 4, 0.2)'
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: theme === 'dark' ? 'rgba(255, 192, 4, 0.2)' : 'rgba(171, 128, 0, 0.2)' }}
                >
                  <Sparkles className="w-5 h-5" style={{ color: '#FFC004' }} />
                </div>
                <div>
                  <div className="text-[14px] font-medium" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
                    Current Plan: {currentSubscription.tier.charAt(0).toUpperCase() + currentSubscription.tier.slice(1)}
                  </div>
                  <div className="text-[12px]" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>
                    {currentSubscription.creditsRemaining} / {currentSubscription.creditsTotal} credits remaining
                  </div>
                </div>
              </div>
              <button
                onClick={() => router.push('/')}
                className="text-[13px] h-9 px-4 rounded-lg transition-opacity hover:opacity-80"
                style={theme === 'light' ? {
                  background: 'linear-gradient(180deg, rgba(171, 128, 0, 0.15) 0%, rgba(255, 192, 4, 0.25) 50%, rgba(171, 128, 0, 0.15) 100%)',
                  color: '#000000'
                } : {
                  background: '#241A06',
                  color: '#FFFFFF'
                }}
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
                className="p-6 relative rounded-xl transition-all hover:scale-[1.02]"
                style={{
                  background: 'transparent',
                  border: plan.popular 
                    ? `2px solid ${theme === 'dark' ? '#FFC004' : '#AB8000'}`
                    : `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                }}
                onMouseEnter={(e) => {
                  if (theme === 'light') {
                    e.currentTarget.style.background = 'linear-gradient(to right, rgb(223, 217, 199) 0%, rgb(235, 230, 215) 50%, rgb(245, 242, 235) 100%)';
                  } else {
                    e.currentTarget.style.background = 'rgba(255, 192, 4, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div 
                      className="px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1"
                      style={{
                        background: '#FFC004',
                        color: '#000000'
                      }}
                    >
                      <Zap className="w-3 h-3" />
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6">
                  <h3 className="text-[20px] font-semibold mb-2" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-[32px] font-bold" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
                      {currencySymbol}{displayPrice}
                    </span>
                    <span className="text-[14px]" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>/month</span>
                  </div>
                  <div className="text-[13px]" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>
                    {plan.credits} credits per month
                  </div>
                  {plan.bestFor && (
                    <div className="mt-2 text-[12px]" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }}>
                      Best for: {plan.bestFor}
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#FFC004' }} />
                      <span className="text-[13px]" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)' }}>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleUpgrade(key)}
                  disabled={upgrading === key || isCurrentPlan}
                  className="w-full h-10 rounded-md font-medium text-[14px] transition-all flex items-center justify-center"
                  style={
                    isCurrentPlan
                      ? {
                          background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                          cursor: 'not-allowed'
                        }
                      : plan.popular
                      ? {
                          background: '#FFC004',
                          color: '#000000'
                        }
                      : theme === 'light'
                      ? {
                          background: 'linear-gradient(180deg, rgba(171, 128, 0, 0.15) 0%, rgba(255, 192, 4, 0.25) 50%, rgba(171, 128, 0, 0.15) 100%)',
                          color: '#000000'
                        }
                      : {
                          background: '#241A06',
                          color: '#FFFFFF'
                        }
                  }
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
            <div 
              className="p-6 rounded-xl transition-all"
              style={{
                background: 'transparent',
                border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
              }}
              onMouseEnter={(e) => {
                if (theme === 'light') {
                  e.currentTarget.style.background = 'linear-gradient(to right, rgb(223, 217, 199) 0%, rgb(235, 230, 215) 50%, rgb(245, 242, 235) 100%)';
                } else {
                  e.currentTarget.style.background = 'rgba(171, 128, 0, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: theme === 'dark' ? 'rgba(255, 192, 4, 0.2)' : 'rgba(171, 128, 0, 0.2)' }}
                >
                  <Sparkles className="w-5 h-5" style={{ color: '#FFC004' }} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[16px] font-medium mb-2" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
                    Free Tier
                  </h4>
                  <p className="text-[13px] mb-3" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>
                    Get started with {plans.free.credits} free credits. Perfect for testing the quality of our AI-generated content.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {plans.free.features.map((feature, idx) => (
                      <div 
                        key={idx} 
                        className="px-2 py-1 rounded text-[11px]"
                        style={{
                          background: theme === 'dark' ? 'rgba(255, 192, 4, 0.1)' : 'rgba(171, 128, 0, 0.1)',
                          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
                        }}
                      >
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
            <h3 className="text-[18px] font-semibold mb-2" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
              How Credits Work
            </h3>
            <p className="text-[13px]" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>
              Credits are deducted based on what you generate
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blog Generation */}
            <div 
              className="p-5 rounded-xl transition-all"
              style={{
                background: 'transparent',
                border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
              }}
              onMouseEnter={(e) => {
                if (theme === 'light') {
                  e.currentTarget.style.background = 'linear-gradient(to right, rgb(223, 217, 199) 0%, rgb(235, 230, 215) 50%, rgb(245, 242, 235) 100%)';
                } else {
                  e.currentTarget.style.background = 'rgba(171, 128, 0, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <h4 className="text-[15px] font-medium mb-3" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
                Blog Generation
              </h4>
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>1-10 blogs</span>
                  <span className="font-medium" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>5 credits each</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>11-30 blogs</span>
                  <span className="font-medium" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>4 credits each</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>31-60 blogs</span>
                  <span className="font-medium" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>3 credits each</span>
                </div>
              </div>
            </div>

            {/* Site Insights */}
            <div 
              className="p-5 rounded-xl transition-all"
              style={{
                background: 'transparent',
                border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
              }}
              onMouseEnter={(e) => {
                if (theme === 'light') {
                  e.currentTarget.style.background = 'linear-gradient(to right, rgb(223, 217, 199) 0%, rgb(235, 230, 215) 50%, rgb(245, 242, 235) 100%)';
                } else {
                  e.currentTarget.style.background = 'rgba(171, 128, 0, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <h4 className="text-[15px] font-medium mb-3" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
                Site Insights
              </h4>
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>Per analysis</span>
                  <span className="font-medium" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>20 credits</span>
                </div>
                <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` }}>
                  <p className="text-[12px]" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }}>
                    Includes SERP analysis, competitor mapping, and AI recommendations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '400ms' }}>
          <h3 className="text-[18px] font-semibold mb-6 text-center" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            <details 
              className="p-4 cursor-pointer rounded-xl transition-all"
              style={{
                background: 'transparent',
                border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
              }}
              onMouseEnter={(e) => {
                if (theme === 'light') {
                  e.currentTarget.style.background = 'linear-gradient(to right, rgb(223, 217, 199) 0%, rgb(235, 230, 215) 50%, rgb(245, 242, 235) 100%)';
                } else {
                  e.currentTarget.style.background = 'rgba(171, 128, 0, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <summary className="text-[14px] font-medium" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
                Can I cancel anytime?
              </summary>
              <p className="mt-2 text-[13px]" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>
                Yes! You can cancel your subscription at any time. You'll keep your remaining credits until the end of your billing period.
              </p>
            </details>

            <details 
              className="p-4 cursor-pointer rounded-xl transition-all"
              style={{
                background: 'transparent',
                border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
              }}
              onMouseEnter={(e) => {
                if (theme === 'light') {
                  e.currentTarget.style.background = 'linear-gradient(to right, rgb(223, 217, 199) 0%, rgb(235, 230, 215) 50%, rgb(245, 242, 235) 100%)';
                } else {
                  e.currentTarget.style.background = 'rgba(171, 128, 0, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <summary className="text-[14px] font-medium" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
                Do credits roll over?
              </summary>
              <p className="mt-2 text-[13px]" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>
                Credits reset monthly with your subscription. Unused credits don't roll over to the next month.
              </p>
            </details>

            <details 
              className="p-4 cursor-pointer rounded-xl transition-all"
              style={{
                background: 'transparent',
                border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
              }}
              onMouseEnter={(e) => {
                if (theme === 'light') {
                  e.currentTarget.style.background = 'linear-gradient(to right, rgb(223, 217, 199) 0%, rgb(235, 230, 215) 50%, rgb(245, 242, 235) 100%)';
                } else {
                  e.currentTarget.style.background = 'rgba(171, 128, 0, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <summary className="text-[14px] font-medium" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
                What payment methods do you accept?
              </summary>
              <p className="mt-2 text-[13px]" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>
                We accept all major credit cards via Stripe (international) and UPI/cards via Razorpay (India).
              </p>
            </details>

            <details 
              className="p-4 cursor-pointer rounded-xl transition-all"
              style={{
                background: 'transparent',
                border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
              }}
              onMouseEnter={(e) => {
                if (theme === 'light') {
                  e.currentTarget.style.background = 'linear-gradient(to right, rgb(223, 217, 199) 0%, rgb(235, 230, 215) 50%, rgb(245, 242, 235) 100%)';
                } else {
                  e.currentTarget.style.background = 'rgba(171, 128, 0, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <summary className="text-[14px] font-medium" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
                Can I upgrade or downgrade my plan?
              </summary>
              <p className="mt-2 text-[13px]" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>
                Yes! You can upgrade or downgrade at any time. Changes take effect immediately, and we'll prorate the difference.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

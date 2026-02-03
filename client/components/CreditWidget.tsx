'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '@/utils/api';

interface CreditWidgetProps {
  compact?: boolean;
}

export function CreditWidget({ compact = false }: CreditWidgetProps) {
  const router = useRouter();
  const [credits, setCredits] = useState<{
    remaining: number;
    total: number;
    tier: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const response = await api.get('/api/subscription/status');
      setCredits({
        remaining: response.data.creditsRemaining,
        total: response.data.creditsTotal,
        tier: response.data.tier
      });
    } catch (error: any) {
      console.error('Failed to fetch credits:', error);
      // If unauthorized, user needs to login
      if (error.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-[13px] text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!credits) {
    return null;
  }

  const percentage = (credits.remaining / credits.total) * 100;
  const isLow = percentage < 20 && credits.remaining < 20; // Only warn if both percentage AND absolute value are low

  if (compact) {
    return (
      <button
        onClick={() => router.push('/pricing')}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:bg-secondary transition-colors"
      >
        <Zap className={`w-4 h-4 ${isLow ? 'text-destructive' : 'text-primary'}`} />
        <span className="text-[13px] font-medium text-foreground">
          {credits.remaining}
        </span>
      </button>
    );
  }

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isLow ? 'bg-destructive/10' : 'bg-primary/10'
          }`}>
            <Zap className={`w-4 h-4 ${isLow ? 'text-destructive' : 'text-primary'}`} />
          </div>
          <div>
            <div className="text-[11px] font-medium text-foreground/80 uppercase tracking-wide">
              Credits
            </div>
            <div className="text-[18px] font-semibold text-foreground tabular-nums">
              {credits.remaining} / {credits.total}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-secondary-foreground uppercase tracking-wide">
            Plan
          </div>
          <div className="text-[13px] font-medium text-foreground capitalize">
            {credits.tier}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isLow ? 'bg-destructive' : 'bg-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Warning or CTA */}
      {isLow ? (
        <div className="flex items-center justify-between p-2 rounded-md bg-destructive/10 border border-destructive/20">
          <span className="text-[12px] text-destructive">
            Running low on credits
          </span>
          <button
            onClick={() => router.push('/pricing')}
            className="text-[12px] font-medium text-destructive hover:underline flex items-center gap-1"
          >
            Upgrade
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      ) : credits.tier === 'free' ? (
        <button
          onClick={() => router.push('/pricing')}
          className="w-full btn-primary h-8 text-[12px]"
        >
          Upgrade for More
          <ArrowRight className="w-3 h-3 ml-1" />
        </button>
      ) : (
        <div className="text-center text-[11px] text-secondary-foreground">
          Resets monthly
        </div>
      )}
    </div>
  );
}

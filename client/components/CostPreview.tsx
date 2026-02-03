'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, AlertCircle } from 'lucide-react';
import { api } from '@/utils/api';

interface CostPreviewProps {
  actionType: 'blog_generation' | 'seo_scan';
  params?: {
    totalBlogs?: number;
  };
}

export function CostPreview({ actionType, params }: CostPreviewProps) {
  const router = useRouter();
  const [cost, setCost] = useState<{
    credits: number;
    breakdown: string;
  } | null>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCost();
    fetchUserCredits();
  }, [actionType, params]);

  const fetchCost = async () => {
    try {
      const response = await api.post('/api/subscription/calculate-cost', {
        actionType,
        params
      });
      setCost({
        credits: response.data.credits,
        breakdown: response.data.breakdown
      });
    } catch (error: any) {
      console.error('Failed to calculate cost:', error);
      // If unauthorized, redirect to login
      if (error.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCredits = async () => {
    try {
      const response = await api.get('/api/subscription/status');
      setUserCredits(response.data.creditsRemaining);
    } catch (error: any) {
      console.error('Failed to fetch user credits:', error);
      // If unauthorized, redirect to login
      if (error.response?.status === 401) {
        router.push('/login');
      }
    }
  };

  if (loading || !cost) {
    return null;
  }

  const hasEnough = userCredits !== null && userCredits >= cost.credits;
  const blogsCanGenerate = userCredits ? Math.floor(userCredits / 5) : 0; // Assuming 5 credits per blog

  return (
    <div className={`p-3 rounded-md border ${
      hasEnough 
        ? 'bg-primary/5 border-primary/20' 
        : 'bg-destructive/5 border-destructive/20'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          hasEnough ? 'bg-primary/10' : 'bg-destructive/10'
        }`}>
          {hasEnough ? (
            <Zap className="w-4 h-4 text-primary" />
          ) : (
            <AlertCircle className="w-4 h-4 text-destructive" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-medium text-foreground">
              Credit Cost
            </span>
            <span className="text-[15px] font-semibold text-foreground tabular-nums">
              {cost.credits} credits
            </span>
          </div>
          <div className="text-[11px] text-secondary-foreground mb-2">
            {cost.breakdown}
          </div>
          {userCredits !== null && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                {actionType === 'blog_generation' 
                  ? `You can generate ~${blogsCanGenerate} blogs`
                  : 'Your balance:'}
              </span>
              <span className={`font-medium ${
                hasEnough ? 'text-foreground' : 'text-destructive'
              }`}>
                {userCredits} credits
              </span>
            </div>
          )}
          {!hasEnough && (
            <div className="mt-2 pt-2 border-t border-border/30">
              <a
                href="/pricing"
                className="text-[12px] font-medium text-destructive hover:underline"
              >
                Upgrade to get more credits →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

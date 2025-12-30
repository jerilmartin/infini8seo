'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, Check, X, ArrowLeft, Circle } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface GeneratedTitle {
  title: string;
  type: string;
}

interface JobStatus {
  jobId: string;
  niche: string;
  status: string;
  progress: number;
  totalContentGenerated: number;
  scenariosGenerated?: number;
  errorMessage?: string;
  estimatedSecondsRemaining?: number;
  totalBlogs?: number;
  generatedTitles?: GeneratedTitle[];
}

export default function ProgressPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId as string;

  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(true);

  const fetchJobStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/status/${jobId}`);
      const data = response.data;
      setJobStatus(data);

      if (data.status === 'COMPLETE') {
        setPolling(false);
        setTimeout(() => router.push(`/results/${jobId}`), 1500);
      } else if (data.status === 'FAILED') {
        setPolling(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch status');
      setPolling(false);
    }
  }, [jobId, router]);

  useEffect(() => {
    if (!jobId) return;
    fetchJobStatus();
    if (polling) {
      const interval = setInterval(fetchJobStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [jobId, polling, fetchJobStatus]);

  const formatTime = (seconds?: number) => {
    if (!seconds) return '—';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const getPhase = () => {
    if (!jobStatus) return 'loading';
    switch (jobStatus.status) {
      case 'ENQUEUED': return 'queued';
      case 'RESEARCHING': return 'research';
      case 'RESEARCH_COMPLETE': 
      case 'GENERATING': return 'writing';
      case 'COMPLETE': return 'complete';
      case 'FAILED': return 'failed';
      default: return 'loading';
    }
  };

  const phase = getPhase();
  const totalTarget = jobStatus?.totalBlogs || 30;
  const progress = jobStatus?.progress || 0;
  const generated = jobStatus?.totalContentGenerated || 0;
  const titles = jobStatus?.generatedTitles || [];

  // Determine step states
  const getStepState = (step: string) => {
    if (phase === 'failed') return 'failed';
    if (phase === 'complete') return 'complete';
    
    const stepOrder = ['research', 'topics', 'keywords', 'writing', 'optimization'];
    const currentIndex = phase === 'research' ? 0 : phase === 'writing' ? 3 : -1;
    const stepIndex = stepOrder.indexOf(step);
    
    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="card max-w-md w-full text-center">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <X className="w-5 h-5 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <button onClick={() => router.push('/')} className="btn-primary">
            <ArrowLeft className="w-4 h-4 mr-2" /> Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-8 py-10">
        {/* Header - Expanded Status Area */}
        <header className="mb-10 animate-fade-in">
          <div className="text-[20px] font-medium text-foreground tracking-tight mb-6">infini8seo</div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-2.5 h-2.5 rounded-full ${
              phase === 'complete' ? 'bg-emerald-500' : 
              phase === 'failed' ? 'bg-destructive' : 
              'bg-primary animate-pulse'
            }`} />
            <span className="text-[13px] font-medium text-secondary-foreground uppercase tracking-wide">
              {phase === 'complete' ? 'Complete' : phase === 'failed' ? 'Failed' : 'In Progress'}
            </span>
          </div>
          
          <h1 className="text-[28px] font-semibold text-foreground mb-2">
            {phase === 'complete' ? 'Your content is ready' : 'Building your content engine'}
          </h1>
          {jobStatus && (
            <p className="text-[16px] text-secondary-foreground">
              for "<span className="text-foreground">{jobStatus.niche}</span>"
            </p>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left Column - Progress */}
          <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
            {/* Progress Card */}
            <div className="bg-card/50 rounded-xl p-8">
              {/* Large Progress Display */}
              <div className="mb-8">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-[14px] text-secondary-foreground">Progress</span>
                  <span className="text-[24px] font-semibold text-foreground">{progress}%</span>
                </div>
                <div className="h-2.5 bg-border/60 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      phase === 'complete' ? 'bg-emerald-500' : 'bg-primary'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Step List */}
              <div className="space-y-4">
                {/* Research step */}
                <StepItem 
                  state={phase === 'research' ? 'active' : ['writing', 'complete'].includes(phase) ? 'complete' : 'pending'}
                  title="Researching your niche"
                  subtitle={phase === 'research' ? 'Analyzing competitors and trends...' : 
                           jobStatus?.scenariosGenerated ? 'Competitor analysis complete' : undefined}
                />
                
                {/* Topic clustering */}
                <StepItem 
                  state={['writing', 'complete'].includes(phase) ? 'complete' : phase === 'research' && progress > 10 ? 'active' : 'pending'}
                  title="Topic clustering"
                  subtitle={['writing', 'complete'].includes(phase) ? `${jobStatus?.scenariosGenerated || totalTarget} topics identified` : undefined}
                />
                
                {/* Keyword mapping */}
                <StepItem 
                  state={['writing', 'complete'].includes(phase) ? 'complete' : 'pending'}
                  title="Keyword mapping"
                  subtitle={['writing', 'complete'].includes(phase) ? 'SEO keywords assigned' : undefined}
                />
                
                {/* Writing */}
                <StepItem 
                  state={phase === 'writing' ? 'active' : phase === 'complete' ? 'complete' : 'pending'}
                  title="Writing articles"
                  subtitle={phase === 'writing' ? `${generated} of ${totalTarget} completed` : 
                           phase === 'complete' ? `${generated} articles written` : undefined}
                  highlight={phase === 'writing'}
                />
                
                {/* Optimization */}
                <StepItem 
                  state={phase === 'complete' ? 'complete' : 'pending'}
                  title="Structuring & optimization"
                  subtitle={phase === 'complete' ? 'SEO optimization complete' : undefined}
                />
              </div>

              {/* Time estimate */}
              {jobStatus?.estimatedSecondsRemaining && phase !== 'complete' && (
                <div className="mt-8 pt-6 border-t border-border/30">
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-secondary-foreground">Estimated time remaining</span>
                    <span className="text-foreground font-medium">{formatTime(jobStatus.estimatedSecondsRemaining)}</span>
                  </div>
                </div>
              )}

              {/* Error state */}
              {phase === 'failed' && jobStatus?.errorMessage && (
                <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-[14px] text-destructive">{jobStatus.errorMessage}</p>
                </div>
              )}

              {/* Complete state */}
              {phase === 'complete' && (
                <div className="mt-8 pt-6 border-t border-border/30 text-center">
                  <p className="text-[14px] text-secondary-foreground">Redirecting to your content...</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {phase === 'failed' && (
              <div className="mt-6">
                <button onClick={() => router.push('/')} className="btn-primary w-full justify-center">
                  Try again
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Live Titles */}
          <aside className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="bg-card/50 rounded-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[12px] font-medium text-foreground/80 uppercase tracking-wide">Generated so far</p>
                {titles.length > 0 && (
                  <span className="text-[13px] text-secondary-foreground">{titles.length} articles</span>
                )}
              </div>

              {/* Live Titles List */}
              <div className="space-y-4 min-h-[300px]">
                {titles.length === 0 && phase !== 'complete' ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center">
                    {phase === 'research' ? (
                      <>
                        <Loader2 className="w-6 h-6 text-primary animate-spin mb-4" />
                        <p className="text-[14px] text-secondary-foreground">Researching your niche...</p>
                        <p className="text-[13px] text-muted-foreground mt-1">Titles will appear here soon</p>
                      </>
                    ) : (
                      <>
                        <Circle className="w-6 h-6 text-muted-foreground mb-4" />
                        <p className="text-[14px] text-secondary-foreground">Waiting to start...</p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {titles.slice(0, 8).map((item, i) => (
                      <div key={i} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] text-foreground leading-snug truncate">{item.title}</p>
                          <p className="text-[12px] text-muted-foreground mt-0.5">{item.type}</p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Show "writing" indicator for next article */}
                    {phase === 'writing' && titles.length < totalTarget && (
                      <div className="flex items-start gap-3 opacity-60">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Loader2 className="w-3 h-3 text-primary animate-spin" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[15px] text-foreground/60 leading-snug">Writing next article...</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Show remaining count */}
                    {titles.length > 8 && (
                      <p className="text-[13px] text-muted-foreground text-center pt-2">
                        +{titles.length - 8} more articles
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Safe to leave message */}
              {phase !== 'complete' && phase !== 'failed' && (
                <div className="mt-6 pt-6 border-t border-border/30">
                  <p className="text-[13px] text-muted-foreground text-center">
                    You can close this tab — we'll keep working in the background
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// Step Item Component
function StepItem({ 
  state, 
  title, 
  subtitle,
  highlight = false
}: { 
  state: 'pending' | 'active' | 'complete' | 'failed';
  title: string;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 ${highlight ? 'bg-primary/5 -mx-3 px-3 py-2 rounded-lg' : ''}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        state === 'complete' ? 'bg-emerald-500/20' :
        state === 'active' ? 'bg-primary/20' :
        'bg-border/60'
      }`}>
        {state === 'complete' ? (
          <Check className="w-3 h-3 text-emerald-500" />
        ) : state === 'active' ? (
          <Loader2 className="w-3 h-3 text-primary animate-spin" />
        ) : (
          <Circle className="w-2 h-2 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1">
        <div className={`text-[14px] font-medium ${
          state === 'complete' ? 'text-foreground' :
          state === 'active' ? 'text-foreground' :
          'text-muted-foreground'
        }`}>{title}</div>
        {subtitle && (
          <div className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

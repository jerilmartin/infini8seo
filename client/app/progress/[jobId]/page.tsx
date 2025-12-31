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

  // Theme initialization - read from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('results-theme') as 'dark' | 'light' | null;
    document.documentElement.setAttribute('data-theme', savedTheme || 'dark');
  }, []);

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
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      <div className="max-w-[1400px] w-full mx-auto px-6 py-6 h-full flex flex-col">
        {/* Header - Compact */}
        <header className="mb-6 animate-fade-in shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[18px] font-medium text-foreground tracking-tight">infini8seo</div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border">
              <div className={`w-1.5 h-1.5 rounded-full ${phase === 'complete' ? 'bg-emerald-500' :
                phase === 'failed' ? 'bg-destructive' :
                  'bg-primary animate-pulse'
                }`} />
              <span className="text-[11px] font-medium text-foreground uppercase tracking-wide">
                {phase === 'complete' ? 'Complete' : phase === 'failed' ? 'Failed' : 'In Progress'}
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <h1 className="text-[24px] font-semibold text-foreground tracking-tight">
              {phase === 'complete' ? 'Your content is ready' : 'Building your content engine'}
            </h1>
            {jobStatus && (
              <p className="text-[15px] text-secondary-foreground">
                for <span className="text-foreground font-medium">"{jobStatus.niche}"</span>
              </p>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 pb-6">
          {/* Left Column - Progress */}
          <div className="animate-fade-in h-full min-h-0" style={{ animationDelay: '50ms' }}>
            {/* Progress Card */}
            <div className="bg-card border border-border rounded-xl p-6 h-full flex flex-col overflow-y-auto">
              <div>
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Overall Progress</span>
                    <span className="text-[20px] font-semibold text-foreground">{progress}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${phase === 'complete' ? 'bg-emerald-500' : 'bg-primary'
                        }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Step List */}
                <div className="space-y-3">
                  <StepItem
                    state={phase === 'research' ? 'active' : ['writing', 'complete'].includes(phase) ? 'complete' : 'pending'}
                    title="Researching your niche"
                    subtitle={phase === 'research' ? 'Analyzing competitors...' : undefined}
                  />
                  <StepItem
                    state={['writing', 'complete'].includes(phase) ? 'complete' : phase === 'research' && progress > 10 ? 'active' : 'pending'}
                    title="Topic clustering"
                  />
                  <StepItem
                    state={['writing', 'complete'].includes(phase) ? 'complete' : 'pending'}
                    title="Keyword mapping"
                  />
                  <StepItem
                    state={phase === 'writing' ? 'active' : phase === 'complete' ? 'complete' : 'pending'}
                    title="Writing articles"
                    subtitle={phase === 'writing' ? `${generated}/${totalTarget} done` : undefined}
                    highlight={phase === 'writing'}
                  />
                  <StepItem
                    state={phase === 'complete' ? 'complete' : 'pending'}
                    title="Optimization"
                  />
                </div>
              </div>

              {/* Time estimate */}
              {jobStatus?.estimatedSecondsRemaining && phase !== 'complete' && (
                <div className="mt-auto pt-4 border-t border-border/30">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-secondary-foreground">Time remaining</span>
                    <span className="text-foreground font-medium tabular-nums">{formatTime(jobStatus.estimatedSecondsRemaining)}</span>
                  </div>
                </div>
              )}

              {/* Error state */}
              {phase === 'failed' && jobStatus?.errorMessage && (
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-[13px] text-destructive">{jobStatus.errorMessage}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Live Titles */}
          <aside className="animate-fade-in h-full min-h-0" style={{ animationDelay: '100ms' }}>
            <div className="bg-card border border-border rounded-xl p-6 h-full flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Generated Content</p>
                {titles.length > 0 && (
                  <span className="text-[11px] text-foreground px-1.5 py-0.5 bg-secondary border border-border rounded">{titles.length}</span>
                )}
              </div>

              {/* Live Titles List */}
              <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {titles.length === 0 && phase !== 'complete' ? (
                  <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                    {phase === 'research' ? (
                      <>
                        <Loader2 className="w-6 h-6 text-primary animate-spin mb-3" />
                        <p className="text-[14px] text-foreground">Researching...</p>
                      </>
                    ) : (
                      <>
                        <Circle className="w-6 h-6 text-muted-foreground/30 mb-3" />
                        <p className="text-[13px] text-secondary-foreground">Waiting...</p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {titles.slice(0, 15).map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors text-[13px]">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="flex-1 truncate text-foreground/90">{item.title}</span>
                      </div>
                    ))}
                    {phase === 'writing' && (
                      <div className="flex items-center gap-3 p-2 text-[13px] opacity-60">
                        <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
                        <span className="text-foreground/60">Writing next...</span>
                      </div>
                    )}
                  </>
                )}
              </div>
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
    <div className={`flex items-center gap-3 ${highlight ? 'bg-primary/5 -mx-3 px-3 py-2 rounded-lg' : 'py-0.5'}`}>
      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${state === 'complete' ? 'bg-emerald-500/20' :
        state === 'active' ? 'bg-primary/20' :
          'bg-border/60'
        }`}>
        {state === 'complete' ? (
          <Check className="w-2.5 h-2.5 text-emerald-500" />
        ) : state === 'active' ? (
          <Loader2 className="w-2.5 h-2.5 text-primary animate-spin" />
        ) : (
          <Circle className="w-1.5 h-1.5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-medium truncate ${state === 'complete' ? 'text-foreground' :
          state === 'active' ? 'text-foreground' :
            'text-muted-foreground'
          }`}>
          {title}
          {subtitle && <span className="opacity-60 ml-2 font-normal">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, Check, X, ArrowLeft, Circle } from 'lucide-react';
import { api } from '@/utils/api';
import Navbar from '@/components/Navbar';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { theme } = useTheme();

  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(true);

  const fetchJobStatus = useCallback(async () => {
    try {
      const response = await api.get(`/api/status/${jobId}`);
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
    <div className="h-screen overflow-hidden flex flex-col relative">
      {/* Background - Black in dark mode, white in light mode */}
      <div 
        className="absolute inset-0"
        style={{
          background: theme === 'dark' ? '#000000' : '#FFFFFF'
        }}
      />
      
      {/* Golden blur effect - positioned from middle to bottom in dark mode */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: theme === 'dark' 
            ? 'radial-gradient(ellipse 80% 60% at 50% 75%, rgba(255, 192, 4, 0.2) 0%, rgba(255, 192, 4, 0.1) 40%, transparent 70%)'
            : 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(171, 128, 0, 0.15) 0%, transparent 70%)',
          filter: 'blur(100px)',
          opacity: 1
        }}
      />

      <div className="relative z-10">
        <Navbar />
      </div>

      <div className="max-w-[1400px] w-full mx-auto px-6 py-6 h-full flex flex-col relative z-10">
        {/* Page Header */}
        <div className="mb-6 animate-fade-in shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border">
              <div className={`w-1.5 h-1.5 rounded-full ${phase === 'complete' ? 'bg-emerald-500' :
                phase === 'failed' ? 'bg-destructive' :
                  'bg-primary animate-pulse'
                }`} />
              <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
                {phase === 'complete' ? 'Complete' : phase === 'failed' ? 'Failed' : 'In Progress'}
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <h1 className="text-[24px] font-semibold tracking-tight" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
              {phase === 'complete' ? 'Your content is ready' : 'Building your content engine'}
            </h1>
            {jobStatus && (
              <p className="text-[15px]" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
                for <span className="font-medium">"{jobStatus.niche}"</span>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 pb-6">
          {/* Left Column - Progress */}
          <div className="animate-fade-in h-full min-h-0" style={{ animationDelay: '50ms' }}>
            {/* Progress Card */}
            <div 
              className="p-6 h-full flex flex-col overflow-y-auto"
              style={{
                background: theme === 'light' ? 'transparent' : 'rgba(176, 176, 176, 0.1)',
                border: '1px solid rgba(176, 176, 176, 1)',
                borderRadius: '50px'
              }}
            >
              <div>
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[12px] font-medium uppercase tracking-wide" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>Overall Progress</span>
                    <span className="text-[20px] font-semibold" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>{progress}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ 
                        width: `${progress}%`,
                        background: phase === 'complete' ? '#10B981' : 'linear-gradient(90deg, #A88000 0%, #FFC004 100%)'
                      }}
                    />
                  </div>
                </div>

                {/* Step List */}
                <div className="space-y-3">
                  <StepItem
                    state={phase === 'research' ? 'active' : ['writing', 'complete'].includes(phase) ? 'complete' : 'pending'}
                    title="Researching your niche"
                    subtitle={phase === 'research' ? 'Analyzing competitors...' : undefined}
                    theme={theme}
                  />
                  <StepItem
                    state={['writing', 'complete'].includes(phase) ? 'complete' : phase === 'research' && progress > 10 ? 'active' : 'pending'}
                    title="Topic clustering"
                    theme={theme}
                  />
                  <StepItem
                    state={['writing', 'complete'].includes(phase) ? 'complete' : 'pending'}
                    title="Keyword mapping"
                    theme={theme}
                  />
                  <StepItem
                    state={phase === 'writing' ? 'active' : phase === 'complete' ? 'complete' : 'pending'}
                    title="Writing articles"
                    subtitle={phase === 'writing' ? `${generated}/${totalTarget} done` : undefined}
                    highlight={phase === 'writing'}
                    theme={theme}
                  />
                  <StepItem
                    state={phase === 'complete' ? 'complete' : 'pending'}
                    title="Optimization"
                    theme={theme}
                  />
                </div>
              </div>

              {/* Time estimate */}
              {jobStatus?.estimatedSecondsRemaining && phase !== 'complete' && (
                <div className="mt-auto pt-4 border-t border-border/30">
                  <div className="flex items-center justify-between text-[13px]">
                    <span style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>Time remaining</span>
                    <span className="font-medium tabular-nums" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>{formatTime(jobStatus.estimatedSecondsRemaining)}</span>
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
            <div 
              className="border p-6 h-full flex flex-col overflow-hidden"
              style={{
                background: 'rgba(176, 176, 176, 0.1)',
                borderColor: 'rgba(176, 176, 176, 1)',
                borderRadius: '50px'
              }}
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>Generated Content</p>
                {titles.length > 0 && (
                  <span className="text-[11px] px-1.5 py-0.5 bg-secondary border border-border rounded" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>{titles.length}</span>
                )}
              </div>

              {/* Live Titles List */}
              <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {titles.length === 0 && phase !== 'complete' ? (
                  <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                    {phase === 'research' ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin mb-3" style={{ color: '#FFC004' }} />
                        <p className="text-[14px]" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>Researching...</p>
                      </>
                    ) : (
                      <>
                        <Circle className="w-6 h-6 text-muted-foreground/30 mb-3" />
                        <p className="text-[13px]" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>Waiting...</p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {titles.slice(0, 15).map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors text-[13px]">
                        <img src="/assets/tick.svg" alt="Complete" className="w-5 h-5 shrink-0" />
                        <span className="flex-1 truncate" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>{item.title}</span>
                      </div>
                    ))}
                    {phase === 'writing' && (
                      <div className="flex items-center gap-3 p-2 text-[13px] opacity-60">
                        <div className="relative w-5 h-5 shrink-0">
                          {/* Static outer circle */}
                          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0">
                            <path d="M10.6667 21.3333C16.5577 21.3333 21.3333 16.5577 21.3333 10.6667C21.3333 4.77563 16.5577 0 10.6667 0C4.77563 0 0 4.77563 0 10.6667C0 16.5577 4.77563 21.3333 10.6667 21.3333Z" fill="#8D7326" fillOpacity="0.5"/>
                          </svg>
                          {/* Rotating inner lines */}
                          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 animate-spin">
                            <path d="M11 5V7.40003" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M15.2436 6.75781L13.5465 8.45489" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M17 11H14.6" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M15.2436 15.243L13.5465 13.5459" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M11 17.0006V14.6006" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6.75664 15.243L8.45372 13.5459" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M5 11H7.40002" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6.75664 6.75781L8.45372 8.45489" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M8.7043 5.45703L9.16351 6.56571" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M5.45586 8.7041L6.56452 9.16335" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M5.45586 13.2961L6.56452 12.8369" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M8.7043 16.5432L9.16351 15.4346" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M13.2956 16.5432L12.8363 15.4346" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M16.5442 13.2961L15.4355 12.8369" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M16.5442 8.7041L15.4355 9.16335" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M13.2956 5.45703L12.8363 6.56571" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>Writing next...</span>
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
  highlight = false,
  theme
}: {
  state: 'pending' | 'active' | 'complete' | 'failed';
  title: string;
  subtitle?: string;
  highlight?: boolean;
  theme: 'dark' | 'light';
}) {
  return (
    <div className={`flex items-center gap-3 ${highlight ? 'bg-primary/5 -mx-3 px-3 py-2 rounded-lg' : 'py-0.5'}`}>
      <div className="w-5 h-5 flex items-center justify-center shrink-0 relative">
        {state === 'complete' ? (
          <img src="/assets/tick.svg" alt="Complete" className="w-5 h-5" />
        ) : state === 'active' ? (
          <div className="relative w-5 h-5">
            {/* Static outer circle */}
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0">
              <path d="M10.6667 21.3333C16.5577 21.3333 21.3333 16.5577 21.3333 10.6667C21.3333 4.77563 16.5577 0 10.6667 0C4.77563 0 0 4.77563 0 10.6667C0 16.5577 4.77563 21.3333 10.6667 21.3333Z" fill="#8D7326" fillOpacity="0.5"/>
            </svg>
            {/* Rotating inner lines */}
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 animate-spin">
              <path d="M11 5V7.40003" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15.2436 6.75781L13.5465 8.45489" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 11H14.6" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15.2436 15.243L13.5465 13.5459" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 17.0006V14.6006" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.75664 15.243L8.45372 13.5459" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 11H7.40002" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.75664 6.75781L8.45372 8.45489" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.7043 5.45703L9.16351 6.56571" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5.45586 8.7041L6.56452 9.16335" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5.45586 13.2961L6.56452 12.8369" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.7043 16.5432L9.16351 15.4346" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.2956 16.5432L12.8363 15.4346" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16.5442 13.2961L15.4355 12.8369" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16.5442 8.7041L15.4355 9.16335" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.2956 5.45703L12.8363 6.56571" stroke="#AB8000" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ) : (
          <img src="/assets/pending.svg" alt="Pending" className="w-5 h-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-medium truncate`} style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>
          {title}
          {subtitle && <span className="opacity-60 ml-2 font-normal">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, Brain, Pencil, Home, RefreshCw } from 'lucide-react';
import axios from 'axios';
import dynamic from 'next/dynamic';

const GridScan = dynamic(() => import('../../components/GridScan'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
      setError(err.response?.data?.message || 'Failed to fetch job status');
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
    if (!seconds) return '--';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const getPhase = () => {
    if (!jobStatus) return 'loading';
    switch (jobStatus.status) {
      case 'ENQUEUED': return 'queued';
      case 'RESEARCHING': return 'research';
      case 'RESEARCH_COMPLETE': return 'research-done';
      case 'GENERATING': return 'generating';
      case 'COMPLETE': return 'complete';
      case 'FAILED': return 'failed';
      default: return 'loading';
    }
  };

  const phase = getPhase();
  const totalTarget = jobStatus?.totalBlogs || 30;
  const progress = jobStatus?.progress || 0;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative">
        <div className="fixed inset-0 -z-10">
          <GridScan linesColor="#1a1625" scanColor="#ef4444" scanOpacity={0.3} gridScale={0.08} />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        </div>
        <div className="card max-w-md w-full text-center glow-box">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Error</h2>
          <p className="text-muted-foreground mb-6 text-sm">{error}</p>
          <button onClick={() => router.push('/')} className="btn-primary">
            <Home className="w-4 h-4 mr-2" /> Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 -z-10">
        <GridScan
          linesColor="#1a1625"
          scanColor={phase === 'complete' ? '#10b981' : '#8b5cf6'}
          scanOpacity={0.5}
          gridScale={0.06}
          scanDuration={2}
          scanDelay={0.5}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </div>

      <div className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {phase === 'complete' ? 'Complete!' : 'Generating Content'}
            </h1>
            {jobStatus && <p className="text-sm text-muted-foreground">{jobStatus.niche}</p>}
          </div>

          {/* Progress Card */}
          <div className="card glow-box animate-fade-in-up">
            {/* Circular Progress */}
            <div className="flex justify-center mb-6">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="48" stroke="hsl(var(--secondary))" strokeWidth="6" fill="none" />
                  <circle
                    cx="56" cy="56" r="48"
                    stroke={phase === 'complete' ? '#10b981' : 'hsl(var(--primary))'}
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={301.6}
                    strokeDashoffset={301.6 - (301.6 * progress) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                    style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.5))' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{progress}%</span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="text-center mb-6">
              {phase === 'queued' && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Starting...</span>
                </div>
              )}
              {phase === 'research' && (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Brain className="w-4 h-4 animate-pulse" />
                  <span className="text-sm">Researching niche...</span>
                </div>
              )}
              {(phase === 'research-done' || phase === 'generating') && (
                <div className="flex items-center justify-center gap-2 text-accent">
                  <Pencil className="w-4 h-4 animate-pulse" />
                  <span className="text-sm">Writing posts...</span>
                </div>
              )}
              {phase === 'complete' && (
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">Redirecting...</span>
                </div>
              )}
              {phase === 'failed' && (
                <div className="flex items-center justify-center gap-2 text-destructive">
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm">Failed</span>
                </div>
              )}
            </div>

            {/* Phase Indicators */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={`p-3 rounded-lg border ${
                phase === 'research' ? 'border-primary/50 bg-primary/10' :
                ['research-done', 'generating', 'complete'].includes(phase) ? 'border-emerald-500/50 bg-emerald-500/10' :
                'border-border/30 bg-secondary/20'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Brain className={`w-3 h-3 ${
                    phase === 'research' ? 'text-primary animate-pulse' :
                    ['research-done', 'generating', 'complete'].includes(phase) ? 'text-emerald-400' :
                    'text-muted-foreground'
                  }`} />
                  <span className="text-xs font-medium">Research</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {jobStatus?.scenariosGenerated ? `${jobStatus.scenariosGenerated} scenarios` : phase === 'research' ? 'In progress...' : 'Pending'}
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${
                phase === 'generating' ? 'border-accent/50 bg-accent/10' :
                phase === 'complete' ? 'border-emerald-500/50 bg-emerald-500/10' :
                'border-border/30 bg-secondary/20'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Pencil className={`w-3 h-3 ${
                    phase === 'generating' ? 'text-accent animate-pulse' :
                    phase === 'complete' ? 'text-emerald-400' :
                    'text-muted-foreground'
                  }`} />
                  <span className="text-xs font-medium">Content</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {(phase === 'generating' || phase === 'complete') ? `${jobStatus?.totalContentGenerated || 0}/${totalTarget}` : 'Waiting...'}
                </div>
              </div>
            </div>

            {/* Time Remaining */}
            {jobStatus?.estimatedSecondsRemaining && phase !== 'complete' && (
              <div className="text-center text-xs text-muted-foreground">
                ~{formatTime(jobStatus.estimatedSecondsRemaining)} remaining
              </div>
            )}

            {/* Error */}
            {phase === 'failed' && jobStatus?.errorMessage && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                {jobStatus.errorMessage}
              </div>
            )}
          </div>

          {/* Retry Button */}
          {phase === 'failed' && (
            <div className="flex justify-center mt-6">
              <button onClick={() => router.push('/')} className="btn-primary">
                <RefreshCw className="w-4 h-4 mr-2" /> Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

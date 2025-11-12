'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, Brain, Pencil } from 'lucide-react';
import axios from 'axios';

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
  completedAt?: string;
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

      // Stop polling if job is complete or failed
      if (data.status === 'COMPLETE') {
        setPolling(false);
        // Redirect to results page after a brief delay
        setTimeout(() => {
          router.push(`/results/${jobId}`);
        }, 2000);
      } else if (data.status === 'FAILED') {
        setPolling(false);
      }
    } catch (err: any) {
      console.error('Error fetching job status:', err);
      setError(err.response?.data?.message || 'Failed to fetch job status');
      setPolling(false);
    }
  }, [jobId, router]);

  useEffect(() => {
    if (!jobId) return;

    // Initial fetch
    fetchJobStatus();

    // Set up polling interval
    if (polling) {
      const intervalId = setInterval(fetchJobStatus, 3000); // Poll every 3 seconds

      return () => clearInterval(intervalId);
    }
  }, [jobId, polling, fetchJobStatus]);

  const getStatusDisplay = () => {
    if (!jobStatus) return { text: 'Loading...', color: 'text-gray-600' };

    switch (jobStatus.status) {
      case 'ENQUEUED':
        return { text: 'Queued', color: 'text-blue-600', icon: Loader2 };
      case 'RESEARCHING':
        return { text: 'Deep Research in Progress', color: 'text-purple-600', icon: Brain };
      case 'RESEARCH_COMPLETE':
        return { text: 'Research Complete', color: 'text-green-600', icon: CheckCircle2 };
      case 'GENERATING':
        return { text: 'Generating Content', color: 'text-indigo-600', icon: Pencil };
      case 'COMPLETE':
        return { text: 'Complete!', color: 'text-green-600', icon: CheckCircle2 };
      case 'FAILED':
        return { text: 'Failed', color: 'text-red-600', icon: XCircle };
      default:
        return { text: jobStatus.status, color: 'text-gray-600', icon: Loader2 };
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'Calculating...';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon || Loader2;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="btn-primary"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Content Generation in Progress
          </h1>
          {jobStatus && (
            <p className="text-lg text-gray-600">
              Niche: <span className="font-semibold">{jobStatus.niche}</span>
            </p>
          )}
        </div>

        {/* Main Status Card */}
        <div className="card mb-6">
          {/* Status Badge */}
          <div className="flex items-center justify-center mb-6">
            <div className={`flex items-center ${statusDisplay.color}`}>
              <StatusIcon className={`w-8 h-8 mr-3 ${jobStatus?.status !== 'COMPLETE' && jobStatus?.status !== 'FAILED' ? 'animate-spin' : ''}`} />
              <span className="text-2xl font-bold">{statusDisplay.text}</span>
            </div>
          </div>

          {/* Progress Bar */}
          {jobStatus && (
            <>
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span className="font-semibold">{jobStatus.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="progress-bar h-full"
                    style={{ width: `${jobStatus.progress}%` }}
                  />
                </div>
              </div>

              {/* Phase Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {/* Phase A Status */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Brain className="w-5 h-5 text-purple-600 mr-2" />
                    <h3 className="font-semibold text-purple-900">Phase A: Research</h3>
                  </div>
                  {jobStatus.scenariosGenerated ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">
                        {jobStatus.scenariosGenerated} scenarios generated
                      </span>
                    </div>
                  ) : jobStatus.status === 'RESEARCHING' ? (
                    <div className="flex items-center text-purple-600">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span className="text-sm">Analyzing market data...</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-600">Pending</span>
                  )}
                </div>

                {/* Phase B Status */}
                <div className="bg-indigo-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Pencil className="w-5 h-5 text-indigo-600 mr-2" />
                    <h3 className="font-semibold text-indigo-900">Phase B: Content</h3>
                  </div>
                  {jobStatus.status === 'GENERATING' || jobStatus.status === 'COMPLETE' ? (
                    <div className="text-sm">
                      <div className="flex items-center text-indigo-600 mb-1">
                        {jobStatus.status === 'COMPLETE' ? (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        ) : (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        <span className="font-medium">
                          {jobStatus.totalContentGenerated} / 50 posts
                        </span>
                      </div>
                      {jobStatus.estimatedSecondsRemaining && (
                        <span className="text-xs text-gray-600">
                          Est. time: {formatTime(jobStatus.estimatedSecondsRemaining)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-600">Waiting for research...</span>
                  )}
                </div>
              </div>

              {/* Estimated Time Remaining */}
              {jobStatus.estimatedSecondsRemaining && jobStatus.status !== 'COMPLETE' && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Estimated time remaining: <span className="font-semibold">{formatTime(jobStatus.estimatedSecondsRemaining)}</span>
                  </p>
                </div>
              )}

              {/* Error Message */}
              {jobStatus.status === 'FAILED' && jobStatus.errorMessage && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{jobStatus.errorMessage}</p>
                </div>
              )}

              {/* Completion Message */}
              {jobStatus.status === 'COMPLETE' && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  <p className="text-green-700 font-semibold mb-2">
                    All 50 blog posts generated successfully!
                  </p>
                  <p className="text-sm text-green-600">
                    Redirecting to results...
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info Box */}
        <div className="card bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">What's happening?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">🔍</span>
              <span><strong>Phase A:</strong> AI performs deep market research on your niche using real-time data</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✍️</span>
              <span><strong>Phase B:</strong> Generates 50 unique, SEO-optimized blog posts concurrently</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">⏱️</span>
              <span>This process typically takes 10-15 minutes</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        {jobStatus?.status === 'FAILED' && (
          <div className="text-center mt-6">
            <button
              onClick={() => router.push('/')}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


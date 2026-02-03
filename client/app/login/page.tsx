'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginWithGoogle } from '@/utils/auth';
import { Loader2, AlertCircle } from 'lucide-react';

function LoginContent() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const savedTheme = localStorage.getItem('results-theme') as 'dark' | 'light' | null;
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        // Check for error in URL params
        const errorParam = searchParams.get('error');
        if (errorParam) {
            const errorMessages: Record<string, string> = {
                'auth_failed': 'Login failed. Please try again or check your internet connection.',
                'no_code': 'Authorization failed. Please try again.',
                'no_user': 'Could not retrieve your account. Please try again.',
                'callback_failed': 'Login process interrupted. Please try again.',
                'session_failed': 'Session could not be established. Please try again.',
                'no_session': 'Login session expired. Please try again.',
            };
            setError(errorMessages[errorParam] || 'An error occurred during login. Please try again.');
        }
    }, [searchParams]);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');

        try {
            await loginWithGoogle();
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || err.error_description || 'Failed to initiate login. Please check your internet connection and try again.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
            {/* Background gradient */}
            <div
                className="fixed inset-0 -z-10"
                style={{
                    background: 'radial-gradient(ellipse at center top, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
                }}
            />

            {/* Login Card */}
            <div className="w-full max-w-md">
                {/* Brand */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="text-2xl font-semibold text-foreground tracking-tight">Infini8seo</span>
                    </div>
                    <p className="text-muted-foreground text-[15px]">
                        AI-powered SEO & Content Intelligence
                    </p>
                </div>

                {/* Card */}
                <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
                    <div className="text-center mb-6">
                        <h1 className="text-xl font-semibold text-foreground mb-2">Welcome back</h1>
                        <p className="text-sm text-muted-foreground">
                            Sign in to access your content factory and credits
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    {/* Google Sign In Button */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-white text-gray-800 font-medium text-[15px] hover:bg-gray-50 transition-all duration-200 shadow-sm border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Connecting...</span>
                            </>
                        ) : (
                            <>
                                {/* Google Icon */}
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                <span>Continue with Google</span>
                            </>
                        )}
                    </button>

                    <p className="mt-6 text-center text-xs text-muted-foreground">
                        By signing in, you agree to our{' '}
                        <a href="#" className="text-foreground hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="#" className="text-foreground hover:underline">Privacy Policy</a>
                    </p>
                </div>

                {/* What You Get */}
                <div className="mt-6 p-5 rounded-xl bg-secondary/30 border border-border/50">
                    <div className="text-center mb-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                            <span className="text-[11px] font-medium text-primary uppercase tracking-wide">
                                Free to Start
                            </span>
                        </div>
                        <h3 className="text-[15px] font-semibold text-foreground mb-1">
                            Get 10 Free Credits
                        </h3>
                        <p className="text-[12px] text-muted-foreground">
                            Start creating content immediately after signup
                        </p>
                    </div>

                    <div className="space-y-2.5">
                        <div className="flex items-start gap-2.5">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[13px] font-medium text-foreground">Generate 2 AI Blogs</p>
                                <p className="text-[11px] text-muted-foreground">SEO-optimized, ready to publish</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[13px] font-medium text-foreground">Site Insight Analysis</p>
                                <p className="text-[11px] text-muted-foreground">Deep SEO & competitor insights</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[13px] font-medium text-foreground">Upgrade Anytime</p>
                                <p className="text-[11px] text-muted-foreground">From $9/month for 120 credits</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="mt-8 text-center text-xs text-muted-foreground">
                    © 2025 Infini8 × 88GB. All rights reserved.
                </p>
            </div>
        </div>
    );
}

function LoginSkeleton() {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="text-2xl font-semibold text-foreground tracking-tight">Infini8seo</span>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-8 shadow-xl animate-pulse">
                    <div className="h-6 bg-secondary rounded w-1/2 mx-auto mb-4"></div>
                    <div className="h-4 bg-secondary rounded w-3/4 mx-auto mb-6"></div>
                    <div className="h-12 bg-secondary rounded-xl w-full"></div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoginSkeleton />}>
            <LoginContent />
        </Suspense>
    );
}

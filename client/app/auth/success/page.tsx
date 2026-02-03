'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authStorage, supabase, exchangeSupabaseSession } from '@/utils/auth';
import { useAuth } from '@/components/AuthProvider';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

function AuthSuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshUser } = useAuth();
    const [error, setError] = useState('');
    const [status, setStatus] = useState('Processing login...');

    useEffect(() => {
        const handleAuth = async () => {
            try {
                setStatus('Verifying authentication...');
                
                // Check if we have a token from old flow
                const token = searchParams.get('token');
                
                if (token) {
                    // Old server-side flow
                    setStatus('Completing login...');
                    authStorage.setToken(token);
                    await refreshUser();
                    setTimeout(() => router.push('/'), 1500);
                    return;
                }

                // New client-side flow - wait a bit for Supabase to process the OAuth callback
                await new Promise(resolve => setTimeout(resolve, 500));

                // Get session from Supabase with retry logic
                let session = null;
                let attempts = 0;
                const maxAttempts = 3;

                while (!session && attempts < maxAttempts) {
                    attempts++;
                    setStatus(`Retrieving session (${attempts}/${maxAttempts})...`);
                    
                    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

                    if (sessionError) {
                        console.error(`Session error (attempt ${attempts}):`, sessionError);
                        if (attempts === maxAttempts) {
                            // Try to clear any stale session and redirect
                            await supabase.auth.signOut();
                            setError('Failed to retrieve session. Please try logging in again.');
                            setTimeout(() => router.push('/login'), 3000);
                            return;
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    }

                    if (currentSession) {
                        session = currentSession;
                        break;
                    }

                    // Wait before retry
                    if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                if (!session) {
                    console.error('No session found after retries');
                    // Clear any stale data
                    await supabase.auth.signOut();
                    authStorage.removeToken();
                    setError('Session not found. Please try logging in again.');
                    setTimeout(() => router.push('/login'), 3000);
                    return;
                }

                setStatus('Connecting to server...');
                
                // Exchange Supabase token for backend JWT
                const backendToken = await exchangeSupabaseSession(session.access_token);

                // Save backend token
                authStorage.setToken(backendToken);

                setStatus('Loading your account...');
                
                // Refresh user in context
                await refreshUser();

                setStatus('Success! Redirecting...');
                
                // Redirect to home
                setTimeout(() => router.push('/'), 1500);
            } catch (err: any) {
                console.error('Auth error:', err);
                // Clear any stale data on error
                await supabase.auth.signOut().catch(() => {});
                authStorage.removeToken();
                setError(err.message || 'Authentication failed. Please try again.');
                setTimeout(() => router.push('/login'), 3000);
            }
        };

        handleAuth();
    }, [searchParams, router, refreshUser]);

    if (error) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <div className="mb-6 flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                    </div>

                    <h1 className="text-xl font-semibold text-foreground mb-2">
                        Authentication Error
                    </h1>
                    <p className="text-muted-foreground text-sm mb-6">
                        {error}
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => router.push('/login')}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                            Try Again
                        </button>
                        <p className="text-xs text-muted-foreground">
                            Redirecting automatically in a moment...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
            <div className="text-center">
                <div className="mb-6 flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                </div>

                <h1 className="text-xl font-semibold text-foreground mb-2">
                    Login Successful!
                </h1>
                <p className="text-muted-foreground text-sm mb-6">
                    {status}
                </p>

                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
            </div>
        </div>
    );
}

function AuthSuccessSkeleton() {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">Processing login...</p>
            </div>
        </div>
    );
}

export default function AuthSuccessPage() {
    return (
        <Suspense fallback={<AuthSuccessSkeleton />}>
            <AuthSuccessContent />
        </Suspense>
    );
}

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

    useEffect(() => {
        const handleAuth = async () => {
            try {
                // Check if we have a token from old flow
                const token = searchParams.get('token');
                
                if (token) {
                    // Old server-side flow
                    authStorage.setToken(token);
                    await refreshUser();
                    setTimeout(() => router.push('/'), 1500);
                    return;
                }

                // New client-side flow - get session from Supabase
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('Session error:', sessionError);
                    setError(sessionError.message);
                    setTimeout(() => router.push('/login?error=session_failed'), 2000);
                    return;
                }

                if (!session) {
                    console.error('No session found');
                    setTimeout(() => router.push('/login?error=no_session'), 2000);
                    return;
                }

                // Exchange Supabase token for backend JWT
                const backendToken = await exchangeSupabaseSession(session.access_token);

                // Save backend token
                authStorage.setToken(backendToken);

                // Refresh user in context
                await refreshUser();

                // Redirect to home
                setTimeout(() => router.push('/'), 1500);
            } catch (err: any) {
                console.error('Auth error:', err);
                setError(err.message || 'Authentication failed');
                setTimeout(() => router.push('/login?error=auth_failed'), 2000);
            }
        };

        handleAuth();
    }, [searchParams, router, refreshUser]);

    if (error) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
                <div className="text-center">
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
                    <p className="text-xs text-muted-foreground">
                        Redirecting to login...
                    </p>
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
                    Redirecting you to the dashboard...
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

'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authStorage } from '@/utils/auth';
import { useAuth } from '@/components/AuthProvider';
import { Loader2, CheckCircle } from 'lucide-react';

function AuthSuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshUser } = useAuth();

    useEffect(() => {
        const handleAuth = async () => {
            const token = searchParams.get('token');

            if (token) {
                // Save token to localStorage
                authStorage.setToken(token);

                // Refresh user in context
                await refreshUser();

                // Redirect to home after a short delay
                setTimeout(() => {
                    router.push('/');
                }, 1500);
            } else {
                // No token, redirect to login
                router.push('/login?error=no_token');
            }
        };

        handleAuth();
    }, [searchParams, router, refreshUser]);

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

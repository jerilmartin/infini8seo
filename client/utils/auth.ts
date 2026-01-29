import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iasuwapumbmswontonxn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlhc3V3YXB1bWJtc3dvbnRvbnhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQ1MDYsImV4cCI6MjA3ODUxMDUwNn0.nynhXnta_cUxIINQi9Xf3yR5jddhM7TpQbujA645g1k';

// Create Supabase client for client-side auth
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'infini8seo_auth_token';

/**
 * Token management utilities
 */
export const authStorage = {
    getToken: (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(TOKEN_KEY);
    },

    setToken: (token: string): void => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(TOKEN_KEY, token);
    },

    removeToken: (): void => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(TOKEN_KEY);
    },

    isAuthenticated: (): boolean => {
        return !!authStorage.getToken();
    }
};

/**
 * Get auth headers for API requests
 */
export function getAuthHeaders(): Record<string, string> {
    const token = authStorage.getToken();

    if (token) {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    return {
        'Content-Type': 'application/json',
    };
}

/**
 * Initiate Google login - uses Supabase client-side OAuth
 */
export async function loginWithGoogle(): Promise<void> {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/success`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });

        if (error) {
            throw error;
        }

        // Supabase will handle the redirect
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/**
 * Exchange Supabase session for backend JWT token
 */
export async function exchangeSupabaseSession(supabaseAccessToken: string): Promise<string> {
    try {
        const response = await fetch(`${API_URL}/api/auth/exchange-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ supabaseAccessToken }),
        });

        if (!response.ok) {
            throw new Error('Failed to exchange token');
        }

        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error('Token exchange error:', error);
        throw error;
    }
}

/**
 * Logout - clears token and Supabase session
 */
export async function logout(): Promise<void> {
    try {
        // Sign out from Supabase
        await supabase.auth.signOut();
        
        // Clear our token
        authStorage.removeToken();
        
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout error:', error);
        authStorage.removeToken();
        window.location.href = '/login';
    }
}

/**
 * Get current user from server
 */
export async function getCurrentUser(): Promise<any | null> {
    const token = authStorage.getToken();

    if (!token) {
        return null;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            if (response.status === 401) {
                authStorage.removeToken();
                return null;
            }
            throw new Error('Failed to get user');
        }

        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error('Get user error:', error);
        return null;
    }
}

/**
 * Verify token is still valid
 */
export async function verifyToken(token: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_URL}/api/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });

        const data = await response.json();
        return data.valid === true;
    } catch (error) {
        return false;
    }
}

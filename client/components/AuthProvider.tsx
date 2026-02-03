'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authStorage, getCurrentUser, logout as authLogout } from '@/utils/auth';

interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    provider?: string;
    role?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAuthenticated: false,
    signOut: async () => { },
    refreshUser: async () => { },
});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const userData = await getCurrentUser();
            setUser(userData);
        } catch (error) {
            console.error('Error refreshing user:', error);
            setUser(null);
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            try {
                if (authStorage.isAuthenticated()) {
                    const userData = await getCurrentUser();
                    setUser(userData);
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                authStorage.removeToken();
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const signOut = async () => {
        await authLogout();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                isAuthenticated: !!user,
                signOut,
                refreshUser
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

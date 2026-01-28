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
 * Initiate Google login - redirects to Google OAuth
 */
export async function loginWithGoogle(): Promise<void> {
    try {
        const response = await fetch(`${API_URL}/api/auth/google`);
        const data = await response.json();

        if (data.url) {
            window.location.href = data.url;
        } else {
            throw new Error('Failed to get OAuth URL');
        }
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/**
 * Logout - clears token and calls server
 */
export async function logout(): Promise<void> {
    try {
        const headers = getAuthHeaders();
        await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers,
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
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

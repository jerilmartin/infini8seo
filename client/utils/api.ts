import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { getAuthHeaders, authStorage } from '@/utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Authenticated API client wrapper
 */
export const api = {
    async get<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const headers = getAuthHeaders();
        return axios.get<T>(`${API_URL}${endpoint}`, {
            ...config,
            headers: { ...headers, ...config?.headers },
        });
    },

    async post<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const headers = getAuthHeaders();
        return axios.post<T>(`${API_URL}${endpoint}`, data, {
            ...config,
            headers: { ...headers, ...config?.headers },
        });
    },

    async put<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const headers = getAuthHeaders();
        return axios.put<T>(`${API_URL}${endpoint}`, data, {
            ...config,
            headers: { ...headers, ...config?.headers },
        });
    },

    async delete<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const headers = getAuthHeaders();
        return axios.delete<T>(`${API_URL}${endpoint}`, {
            ...config,
            headers: { ...headers, ...config?.headers },
        });
    },
};

// Add interceptor to handle 401 responses
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid, clear and redirect to login
            authStorage.removeToken();
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;

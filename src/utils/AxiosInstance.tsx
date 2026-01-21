import axios, { type AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';

// Create an axios instance with Vite environment variables
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Needed so the browser will store/send httpOnly cookies
});

// Request Interceptor - Add token to headers
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor - Handle errors globally
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Return the response data directly for convenience
    return response.data;
  },
  (error: AxiosError<{ error?: { message?: string } }>) => {
    // Handle different error status codes
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 401:
          // Unauthorized - Clear token and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;

        case 403:
          // Forbidden - User doesn't have permission
          console.error('Access forbidden:', data?.error?.message || 'You do not have permission to access this resource');
          break;

        case 404:
          // Not Found
          console.error('Resource not found:', data?.error?.message || 'The requested resource was not found');
          break;

        case 500:
          // Internal Server Error
          console.error('Server error:', data?.error?.message || 'An internal server error occurred');
          break;

        default:
          console.error('Request error:', data?.error?.message || error.message);
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.message);
    } else {
      // Error in request setup
      console.error('Error setting up request:', error.message);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

// Type definitions for API responses
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T = unknown> { // eslint-disable-line @typescript-eslint/no-explicit-any
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

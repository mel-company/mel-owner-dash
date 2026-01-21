import axiosInstance from '../utils/AxiosInstance';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  refreshToken: string;
}

// JWT Payload structure from the token
export interface JWTUserPayload {
  id: string;
  phone: string;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

/**
 * System Authentication Service
 * Handles system-level authentication endpoints
 */
export const systemAuthService = {
  /**
   * تسجيل الدخول (System)
   * POST /system-user-auth/login
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    // AxiosInstance interceptor already returns response.data
    const response = await axiosInstance.post<LoginResponse>(
      '/system-user-auth/login',
      credentials
    );
    return response as unknown as LoginResponse;
  },

  /**
   * تسجيل الخروج (System)
   * POST /system-user-auth/logout
   */
  logout: async (): Promise<LogoutResponse> => {
    // AxiosInstance interceptor already returns response.data
    const response = await axiosInstance.post<LogoutResponse>(
      '/system-user-auth/logout'
    );
    return response as unknown as LogoutResponse;
  },
};

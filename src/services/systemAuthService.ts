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

/** GET /system-user-auth/me */
export interface SystemUserProfile {
  id?: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  /** `preset:N` or an uploaded photo's url; null means the default avatar. */
  avatar?: string | null;
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
  /**
   * الملف الشخصي (System)
   * GET /system-user-auth/me
   */
  me: async (): Promise<SystemUserProfile> => {
    // AxiosInstance interceptor already returns response.data
    const response = await axiosInstance.get<SystemUserProfile>('/system-user-auth/me');
    return response as unknown as SystemUserProfile;
  },

  /** Pick one of the ten default avatars (1–10). */
  pickAvatar: async (preset: number): Promise<{ avatar: string | null }> => {
    const response = await axiosInstance.put('/system-employee/me/avatar', { preset });
    return response as unknown as { avatar: string | null };
  },

  /** Upload a photo (JPG, PNG or WebP, up to 3 MB) as the avatar. */
  uploadAvatar: async (file: File): Promise<{ avatar: string | null }> => {
    const form = new FormData();
    form.append('file', file);
    // The request interceptor drops Content-Type so the browser adds the boundary.
    const response = await axiosInstance.post('/system-employee/me/avatar', form);
    return response as unknown as { avatar: string | null };
  },

  /** Back to the default avatar picked from the account id. */
  resetAvatar: async (): Promise<{ avatar: string | null }> => {
    const response = await axiosInstance.delete('/system-employee/me/avatar');
    return response as unknown as { avatar: string | null };
  },

  logout: async (): Promise<LogoutResponse> => {
    // AxiosInstance interceptor already returns response.data
    const response = await axiosInstance.post<LogoutResponse>(
      '/system-user-auth/logout'
    );
    return response as unknown as LogoutResponse;
  },
};

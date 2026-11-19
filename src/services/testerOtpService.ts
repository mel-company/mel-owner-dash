import axiosInstance from '../utils/AxiosInstance';

/** Tester phones that sign in with the fixed code 1212 (no real message is sent). */
export interface TesterOtpSetting {
  phones: string[];
}

export const testerOtpService = {
  /** GET /api/v1/auth/system/tester-otp */
  get: async (): Promise<TesterOtpSetting> => {
    const response = await axiosInstance.get<TesterOtpSetting>('/auth/system/tester-otp');
    return response as unknown as TesterOtpSetting;
  },
  /** PUT /api/v1/auth/system/tester-otp */
  set: async (phones: string[]): Promise<TesterOtpSetting> => {
    const response = await axiosInstance.put<TesterOtpSetting>('/auth/system/tester-otp', { phones });
    return response as unknown as TesterOtpSetting;
  },
};

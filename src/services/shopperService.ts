import axiosInstance from '../utils/AxiosInstance';

/**
 * حسابات المتسوقين — one Mel account a shopper uses in every store.
 *
 * Only the WhatsApp code sender is set here. The API key never comes back:
 * `hasApiKey` says whether one is stored, and a blank key keeps it.
 */
export type ShopperOtpSettings = {
  provider: 'warid' | 'otpiq';
  apiUrl: string;
  senderId: string;
  hasApiKey: boolean;
};

export type ShopperOtpPayload = {
  provider: 'warid' | 'otpiq';
  apiUrl: string;
  senderId: string;
  apiKey?: string;
};

export const shopperService = {
  getOtpSettings: async (): Promise<ShopperOtpSettings> => {
    const response = await axiosInstance.get('/shopper/admin/otp-settings');
    return response as unknown as ShopperOtpSettings;
  },

  saveOtpSettings: async (payload: ShopperOtpPayload): Promise<ShopperOtpSettings> => {
    const response = await axiosInstance.put('/shopper/admin/otp-settings', payload);
    return response as unknown as ShopperOtpSettings;
  },
};

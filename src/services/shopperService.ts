import axiosInstance from '../utils/AxiosInstance';

/**
 * حسابات المتسوقين — one Mel account a shopper uses in every store.
 *
 * The WhatsApp code senders, in the order they are tried. Keys never come
 * back: `hasApiKey` says whether one is stored, and a blank key keeps it.
 */
export type ShopperOtpProviderId = 'warid' | 'otpiq';

export type ShopperOtpProvider = {
  id: ShopperOtpProviderId;
  enabled: boolean;
  apiUrl: string;
  senderId: string;
  hasApiKey: boolean;
  ready: boolean;
};

export type ShopperOtpProviderPayload = {
  id: ShopperOtpProviderId;
  enabled: boolean;
  apiUrl?: string;
  senderId?: string;
  apiKey?: string;
};

export const shopperService = {
  getOtpSettings: async (): Promise<{ providers: ShopperOtpProvider[] }> => {
    const response = await axiosInstance.get('/shopper/admin/otp-settings');
    return response as unknown as { providers: ShopperOtpProvider[] };
  },

  saveOtpSettings: async (providers: ShopperOtpProviderPayload[]): Promise<{ providers: ShopperOtpProvider[] }> => {
    const response = await axiosInstance.put('/shopper/admin/otp-settings', { providers });
    return response as unknown as { providers: ShopperOtpProvider[] };
  },
};

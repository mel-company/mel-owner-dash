import axiosInstance from '../utils/AxiosInstance';

/**
 * Phone numbers whose AI store generations are not charged to a balance.
 *
 * Staff, test and partner accounts. They used to be an env variable on the
 * server; they now live in the database and are managed here. Each number is
 * still capped at `dailyGenerationLimit` store builds per Baghdad day, and a
 * build that fails does not count.
 */
export interface UnlimitedAiPhone {
  id: string;
  /** `+9647XXXXXXXXX` */
  phone: string;
  note: string | null;
  dailyGenerationLimit: number;
  usedToday: number;
  /** The account signed up with this number, if there is one yet. */
  user: { id: string; name: string | null } | null;
  createdAt: string;
}

export interface UnlimitedAiPhoneInput {
  phone: string;
  note?: string;
  dailyGenerationLimit?: number;
}

const BASE = '/credits/system/unlimited';

export const unlimitedAiService = {
  async list(): Promise<UnlimitedAiPhone[]> {
    // The interceptor already unwraps `response.data`.
    const response = await axiosInstance.get<{ data: UnlimitedAiPhone[] }>(BASE);
    return (response as unknown as { data: UnlimitedAiPhone[] })?.data ?? [];
  },

  async add(input: UnlimitedAiPhoneInput): Promise<void> {
    await axiosInstance.post(BASE, input);
  },

  async update(id: string, input: { note?: string; dailyGenerationLimit?: number }): Promise<void> {
    await axiosInstance.patch(`${BASE}/${id}`, input);
  },

  async remove(id: string): Promise<void> {
    await axiosInstance.delete(`${BASE}/${id}`);
  },
};

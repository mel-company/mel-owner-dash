import avatar1 from '@/assets/avatars/user-1.webp?no-inline';
import avatar2 from '@/assets/avatars/user-2.webp?no-inline';
import avatar3 from '@/assets/avatars/user-3.webp?no-inline';
import avatar4 from '@/assets/avatars/user-4.webp?no-inline';
import avatar5 from '@/assets/avatars/user-5.webp?no-inline';
import avatar6 from '@/assets/avatars/user-6.webp?no-inline';
import avatar7 from '@/assets/avatars/user-7.webp?no-inline';
import avatar8 from '@/assets/avatars/user-8.webp?no-inline';
import avatar9 from '@/assets/avatars/user-9.webp?no-inline';
import avatar10 from '@/assets/avatars/user-10.webp?no-inline';
import admin1 from '@/assets/avatars/admin/admin-1.webp?no-inline';
import admin3 from '@/assets/avatars/admin/admin-3.webp?no-inline';
import admin5 from '@/assets/avatars/admin/admin-5.webp?no-inline';
import admin7 from '@/assets/avatars/admin/admin-7.webp?no-inline';
import admin10 from '@/assets/avatars/admin/admin-10.webp?no-inline';

/**
 * Mel's default avatars, for anyone without a photo of their own.
 *
 * The same pictures, in the same order, ship with the merchant dashboard, the
 * admin dashboard and the editor, so a person looks the same everywhere.
 * `?no-inline` keeps them as small files: each page shows only a few.
 */
export const DEFAULT_AVATARS = [
  avatar1,
  avatar2,
  avatar3,
  avatar4,
  avatar5,
  avatar6,
  avatar7,
  avatar8,
  avatar9,
  avatar10,
];

/**
 * Avatars for Mel's own team (admin dashboard members), a set of their own.
 * Only the men are offered for now; the others stay in the repo for later.
 * The backend stores a picked one as `preset:1` … `preset:5`, in this order.
 */
export const ADMIN_AVATARS = [admin1, admin3, admin5, admin7, admin10];

/**
 * The avatar from a set for a seed (the person's user id where we have it).
 * FNV-1a, so the same seed always gets the same picture, in every Mel app.
 */
function pickFor(avatars: string[], seed?: string | null): string {
  const text = seed?.trim() ?? '';
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return avatars[(hash >>> 0) % avatars.length]!;
}

/** A merchant's or customer's default avatar. */
export const defaultAvatarFor = (seed?: string | null) => pickFor(DEFAULT_AVATARS, seed);

/** An admin member's default avatar. */
export const adminAvatarFor = (seed?: string | null) => pickFor(ADMIN_AVATARS, seed);

/** `preset:3` → 3; anything else → null. */
export function presetNumber(avatar?: string | null): number | null {
  const match = /^preset:(\d+)$/.exec(avatar ?? '');
  const n = match ? Number(match[1]) : NaN;
  return n >= 1 && n <= ADMIN_AVATARS.length ? n : null;
}

/** A member's saved avatar as an image url: a picked one, or an uploaded photo. */
export function savedAvatarUrl(avatar?: string | null): string | null {
  const preset = presetNumber(avatar);
  if (preset) return ADMIN_AVATARS[preset - 1]!;
  return avatar && /^https?:\/\//.test(avatar) ? avatar : null;
}

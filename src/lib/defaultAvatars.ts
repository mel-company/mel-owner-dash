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

/**
 * Mel's default avatars, for anyone without a photo of their own.
 *
 * The same pictures, in the same order, ship with the merchant dashboard, the
 * admin dashboard and the editor, so a person looks the same everywhere.
 * `?no-inline` keeps them as small files: each page shows only a few.
 * The backend stores a picked one as `preset:1` … `preset:10`.
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
 * The default avatar for a seed (the person's user id where we have it).
 * FNV-1a, so the same seed always gets the same picture, in every Mel app.
 */
export function defaultAvatarFor(seed?: string | null): string {
  const text = seed?.trim() ?? '';
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return DEFAULT_AVATARS[(hash >>> 0) % DEFAULT_AVATARS.length]!;
}

/** `preset:3` → 3; anything else → null. */
export function presetNumber(avatar?: string | null): number | null {
  const match = /^preset:(\d+)$/.exec(avatar ?? '');
  const n = match ? Number(match[1]) : NaN;
  return n >= 1 && n <= DEFAULT_AVATARS.length ? n : null;
}

/** A saved avatar as an image url: a picked default, or an uploaded photo. */
export function savedAvatarUrl(avatar?: string | null): string | null {
  const preset = presetNumber(avatar);
  if (preset) return DEFAULT_AVATARS[preset - 1]!;
  return avatar && /^https?:\/\//.test(avatar) ? avatar : null;
}

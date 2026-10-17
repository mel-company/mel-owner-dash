import { useState } from 'react';
import { cn } from '@/lib/utils';
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
 */
const DEFAULT_AVATARS = [
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
function defaultAvatarFor(seed?: string | null): string {
  const text = seed?.trim() ?? '';
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return DEFAULT_AVATARS[(hash >>> 0) % DEFAULT_AVATARS.length]!;
}

type UserAvatarProps = {
  /** Stable id of the person; picks their default avatar. */
  seed?: string | null;
  /** Their own photo, if they have one. Falls back to the default if it fails. */
  src?: string | null;
  alt?: string;
  className?: string;
};

/** A round avatar: the person's photo, or their default Mel avatar. */
export const UserAvatar = ({ seed, src, alt = '', className }: UserAvatarProps) => {
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const photo = src && src !== brokenSrc ? src : null;

  return (
    <img
      src={photo ?? defaultAvatarFor(seed)}
      onError={photo ? () => setBrokenSrc(photo) : undefined}
      alt={alt}
      loading='lazy'
      decoding='async'
      draggable={false}
      className={cn(
        'size-10 shrink-0 select-none rounded-full bg-slate-100 object-cover',
        className
      )}
    />
  );
};

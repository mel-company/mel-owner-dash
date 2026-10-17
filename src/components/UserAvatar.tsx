import { useState } from 'react';
import { cn } from '@/lib/utils';
import { adminAvatarFor, defaultAvatarFor, savedAvatarUrl } from '@/lib/defaultAvatars';

type UserAvatarProps = {
  /** Stable id of the person; picks their default avatar. */
  seed?: string | null;
  /** What they chose: `preset:N` or an uploaded photo's url. */
  src?: string | null;
  /** An admin dashboard member: uses the team's own avatar set. */
  team?: boolean;
  alt?: string;
  className?: string;
};

/** A round avatar: what the person chose, or their default Mel avatar. */
export const UserAvatar = ({ seed, src, team = false, alt = '', className }: UserAvatarProps) => {
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const saved = savedAvatarUrl(src);
  const photo = saved && saved !== brokenSrc ? saved : null;

  return (
    <img
      src={photo ?? (team ? adminAvatarFor(seed) : defaultAvatarFor(seed))}
      onError={photo ? () => setBrokenSrc(photo) : undefined}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn('size-10 shrink-0 select-none rounded-full bg-slate-100 object-cover', className)}
    />
  );
};

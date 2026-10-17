import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import * as notionists from '@dicebear/notionists';
import { cn } from '@/lib/utils';

/** Soft pastel backgrounds, in the dashboard's palette. */
const BACKGROUNDS = ['ede9fe', 'e0f2fe', 'dcfce7', 'ffedd5', 'fce7f3', 'cffafe', 'fef9c3'];

/**
 * An illustrated character for an account that has no photo.
 *
 * Drawn in the browser from the account id (the same id always gets the same
 * character), so no name or id is sent anywhere to make it.
 */
export const AccountAvatar = ({ seed, className }: { seed: string; className?: string }) => {
  const src = useMemo(
    () =>
      createAvatar(notionists, {
        seed,
        backgroundColor: BACKGROUNDS,
        backgroundType: ['solid'],
        radius: 50,
      }).toDataUri(),
    [seed],
  );

  return (
    <img
      src={src}
      alt=""
      className={cn('size-10 shrink-0 rounded-full shadow-sm ring-2 ring-white', className)}
      loading="lazy"
    />
  );
};

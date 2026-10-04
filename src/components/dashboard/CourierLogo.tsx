import { useState } from 'react';

/**
 * A courier's mark, with something to show when there isn't one.
 *
 * Hiding a broken image leaves an empty bordered box where a brand should be,
 * which reads as a loading state that never finishes. A company row may also
 * legitimately have no logo at all — one an operator added by hand, or one
 * whose code names no integration — so the fallback is not an error state, it
 * is the ordinary case for part of this list.
 *
 * The initial is taken from the Arabic name because that is what the rest of
 * the row is read in.
 */
export const CourierLogo = ({
  src,
  name,
  size = 'md',
}: {
  src?: string | null;
  name: string;
  size?: 'md' | 'lg';
}) => {
  /**
   * *Which* url failed, not merely that one did.
   *
   * A row can be re-rendered with a different courier at the same position —
   * filtering the table does exactly that — and a boolean would carry the
   * previous courier's failure onto the new one's perfectly good logo. Storing
   * the url means the flag stops applying the moment `src` changes, with no
   * effect to reset it.
   */
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const broken = !src || failedSrc === src;

  const box = size === 'lg' ? 'size-12 rounded-2xl' : 'size-11 rounded-xl';

  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden bg-white ring-1 ring-slate-100 ${box}`}
    >
      {!broken ? (
        <img
          src={src}
          alt=""
          /* `cover`, not `contain`: these marks arrive at different aspect
             ratios and letterboxing one against the next made a row of boxes
             that each looked a different size. Cropping to fill is the
             trade — a wordmark loses its edges, a square logo does not. */
          className="size-full object-cover animate-in fade-in duration-300"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span className="text-sm font-black text-slate-400">
          {name.trim().charAt(0) || '؟'}
        </span>
      )}
    </div>
  );
};

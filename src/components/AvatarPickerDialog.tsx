import { useEffect, useRef, useState } from 'react';
import { Check, ImageUp, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_AVATARS, presetNumber } from '@/lib/defaultAvatars';
import { cn } from '@/lib/utils';
import { systemAuthService } from '@/services/systemAuthService';

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const errorMessage = (err: unknown, fallback: string) => {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  return message || fallback;
};

/**
 * The signed-in member changes their own avatar: one of the team's ten, or a photo.
 * Each choice saves straight away; there is no separate save step.
 */
export const AvatarPickerDialog = ({ onClose }: { onClose: () => void }) => {
  const { user, setAvatar } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const current = user?.avatar ?? null;
  const currentPreset = presetNumber(current);
  const hasPhoto = !!current && !currentPreset;

  const run = async (key: string, action: () => Promise<{ avatar: string | null }>) => {
    setBusy(key);
    setError('');
    try {
      const { avatar } = await action();
      setAvatar(avatar);
    } catch (err) {
      setError(errorMessage(err, 'تعذر حفظ الصورة، حاول مرة أخرى'));
    } finally {
      setBusy(null);
    }
  };

  const onFile = (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setError('الصورة يجب أن تكون JPG أو PNG أو WebP');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('حجم الصورة يجب ألا يتجاوز 3 ميغابايت');
      return;
    }
    void run('upload', () => systemAuthService.uploadAvatar(file));
  };

  return (
    <div
      className="fixed inset-0 z-9999 grid place-items-end bg-black/60 p-3 sm:place-items-center sm:p-6"
      dir="rtl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-picker-title"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-[1.5rem] bg-white p-5 text-right shadow-2xl sm:rounded-[2rem] sm:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserAvatar team seed={user?.id} src={current} className="size-14 ring-4 ring-violet-50" />
            <div>
              <h2 id="avatar-picker-title" className="text-lg font-black text-slate-950">
                صورتك الشخصية
              </h2>
              <p className="text-xs font-semibold text-slate-500">تظهر لفريق ميل في لوحة الإدارة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-6 mb-3 text-sm font-black text-slate-700">اختر صورة</p>
        <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
          {ADMIN_AVATARS.map((src, index) => {
            const preset = index + 1;
            const selected = currentPreset === preset;
            return (
              <button
                key={src}
                type="button"
                disabled={!!busy}
                onClick={() => void run(`preset:${preset}`, () => systemAuthService.pickAvatar(preset))}
                aria-label={`الصورة ${preset}`}
                aria-pressed={selected}
                className={cn(
                  'relative aspect-square rounded-full transition disabled:opacity-60',
                  selected ? 'ring-4 ring-violet-500 ring-offset-2' : 'hover:scale-105 hover:ring-2 hover:ring-violet-200',
                )}
              >
                <img src={src} alt="" className="size-full rounded-full object-cover" draggable={false} />
                {selected && (
                  <span className="absolute -bottom-1 -left-1 grid size-6 place-items-center rounded-full bg-violet-600 text-white ring-2 ring-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
                {busy === `preset:${preset}` && (
                  <span className="absolute inset-0 grid place-items-center rounded-full bg-white/60">
                    <span className="size-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept={PHOTO_TYPES.join(',')}
          className="hidden"
          onChange={(event) => onFile(event.target.files?.[0])}
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            disabled={!!busy}
            onClick={() => fileRef.current?.click()}
            className="h-12 gap-2 rounded-2xl bg-violet-600 text-sm font-black text-white hover:bg-violet-700"
          >
            <ImageUp className="h-4 w-4" />
            {busy === 'upload' ? 'جاري الرفع...' : hasPhoto ? 'رفع صورة أخرى' : 'رفع صورة من جهازك'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!!busy || !current}
            onClick={() => void run('reset', () => systemAuthService.resetAvatar())}
            className="h-12 gap-2 rounded-2xl text-sm font-black"
          >
            <RotateCcw className="h-4 w-4" />
            الصورة الافتراضية
          </Button>
        </div>
        <p className="mt-2 text-[11px] font-semibold text-slate-400">JPG أو PNG أو WebP، حتى 3 ميغابايت</p>

        {error && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

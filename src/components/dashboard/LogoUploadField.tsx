import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CourierLogo } from './CourierLogo';
import { deliveryCompanyService } from '../../services/deliveryCompanyService';

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * الشعار — رفع صورة أو لصق رابط.
 *
 * The upload only returns a url; it is saved with the rest of the form, so
 * this works for a company that does not exist yet.
 */
export const LogoUploadField = ({
  value,
  name,
  onChange,
}: {
  value: string;
  name: string;
  onChange: (value: string) => void;
}) => {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (file.size > MAX_BYTES) {
      setError('الحد الأقصى 2 ميغابايت.');
      return;
    }
    setUploading(true);
    try {
      onChange(await deliveryCompanyService.uploadLogo(file));
    } catch (err) {
      const message = (err as { response?: { data?: { message?: unknown } } })
        ?.response?.data?.message;
      setError(typeof message === 'string' ? message : 'تعذر رفع الشعار.');
      console.error('Error uploading logo:', err);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">الشعار</label>
      <div className="flex items-center gap-2">
        <CourierLogo src={value} name={name} />
        <Input
          value={value}
          placeholder="https://"
          dir="ltr"
          onChange={(event) => onChange(event.target.value)}
          className="h-12 min-w-0 flex-1 rounded-2xl border-slate-200 px-4 text-sm font-semibold"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => input.current?.click()}
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-600 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          رفع
        </button>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </div>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
};

export default LogoUploadField;

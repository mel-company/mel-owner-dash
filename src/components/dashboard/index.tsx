import type { FormEvent, ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatTone = 'blue' | 'cyan' | 'teal' | 'amber' | 'rose' | 'violet' | 'emerald';

const statTones: Record<StatTone, { wrap: string; icon: string }> = {
  blue: { wrap: 'bg-blue-50 shadow-blue-100', icon: 'text-blue-500' },
  cyan: { wrap: 'bg-cyan-50 shadow-cyan-100', icon: 'text-cyan-500' },
  teal: { wrap: 'bg-teal-50 shadow-teal-100', icon: 'text-teal-500' },
  amber: { wrap: 'bg-orange-50 shadow-orange-100', icon: 'text-orange-500' },
  rose: { wrap: 'bg-red-50 shadow-red-100', icon: 'text-red-500' },
  violet: { wrap: 'bg-violet-50 shadow-violet-100', icon: 'text-violet-500' },
  emerald: { wrap: 'bg-emerald-50 shadow-emerald-100', icon: 'text-emerald-500' },
};

export const PageIcon = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600', className)}>
    {children}
    <span className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-violet-200" />
  </div>
);

export const PageHeader = ({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: ReactNode;
  icon: ReactNode;
  action?: ReactNode;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-4" dir="rtl">
    <div className="flex items-center gap-3">
      <PageIcon>{icon}</PageIcon>
      <div className="text-right">
        <h1 className="text-2xl font-black text-slate-950">{title}</h1>
        <p className="text-sm font-medium text-slate-500">{description}</p>
      </div>
    </div>
    {action}
  </div>
);

export const PrimaryActionButton = ({ children, onClick, type = 'button' }: { children: ReactNode; onClick?: () => void; type?: 'button' | 'submit' }) => (
  <button
    type={type}
    onClick={onClick}
    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-l from-violet-700 to-fuchsia-500 px-5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:scale-[1.01]"
  >
    {children}
  </button>
);

export const StatCard = ({ title, value, icon, tone = 'blue', hint = '12.6% ↗' }: { title: string; value: ReactNode; icon: ReactNode; tone?: StatTone; hint?: ReactNode }) => {
  const color = statTones[tone];

  return (
    <div className="flex min-h-[78px] items-center justify-between gap-4 rounded-[1.45rem] bg-white px-5 py-4 shadow-[0_12px_35px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
      <div className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-lg', color.wrap)}>
        <div className={cn('[&_svg]:h-6 [&_svg]:w-6 [&_svg]:stroke-[2.4]', color.icon)}>{icon}</div>
      </div>
      <div className="min-w-0 flex-1 text-right">
        <p className="truncate text-sm font-black text-slate-700">{title}</p>
        <div className="mt-1.5 flex items-center justify-start gap-2" dir="ltr">
          {hint && <span className="text-xs font-bold text-emerald-500">{hint}</span>}
          <span className="text-2xl font-black leading-none text-slate-950">{value}</span>
        </div>
      </div>
    </div>
  );
};

export const AlertMessage = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{children}</div>
);

export const SearchFiltersBar = ({
  search,
  onSearchChange,
  placeholder = 'ابحث',
  filterCount = 0,
  onFilterClick,
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  filterCount?: number;
  onFilterClick?: () => void;
  children?: ReactNode;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex flex-wrap items-center gap-2">
      {children}
      <button
        type="button"
        onClick={onFilterClick}
        className={cn(
          'inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-100 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm',
          filterCount > 0 && 'border-violet-300 bg-violet-600 text-white'
        )}
      >
        الفلاتر
        {filterCount > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">+{filterCount}</span>}
        <SlidersHorizontal className="h-4 w-4" />
      </button>
    </div>
    <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
      <button type="button" className="h-12 rounded-2xl bg-cyan-50 px-6 text-sm font-bold text-cyan-500">البحث</button>
      <div className="relative min-w-[260px] max-w-md flex-1">
        <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-2xl border border-slate-100 bg-white pr-11 pl-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
        />
      </div>
    </div>
  </div>
);

export const TableShell = ({ children, footer }: { children: ReactNode; footer?: ReactNode }) => (
  <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
    <div className="overflow-x-auto">{children}</div>
    {footer}
  </div>
);

export const Pagination = ({
  page,
  totalPages,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) => {
  const pages = totalPages <= 5 ? Array.from({ length: totalPages }, (_, index) => index + 1) : [1, 2, 3, 4, 5, totalPages];

  return (
    <div className="flex flex-row-reverse items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
      <label className="flex items-center gap-2 font-bold text-slate-600">
        العناصر لكل صفحة
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-8 rounded-xl border border-violet-200 bg-white px-3 font-bold text-violet-600 outline-none"
        >
          {pageSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      <div className="flex flex-row-reverse items-center gap-2">
        {totalPages > 1 && (
          <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50 text-slate-500 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {pages.map((item, index) => (
          <button
            key={`${item}-${index}`}
            type="button"
            onClick={() => onPageChange(item)}
            className={cn('grid h-8 w-8 place-items-center rounded-xl font-bold', item === page ? 'bg-violet-600 text-white' : 'bg-slate-50 text-slate-500')}
          >
            {item}
          </button>
        ))}
        {totalPages > 1 && (
          <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50 text-slate-500 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export const SideDrawer = ({
  title,
  subtitle,
  icon,
  children,
  footer,
  onClose,
  maxWidth = 'max-w-3xl',
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) => (
  <div className="fixed inset-0 z-9999 bg-black/35" dir="rtl" onMouseDown={onClose}>
    <div onMouseDown={(event) => event.stopPropagation()} className={cn('fixed inset-y-0 left-0 z-10000 flex h-dvh w-full flex-col overflow-hidden bg-white px-6 py-8 shadow-2xl sm:px-8', maxWidth)}>
      <div className="mb-8 flex shrink-0 items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="text-right">
            <h2 className="text-3xl font-black text-violet-700">{title}</h2>
            {subtitle && <p className="mt-1 text-sm font-bold text-violet-500">{subtitle}</p>}
          </div>
          <PageIcon>{icon}</PageIcon>
        </div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-400">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
      {footer && <div className="shrink-0 pt-7">{footer}</div>}
    </div>
  </div>
);

export const DrawerFooter = ({ onCancel, submitLabel = 'حفظ', cancelLabel = 'إلغاء' }: { onCancel: () => void; submitLabel?: string; cancelLabel?: string }) => (
  <div className="grid grid-cols-2 gap-4">
    <button type="button" onClick={onCancel} className="h-14 rounded-2xl bg-slate-100 font-black text-slate-600">{cancelLabel}</button>
    <button type="submit" className="h-14 rounded-2xl bg-linear-to-l from-violet-700 to-fuchsia-500 font-black text-white shadow-lg shadow-violet-200">{submitLabel}</button>
  </div>
);

export const ConfirmDeleteModal = ({
  title,
  description,
  confirmLabel = 'حذف',
  onClose,
  onConfirm,
  preview,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
  preview?: ReactNode;
}) => (
  <div className="fixed inset-0 z-9999 grid place-items-center bg-black/70 p-6" dir="rtl">
    <div className="w-full max-w-3xl rounded-[2rem] bg-white p-8 text-center shadow-2xl">
      {preview && <div className="mx-auto mb-8 flex min-h-56 items-center justify-center rounded-[2rem] bg-red-50 p-6">{preview}</div>}
      <h2 className="text-3xl font-black text-red-600">{title}</h2>
      <p className="mx-auto mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-600">{description}</p>
      <div className="mt-8 grid grid-cols-[1fr_2fr] gap-5">
        <button type="button" onClick={onClose} className="h-14 rounded-2xl bg-slate-100 text-lg font-black text-slate-600">إلغاء</button>
        <button type="button" onClick={onConfirm} className="h-14 rounded-2xl bg-red-600 text-lg font-black text-white">{confirmLabel}</button>
      </div>
    </div>
  </div>
);

export const FormField = ({ label, value, onChange, type = 'text', placeholder, required }: { label: string; value: string | number | undefined; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) => (
  <div>
    <label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
    <input
      type={type}
      value={value ?? ''}
      placeholder={placeholder}
      required={required}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
    />
  </div>
);

export const TextAreaField = ({ label, value, onChange, placeholder, rows = 5 }: { label: string; value: string | undefined; onChange: (value: string) => void; placeholder?: string; rows?: number }) => (
  <div>
    <label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
    <textarea
      value={value ?? ''}
      placeholder={placeholder}
      rows={rows}
      onChange={(event) => onChange(event.target.value)}
      className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
    />
  </div>
);

export const SelectField = ({ label, value, options, onChange, required }: { label: string; value: string | number | undefined; options: Array<{ value: string | number; label: string }>; onChange: (value: string) => void; required?: boolean }) => (
  <div>
    <label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
    <div className="relative">
      <select
        value={value ?? ''}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  </div>
);

export const StatusPill = ({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'red' | 'blue' | 'violet' | 'amber' }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-50 text-emerald-500',
    red: 'bg-red-50 text-red-500',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-orange-50 text-orange-500',
  };
  return <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-black', tones[tone])}>{children}</span>;
};

export const LoadingState = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-violet-600" />
  </div>
);

export const EmptyState = ({ title, action }: { title: string; action?: ReactNode }) => (
  <div className="p-10 text-center">
    <p className="text-lg font-black text-slate-500">{title}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const preventSubmitClose = (handler: (event: FormEvent) => void) => handler;

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type StatTone = 'blue' | 'cyan' | 'teal' | 'amber' | 'rose' | 'violet' | 'emerald' | 'slate';

const statTones: Record<StatTone, { wrap: string; icon: string }> = {
  blue: { wrap: 'bg-blue-50 shadow-blue-100', icon: 'text-blue-500' },
  cyan: { wrap: 'bg-cyan-50 shadow-cyan-100', icon: 'text-cyan-500' },
  teal: { wrap: 'bg-teal-50 shadow-teal-100', icon: 'text-teal-500' },
  amber: { wrap: 'bg-orange-50 shadow-orange-100', icon: 'text-orange-500' },
  rose: { wrap: 'bg-red-50 shadow-red-100', icon: 'text-red-500' },
  violet: { wrap: 'bg-violet-50 shadow-violet-100', icon: 'text-violet-500' },
  emerald: { wrap: 'bg-emerald-50 shadow-emerald-100', icon: 'text-emerald-500' },
  // For a count of things that are switched *off* — the one state that should
  // not draw the eye with colour.
  slate: { wrap: 'bg-slate-100 shadow-slate-200', icon: 'text-slate-500' },
};

export const PageIcon = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600 sm:h-12 sm:w-12', className)}>
    {children}
    <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-violet-200 sm:h-3 sm:w-3" />
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
  <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between" dir="rtl">
    <div className="flex min-w-0 items-center gap-3">
      <PageIcon>{icon}</PageIcon>
      <div className="min-w-0 text-right">
        <h1 className="truncate text-xl font-black text-slate-950 sm:text-2xl">{title}</h1>
        <p className="mt-0.5 text-xs font-medium text-slate-500 sm:text-sm">{description}</p>
      </div>
    </div>
    {action && <div className="flex w-full shrink-0 sm:w-auto sm:justify-start [&_button]:w-full sm:[&_button]:w-auto">{action}</div>}
  </div>
);

export const PrimaryActionButton = ({
  children,
  onClick,
  type = 'button',
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
}) => (
  <Button
    type={type}
    onClick={onClick}
    size="lg"
    className={cn(
      'h-11 rounded-2xl bg-linear-to-l from-violet-700 to-fuchsia-500 px-4 text-sm font-bold text-white shadow-lg shadow-violet-200 hover:bg-linear-to-l hover:from-violet-700 hover:to-fuchsia-500 hover:opacity-95 sm:h-12 sm:px-5',
      className,
    )}
  >
    {children}
  </Button>
);

/**
 * `sub` is a caption under the number, and is not `hint`.
 *
 * `hint` renders as an emerald badge beside the value — it was built for a
 * growth delta, and on the accounting page it was carrying `"12.6% ↗"` typed
 * into the markup, in the same green as a real one. A caption that says what
 * the number is made of ("موزّعة على 7 معاملات") is a different thing and
 * must not borrow that styling, or the next reader cannot tell a measured
 * figure from a described one.
 */
export const StatCard = ({ title, value, icon, tone = 'blue', hint, sub }: { title: string; value: ReactNode; icon: ReactNode; tone?: StatTone; hint?: ReactNode; sub?: ReactNode }) => {
  const color = statTones[tone];

  return (
    <Card className="flex min-h-[72px] flex-row items-center justify-between gap-3 rounded-[1.25rem] py-3 shadow-[0_12px_35px_rgba(15,23,42,0.04)] sm:min-h-[78px] sm:gap-4 sm:rounded-[1.45rem] sm:py-4">
      <CardContent className="flex w-full items-center justify-between gap-3 px-4 sm:gap-4 sm:px-5">
        <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl shadow-lg sm:h-12 sm:w-12', color.wrap)}>
          <div className={cn('[&_svg]:h-5 [&_svg]:w-5 [&_svg]:stroke-[2.4] sm:[&_svg]:h-6 sm:[&_svg]:w-6', color.icon)}>{icon}</div>
        </div>
        <div className="min-w-0 flex-1 text-right">
          <CardTitle className="truncate text-xs font-black text-slate-700 sm:text-sm">{title}</CardTitle>
          <div className="mt-1.5 flex items-center justify-start gap-2" dir="ltr">
            {hint != null && hint !== false && (
              <Badge variant="secondary" className="bg-emerald-50 text-[10px] font-bold text-emerald-600 sm:text-xs">
                {hint}
              </Badge>
            )}
            <span className="text-xl font-black leading-none text-slate-950 sm:text-2xl">{value}</span>
          </div>
          {sub != null && sub !== false && (
            <div className="mt-1 truncate text-[11px] font-semibold text-slate-400 sm:text-xs">{sub}</div>
          )}
        </div>
      </CardContent>
    </Card>
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
  filterPanel,
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  filterCount?: number;
  onFilterClick?: () => void;
  /**
   * The filters themselves, shown in a popover under the الفلاتر button.
   *
   * Optional and additive: a page that passes nothing keeps the old behaviour
   * where the button is a bare action and any controls sit beside it. Passing
   * a panel is what makes the button mean "filters" rather than "clear
   * filters", which is what a filter button normally means.
   */
  filterPanel?: ReactNode;
  children?: ReactNode;
}) => {
  /**
   * The panel is portalled for the same reason the row menus are.
   *
   * This bar sits inside `TableShell`, whose card is `overflow-hidden` and
   * whose body is `overflow-x-auto`. A panel positioned inside it is *clipped*
   * by those boundaries, not merely covered, so no `z-index` rescues it — and
   * the case that breaks is the easy one to miss, because it only shows when
   * the table is short: filter down to a single row and the card is shorter
   * than the panel, which then loses its last option.
   */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  /** Measured during commit, so it is never painted in the wrong place. */
  const placePanel = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node;
      if (!node || !anchor) return;
      const flipUp = anchor.bottom + 8 + node.offsetHeight > window.innerHeight;
      node.style.top = flipUp ? '' : `${anchor.bottom + 8}px`;
      node.style.bottom = flipUp ? `${window.innerHeight - anchor.top + 8}px` : '';
    },
    [anchor],
  );

  useEffect(() => {
    if (!filtersOpen) return;

    const close = () => setFiltersOpen(false);
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);

    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [filtersOpen]);

  return (
  <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
    <div className="flex flex-wrap items-center gap-2">
      {children}
      <Button
        type="button"
        ref={triggerRef}
        variant={filterCount > 0 ? 'default' : 'outline'}
        onClick={() => {
          if (filterPanel) {
            setAnchor(triggerRef.current?.getBoundingClientRect() ?? null);
            setFiltersOpen((value: boolean) => !value);
          }
          onFilterClick?.();
        }}
        className={cn(
          'h-11 rounded-2xl px-4 text-sm font-bold transition-all active:scale-95 sm:h-12 sm:px-5',
          filterCount > 0 && 'border-violet-300 bg-violet-600 text-white hover:bg-violet-600',
        )}
      >
        الفلاتر
        {filterCount > 0 && (
          <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-[10px]">
            +{filterCount}
          </Badge>
        )}
        <SlidersHorizontal
          className={cn('h-4 w-4 transition-transform duration-200', filtersOpen && 'rotate-180')}
        />
      </Button>
      {filterPanel &&
        filtersOpen &&
        anchor &&
        createPortal(
          <div
            ref={placePanel}
            dir="rtl"
            className="fixed z-[9998] w-64 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-100 animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: anchor.bottom + 8,
              // Hung from the trigger's right edge in RTL, clamped to the window.
              left: Math.max(8, Math.min(anchor.right - 256, window.innerWidth - 264)),
            }}
          >
            {filterPanel}
          </div>,
          document.body,
        )}
    </div>
    <div className="flex w-full flex-1 flex-wrap items-center gap-2 sm:min-w-[260px] sm:max-w-md sm:justify-end">
      <Button type="button" variant="secondary" className="h-11 shrink-0 rounded-2xl bg-cyan-50 px-5 text-sm font-bold text-cyan-600 hover:bg-cyan-50 sm:h-12 sm:px-6">
        البحث
      </Button>
      <div className="relative min-w-0 flex-1">
        <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 rounded-2xl border-slate-100 bg-white pr-11 pl-4 text-sm font-semibold sm:h-12"
        />
      </div>
    </div>
  </div>
  );
};

export const TableShell = ({ children, footer }: { children: ReactNode; footer?: ReactNode }) => (
  <Card className="gap-0 overflow-hidden rounded-[1.5rem] py-0 shadow-sm sm:rounded-[2rem]">
    <CardContent className="overflow-x-auto overscroll-x-contain p-0 [-webkit-overflow-scrolling:touch]">{children}</CardContent>
    {footer}
  </Card>
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
  const pages = totalPages <= 5
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : [1, 2, 3, '...', totalPages].filter((item, index, arr) => arr.indexOf(item) === index);

  return (
    <div className="flex flex-col-reverse gap-4 border-t border-slate-100 px-3 py-4 text-xs text-slate-500 sm:flex-row-reverse sm:items-center sm:justify-between sm:px-5">
      <label className="flex items-center justify-center gap-2 font-bold text-slate-600 sm:justify-start">
        <span className="whitespace-nowrap">العناصر لكل صفحة</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-8 rounded-xl border border-violet-200 bg-white px-3 font-bold text-violet-600 outline-none"
        >
          {pageSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:flex-row-reverse sm:gap-2">
        {totalPages > 1 && (
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-xl"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {pages.map((item, index) => (
          typeof item === 'number' ? (
            <Button
              key={`${item}-${index}`}
              type="button"
              variant={item === page ? 'default' : 'secondary'}
              size="icon-sm"
              onClick={() => onPageChange(item)}
              className={cn('rounded-xl font-bold', item === page && 'bg-violet-600 hover:bg-violet-600')}
            >
              {item}
            </Button>
          ) : (
            <span key={`dots-${index}`} className="px-1 font-bold text-slate-400">…</span>
          )
        ))}
        {totalPages > 1 && (
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded-xl"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
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
    <div
      onMouseDown={(event) => event.stopPropagation()}
      className={cn(
        'fixed inset-x-0 bottom-0 z-10000 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white px-4 py-5 shadow-2xl sm:inset-y-0 sm:left-0 sm:right-auto sm:max-h-none sm:rounded-none sm:px-6 sm:py-8 md:px-8',
        maxWidth
      )}
    >
      <div className="mb-5 flex shrink-0 items-start justify-between gap-3 sm:mb-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="min-w-0 text-right">
            <h2 className="text-xl font-black text-violet-700 sm:text-3xl">{title}</h2>
            {subtitle && <p className="mt-1 text-sm font-bold text-violet-500">{subtitle}</p>}
          </div>
          <PageIcon>{icon}</PageIcon>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-10 shrink-0 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
      {footer && <div className="shrink-0 pt-5 sm:pt-7">{footer}</div>}
    </div>
  </div>
);

export const DrawerFooter = ({ onCancel, submitLabel = 'حفظ', cancelLabel = 'إلغاء' }: { onCancel: () => void; submitLabel?: string; cancelLabel?: string }) => (
  <div className="grid grid-cols-2 gap-3 sm:gap-4">
    <Button type="button" variant="secondary" onClick={onCancel} className="h-12 rounded-2xl text-sm font-black sm:h-14 sm:text-base">
      {cancelLabel}
    </Button>
    <Button
      type="submit"
      className="h-12 rounded-2xl bg-linear-to-l from-violet-700 to-fuchsia-500 text-sm font-black text-white shadow-lg shadow-violet-200 hover:opacity-95 sm:h-14 sm:text-base"
    >
      {submitLabel}
    </Button>
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
  <div className="fixed inset-0 z-9999 grid place-items-end bg-black/70 p-3 sm:place-items-center sm:p-6" dir="rtl">
    <div className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] bg-white p-5 text-center shadow-2xl sm:rounded-[2rem] sm:p-8">
      {preview && <div className="mx-auto mb-6 flex min-h-40 max-w-sm items-center justify-center rounded-[1.5rem] bg-red-50 p-4 sm:mb-8 sm:min-h-56 sm:rounded-[2rem] sm:p-6">{preview}</div>}
      <h2 className="text-xl font-black text-red-600 sm:text-3xl">{title}</h2>
      <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-600 sm:mt-5 sm:text-lg sm:leading-8">{description}</p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-[1fr_2fr] sm:gap-5">
        <Button type="button" variant="secondary" onClick={onClose} className="h-12 rounded-2xl text-base font-black sm:h-14 sm:text-lg">
          إلغاء
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm} className="h-12 rounded-2xl text-base font-black sm:h-14 sm:text-lg">
          {confirmLabel}
        </Button>
      </div>
    </div>
  </div>
);

export const FormField = ({ label, value, onChange, type = 'text', placeholder, required }: { label: string; value: string | number | undefined; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) => (
  <div>
    <label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
    <Input
      type={type}
      value={value ?? ''}
      placeholder={placeholder}
      required={required}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 rounded-2xl border-slate-200 px-4 text-sm font-semibold"
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
    slate: 'border-transparent bg-slate-100 text-slate-600',
    green: 'border-transparent bg-emerald-50 text-emerald-600',
    red: 'border-transparent bg-red-50 text-red-500',
    blue: 'border-transparent bg-blue-50 text-blue-600',
    violet: 'border-transparent bg-violet-50 text-violet-600',
    amber: 'border-transparent bg-orange-50 text-orange-500',
  };
  return (
    <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-black', tones[tone])}>
      {children}
    </Badge>
  );
};

export const LoadingState = () => (
  <div className="page-shell space-y-4 bg-[#f8fafc] text-right" dir="rtl">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-2xl sm:w-36" />
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="size-10 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  </div>
);

export const EmptyState = ({ title, action }: { title: string; action?: ReactNode }) => (
  <div className="p-6 text-center sm:p-10">
    <p className="text-base font-black text-slate-500 sm:text-lg">{title}</p>
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export const preventSubmitClose = (handler: (event: FormEvent) => void) => handler;

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  MapPinned,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Truck,
} from 'lucide-react';
import {
  AlertMessage,
  ConfirmDeleteModal,
  DrawerFooter,
  FormField,
  LoadingState,
  PageHeader,
  PrimaryActionButton,
  SearchFiltersBar,
  SelectField,
  SideDrawer,
  StatusPill,
  TableShell,
} from '@/components/dashboard';
import { CourierDetailDrawer } from '@/components/dashboard/CourierDetailDrawer';
import { CourierLogo } from '@/components/dashboard/CourierLogo';
import {
  deliveryCompanyService,
  type DeliveryCompany,
  type DeliveryCompanyPayload,
  type DeliveryCompanyStatus,
} from '../services/deliveryCompanyService';
import {
  courierService,
  type CourierCapabilities,
  type CourierHealth,
  type CourierStats,
} from '../services/courierService';

/**
 * شركات الشحن — الصف والتكامل خلفه، في جدول واحد.
 *
 * A delivery company is two things that used to be shown separately and read
 * as unrelated: a **row** an operator creates and prices, and an
 * **integration** the platform may or may not be able to reach. A merchant
 * picks the row; whether their parcels actually move depends on the
 * integration. Splitting them across a card grid and a status strip meant
 * answering "can this company ship" took two places and a guess about which
 * one was authoritative.
 *
 * They are joined here by `code`, which is the only thing tying a database row
 * to an adapter — so a row with no code, or a typo in one, lands as «بدون
 * تكامل» rather than silently looking healthy.
 *
 * Three fetches, each from somewhere different, and the difference matters:
 *
 * - the companies, from the database;
 * - **health, which probes every vendor** and is cached for a minute on the
 *   server because Al-Waseet allows thirty requests per thirty seconds and
 *   live dispatch shares that budget;
 * - **the counts, read off the platform's own parcel records** at no cost to
 *   anyone's rate limit — and only as fresh as the last webhook or sync.
 */

const defaultForm: DeliveryCompanyPayload = {
  name: '',
  code: '',
  description: '',
  logo: '',
  website: '',
  contact: '',
  email: '',
  phone: '',
  address: '',
  zip: '',
  status: 'ACTIVE',
  rating: 0,
  // Shipping rules. The base fee is what checkout falls back to whenever the
  // courier cannot be asked for a live price.
  baseFee: 5000,
  sameStateFee: null,
  maxWeightGrams: null,
  maxVolumeCm3: null,
  maxQty: null,
  weightStepGrams: 1000,
  weightStepFee: 0,
  volumeStepCm3: 10000,
  volumeStepFee: 0,
  qtyStepFee: 0,
};

/** '' clears a ceiling; a number sets it. */
const toOptionalNumber = (value: string): number | null =>
  value.trim() === '' ? null : Number(value);

/**
 * What a courier can be asked to do, in the order a merchant cares.
 *
 * Derived from the methods each adapter implements, so a chip here is a thing
 * that genuinely works rather than a thing somebody declared.
 */
const CAPABILITY_LABELS: Array<[keyof CourierCapabilities, string]> = [
  ['createShipment', 'إنشاء شحنة'],
  ['track', 'تتبّع'],
  ['label', 'ملصق'],
  ['cancelShipment', 'إلغاء'],
  ['quote', 'تسعير مباشر'],
  ['webhook', 'تحديث تلقائي'],
];

/** Can this company ship right now, and if not, whose problem is it. */
type RowState = 'connected' | 'pending' | 'disconnected' | 'none';

const STATE_COPY: Record<RowState, { label: string; tone: 'green' | 'amber' | 'red' | 'slate' }> = {
  connected: { label: 'متصل', tone: 'green' },
  // Credentials are not in this deployment yet — an operator's job.
  pending: { label: 'في انتظار الإعداد', tone: 'amber' },
  // Configured and the vendor refused, or is down. A different job entirely.
  disconnected: { label: 'غير متصل', tone: 'red' },
  // The row names no adapter: it can price orders and cannot ship them.
  none: { label: 'بدون تكامل', tone: 'slate' },
};

type Row = {
  company: DeliveryCompany;
  health: CourierHealth | null;
  stats: CourierStats | null;
  state: RowState;
};

const PAGE_SIZE = 10;

const sinceLabel = (iso: string | null | undefined): string => {
  if (!iso) return 'لم تتم المزامنة';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
};

/** Green while it is fresh, amber within a day, red beyond — grey for never. */
const syncTone = (iso: string | null | undefined): string => {
  if (!iso) return 'bg-slate-300';
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (hours < 1) return 'bg-emerald-500';
  if (hours < 24) return 'bg-amber-500';
  return 'bg-red-500';
};

/** The ••• menu, closed by a click anywhere else. */
/**
 * The ••• menu, rendered into `document.body`.
 *
 * **A portal, not a `z-index`.** The obvious fix for a dropdown hidden behind
 * the table is to raise its stacking order, and it cannot work here: this menu
 * lives inside `TableShell`, whose card is `overflow-hidden` and whose body is
 * `overflow-x-auto`, and no `z-index` lets a child escape an overflow
 * ancestor — it is clipped, not covered. Raising the number moves nothing,
 * which is exactly why it reads as a z-index fight.
 *
 * So the menu is positioned `fixed` against the trigger's own rectangle and
 * mounted outside the table entirely. That brings two things the absolute
 * version got for free and now has to handle: it does not move when anything
 * scrolls, so any scroll closes it; and it would hang off the bottom of the
 * window on the last row, so it flips above the trigger when there is no room
 * below.
 */
const MENU_WIDTH = 192;
const MENU_GAP = 8;

const RowMenu = ({ children }: { children: (close: () => void) => React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  /**
   * Measure and place in the ref callback, not an effect.
   *
   * The flip has to know the menu's height, and that depends on how many items
   * the row offers — a company with no integration has one fewer — so a
   * guessed height would misplace it for some rows and not others. Measuring
   * in an effect and storing the answer in state would re-render to move it;
   * a ref callback runs during commit, before the browser paints, so the menu
   * is only ever drawn once and in the right place.
   */
  const placeMenu = useCallback(
    (node: HTMLDivElement | null) => {
      menuRef.current = node;
      if (!node || !anchor) return;

      const flipUp =
        anchor.bottom + MENU_GAP + node.offsetHeight > window.innerHeight;

      node.style.top = flipUp ? '' : `${anchor.bottom + MENU_GAP}px`;
      node.style.bottom = flipUp
        ? `${window.innerHeight - anchor.top + MENU_GAP}px`
        : '';
    },
    [anchor],
  );

  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    // Capture, so the table's own horizontal scroll closes it too — a fixed
    // menu would otherwise sit still while the row it belongs to slides away.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);

    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setAnchor(triggerRef.current?.getBoundingClientRect() ?? null);
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={toggle}
        className="grid size-9 place-items-center rounded-xl border border-slate-100 text-slate-400 transition-all duration-150 hover:bg-slate-50 hover:text-slate-600 active:scale-90"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open &&
        anchor &&
        createPortal(
          <div
            ref={placeMenu}
            dir="rtl"
            className="fixed z-[9998] w-48 overflow-hidden rounded-2xl bg-white py-1.5 shadow-lg ring-1 ring-slate-100 animate-in fade-in zoom-in-95 duration-150"
            style={{
              // Below the trigger to begin with; `placeMenu` moves it above
              // when there is no room, before this is ever painted.
              top: anchor.bottom + MENU_GAP,
              // The trigger sits at the row's left edge in RTL, so the menu
              // hangs from the same edge; clamped so it cannot leave the window.
              left: Math.max(MENU_GAP, Math.min(anchor.left, window.innerWidth - MENU_WIDTH - MENU_GAP)),
            }}
          >
            {children(() => setOpen(false))}
          </div>,
          document.body,
        )}
    </>
  );
};

const MenuItem = ({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'danger';
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-right text-sm font-bold transition-colors duration-150 hover:bg-slate-50 ${
      tone === 'danger' ? 'text-red-600' : 'text-slate-600'
    }`}
  >
    {icon}
    {label}
  </button>
);

const DeliveryCompanies = () => {
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [health, setHealth] = useState<CourierHealth[]>([]);
  const [stats, setStats] = useState<CourierStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryCompanyStatus | ''>('');
  const [tab, setTab] = useState<'all' | RowState>('all');
  const [page, setPage] = useState(1);

  const [showDrawer, setShowDrawer] = useState(false);
  const [editingCompany, setEditingCompany] = useState<DeliveryCompany | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<DeliveryCompany | null>(null);
  const [detailCourier, setDetailCourier] = useState<CourierHealth | null>(null);
  const [formData, setFormData] = useState(defaultForm);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      /**
       * Together, and tolerant of one failing.
       *
       * The companies come from the database and always answer; health probes
       * four vendors and stats reads parcel history. A courier being
       * unreachable must not leave the operator with an empty page — it is
       * the thing they came to find out.
       */
      const [companiesResult, healthResult, statsResult] = await Promise.allSettled([
        deliveryCompanyService.getSystemDeliveryCompanies({ page: 1, limit: 100 }),
        courierService.getHealth('all'),
        courierService.getStats(30),
      ]);

      if (companiesResult.status === 'fulfilled') {
        setCompanies(companiesResult.value.data || []);
      } else {
        setError('فشل في جلب شركات الشحن. يرجى المحاولة مرة أخرى.');
        console.error('Error fetching delivery companies:', companiesResult.reason);
      }

      if (healthResult.status === 'fulfilled') {
        setHealth(healthResult.value.couriers ?? []);
      } else {
        console.error('Error fetching courier health:', healthResult.reason);
      }

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value ?? []);
      } else {
        console.error('Error fetching courier stats:', statsResult.reason);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const healthByCode = useMemo(
    () => new Map(health.map((entry) => [entry.code, entry])),
    [health],
  );
  const statsByCode = useMemo(
    () => new Map(stats.map((entry) => [entry.courierCode, entry])),
    [stats],
  );

  /** One row per company, joined to whatever integration its code names. */
  const rows = useMemo<Row[]>(
    () =>
      companies.map((company) => {
        const entry = company.code ? (healthByCode.get(company.code) ?? null) : null;

        const state: RowState = !entry
          ? 'none'
          : entry.ok
            ? 'connected'
            : entry.configured
              ? 'disconnected'
              : 'pending';

        return {
          company,
          health: entry,
          stats: company.code ? (statsByCode.get(company.code) ?? null) : null,
          state,
        };
      }),
    [companies, healthByCode, statsByCode],
  );

  /** «في الانتظار» covers both kinds of not-set-up-yet: see STATE_COPY. */
  const inTab = (row: Row, which: 'all' | RowState) => {
    if (which === 'all') return true;
    if (which === 'pending') return row.state === 'pending' || row.state === 'none';
    return row.state === which;
  };

  const counts = useMemo(
    () => ({
      all: rows.length,
      connected: rows.filter((row) => inTab(row, 'connected')).length,
      pending: rows.filter((row) => inTab(row, 'pending')).length,
      disconnected: rows.filter((row) => inTab(row, 'disconnected')).length,
    }),
    [rows],
  );

  /**
   * Usable couriers first, then the ones that need someone.
   *
   * A list ordered by whenever a row happened to be created buries the only
   * question the page answers. Connected first because those are the ones a
   * merchant can be put on today; then `غير متصل`, which is a credential
   * somebody has to look at; then the two not-set-up states, which are work
   * nobody has started. Stable within each rank, so the order does not shuffle
   * between loads.
   */
  const STATE_RANK: Record<RowState, number> = {
    connected: 0,
    disconnected: 1,
    pending: 2,
    none: 3,
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const haystack = [
        row.company.name,
        row.company.code,
        row.health?.profile.nameAr,
        row.health?.profile.nameEn,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        inTab(row, tab) &&
        (!term || haystack.includes(term)) &&
        (!statusFilter || row.company.status === statusFilter)
      );
    }).sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, tab, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Narrowing the list can leave you past the last page.
  useEffect(() => setPage(1), [tab, search, statusFilter]);

  const unknownCode = Boolean(
    formData.code && !health.some((entry) => entry.code === formData.code),
  );

  const codeOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [
      // A company with no code still prices orders; it just cannot ship them.
      { value: '', label: 'بدون تكامل — تسعير فقط' },
      ...health.map((entry) => ({
        value: entry.code,
        label: `${entry.profile.nameAr} (${entry.code})${entry.ok ? '' : ' — غير جاهزة'}`,
      })),
    ];

    if (unknownCode) {
      options.push({
        value: formData.code as string,
        label: `${formData.code} — لا يوجد تكامل`,
      });
    }

    return options;
  }, [health, unknownCode, formData.code]);

  const openCreateDrawer = () => {
    setEditingCompany(null);
    setFormData(defaultForm);
    setShowDrawer(true);
  };

  const openEditDrawer = (company: DeliveryCompany) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      code: company.code || '',
      description: company.description || '',
      logo: company.logo || '',
      website: company.website || '',
      contact: company.contact || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      zip: company.zip || '',
      status: company.status,
      rating: company.rating || 0,
      // `??` rather than `||`: a deliberate 0 surcharge is not "unset".
      baseFee: company.baseFee ?? 5000,
      sameStateFee: company.sameStateFee ?? null,
      maxWeightGrams: company.maxWeightGrams ?? null,
      maxVolumeCm3: company.maxVolumeCm3 ?? null,
      maxQty: company.maxQty ?? null,
      weightStepGrams: company.weightStepGrams ?? 1000,
      weightStepFee: company.weightStepFee ?? 0,
      volumeStepCm3: company.volumeStepCm3 ?? 10000,
      volumeStepFee: company.volumeStepFee ?? 0,
      qtyStepFee: company.qtyStepFee ?? 0,
    });
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setEditingCompany(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setError('');
      if (editingCompany) {
        await deliveryCompanyService.updateDeliveryCompany(editingCompany.id, formData);
      } else {
        await deliveryCompanyService.createDeliveryCompany(formData);
      }
      closeDrawer();
      void fetchAll();
    } catch (err) {
      setError('فشل في حفظ شركة الشحن.');
      console.error('Error saving delivery company:', err);
    }
  };

  const handleDelete = async () => {
    if (!companyToDelete) return;
    try {
      setError('');
      await deliveryCompanyService.deleteDeliveryCompany(companyToDelete.id);
      setCompanyToDelete(null);
      void fetchAll();
    } catch (err) {
      setError('فشل في حذف شركة الشحن.');
      console.error('Error deleting delivery company:', err);
    }
  };

  if (loading && companies.length === 0) return <LoadingState />;

  return (
    <div className="page-shell bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="شركات الشحن"
        description="إدارة تكامل شركات الشحن ومتابعة الحالة والمفاتيح وطرق الشحن."
        icon={<Truck className="h-6 w-6" />}
        action={
          <PrimaryActionButton onClick={openCreateDrawer}>
            إضافة شركة شحن
            <Plus className="h-4 w-4" />
          </PrimaryActionButton>
        }
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      {/* The question an operator actually arrives with: which of these can
          ship right now, and which cannot. */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['all', 'الكل', counts.all],
            ['connected', 'متصلة', counts.connected],
            ['pending', 'في الانتظار', counts.pending],
            ['disconnected', 'غير متصلة', counts.disconnected],
          ] as Array<['all' | RowState, string, number]>
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition-all duration-200 active:scale-95 ${
              tab === key
                ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-100'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {label}
            <span
              className={`grid min-w-6 place-items-center rounded-full px-1.5 py-0.5 text-xs ${
                key === 'connected'
                  ? 'bg-emerald-50 text-emerald-600'
                  : key === 'pending'
                    ? 'bg-amber-50 text-amber-600'
                    : key === 'disconnected'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-slate-900 text-white'
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      <TableShell
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <span className="text-sm font-bold text-slate-400">
              عرض {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} -{' '}
              {Math.min(page * PAGE_SIZE, filtered.length)} من {filtered.length}{' '}
              شركات شحن
            </span>
            {/* A compact pager rather than the shared one: its page-size
                selector is noise on a list this short, and the count beside
                it is the more useful half. */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page === 1}
                className="grid size-9 place-items-center rounded-xl border border-slate-100 text-slate-400 transition-all duration-150 hover:bg-slate-50 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="grid size-9 place-items-center rounded-xl bg-slate-900 text-sm font-black text-white">
                {page}
              </span>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page === totalPages}
                className="grid size-9 place-items-center rounded-xl border border-slate-100 text-slate-400 transition-all duration-150 hover:bg-slate-50 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        }
      >
        <div className="px-5 pt-5">
          <SearchFiltersBar
            search={search}
            onSearchChange={setSearch}
            placeholder="بحث..."
            filterCount={statusFilter ? 1 : 0}
            filterPanel={
              <div className="space-y-3">
                <p className="text-xs font-black text-slate-500">حالة الشركة</p>
                <div className="space-y-1">
                  {(
                    [
                      ['', 'جميع الحالات'],
                      ['ACTIVE', 'نشطة'],
                      ['INACTIVE', 'غير نشطة'],
                    ] as Array<[DeliveryCompanyStatus | '', string]>
                  ).map(([value, label]) => (
                    <button
                      key={value || 'all'}
                      type="button"
                      onClick={() => setStatusFilter(value)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-sm font-bold transition-colors ${
                        statusFilter === value
                          ? 'bg-violet-50 text-violet-700'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {label}
                      {statusFilter === value && (
                        <Check className="h-4 w-4 animate-in zoom-in-50 duration-150" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            }
          />
        </div>

        <table className="w-full min-w-[980px]">
          <thead>
            <tr className="border-b border-slate-100 text-sm text-slate-400">
              <th className="px-5 py-4 text-right font-bold">شركة الشحن</th>
              <th className="px-5 py-4 text-right font-bold">الحالة</th>
              <th className="px-5 py-4 text-right font-bold">نوع التكامل</th>
              <th className="px-5 py-4 text-right font-bold">الخدمات المفعلة</th>
              <th className="px-5 py-4 text-right font-bold">آخر مزامنة</th>
              <th className="px-5 py-4 text-right font-bold">معدل التسليم</th>
              <th className="px-5 py-4 text-right font-bold">إجراءات</th>
            </tr>
          </thead>
          <tbody key={`${tab}-${statusFilter}-${page}`} className="divide-y divide-slate-100">
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <p className="text-sm font-bold text-slate-400">
                    لا توجد شركات شحن مطابقة.
                  </p>
                </td>
              </tr>
            )}

            {pageRows.map(({ company, health: entry, stats: counts2, state }, index) => {
              const enabled = entry
                ? CAPABILITY_LABELS.filter(([key]) => entry.capabilities[key])
                : [];
              const rate = counts2?.deliveryRate ?? null;

              return (
                <tr
                  key={company.id}
                  className="animate-in fade-in slide-in-from-bottom-1 transition-colors duration-200 hover:bg-slate-50/60"
                  /* Staggered, and capped: past about eight rows the delay
                     stops reading as motion and starts reading as lag. */
                  style={{ animationDelay: `${Math.min(index, 8) * 35}ms`, animationFillMode: 'both' }}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <CourierLogo
                        src={entry?.profile.logoUrl || company.logo}
                        name={company.name}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950">
                          {company.name}
                        </p>
                        <p className="truncate text-xs font-semibold text-slate-400">
                          {entry?.profile.nameEn ?? company.code ?? 'بدون كود'}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <StatusPill tone={STATE_COPY[state].tone}>
                      {STATE_COPY[state].label}
                    </StatusPill>
                  </td>

                  <td className="px-5 py-4 text-sm font-bold text-slate-600">
                    {entry ? 'API مباشر' : '—'}
                  </td>

                  <td className="px-5 py-4">
                    {enabled.length === 0 ? (
                      <span className="text-sm font-bold text-slate-300">—</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {enabled.slice(0, 2).map(([key, label]) => (
                          <span
                            key={key}
                            className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600"
                          >
                            {label}
                          </span>
                        ))}
                        {enabled.length > 2 && (
                          <span
                            className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-black text-violet-600"
                            title={enabled
                              .slice(2)
                              .map(([, label]) => label)
                              .join('، ')}
                          >
                            +{enabled.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 shrink-0 rounded-full ${syncTone(counts2?.lastSyncedAt)}`}
                      />
                      <span className="text-sm font-bold text-slate-600">
                        {sinceLabel(counts2?.lastSyncedAt)}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-[width] duration-700 ease-out"
                          style={{ width: `${Math.round((rate ?? 0) * 100)}%` }}
                        />
                      </div>
                      {/* A dash, never 0% — a courier nobody has results for
                          is not a courier failing everything. */}
                      <span className="text-sm font-black text-slate-700">
                        {rate === null ? '–' : `${Math.round(rate * 100)}%`}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <RowMenu>
                      {(close) => (
                        <>
                          {entry && (
                            <MenuItem
                              icon={<Truck className="h-4 w-4" />}
                              label="تفاصيل التكامل"
                              onClick={() => {
                                setDetailCourier(entry);
                                close();
                              }}
                            />
                          )}
                          <MenuItem
                            icon={<Pencil className="h-4 w-4" />}
                            label="تعديل الشركة"
                            onClick={() => {
                              openEditDrawer(company);
                              close();
                            }}
                          />
                          <Link
                            to={`/dashboard/delivery/${company.id}/zones`}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-right text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                          >
                            <MapPinned className="h-4 w-4" />
                            المناطق والأكواد
                          </Link>
                          <MenuItem
                            icon={<Trash2 className="h-4 w-4" />}
                            label="حذف الشركة"
                            tone="danger"
                            onClick={() => {
                              setCompanyToDelete(company);
                              close();
                            }}
                          />
                        </>
                      )}
                    </RowMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableShell>

      {detailCourier && (
        <CourierDetailDrawer
          courier={detailCourier}
          onClose={() => setDetailCourier(null)}
          /* A probe inside the drawer is a real result — fold it back so the
             row behind does not keep showing the stale one. */
          onHealthChange={(checked) => {
            setDetailCourier(checked);
            setHealth((entries) =>
              entries.map((entry) => (entry.code === checked.code ? checked : entry)),
            );
          }}
        />
      )}

      {showDrawer && (
        <form onSubmit={handleSubmit}>
          <SideDrawer
            title={editingCompany ? 'تعديل شركة الشحن' : 'إضافة شركة شحن'}
            icon={<Truck className="h-6 w-6" />}
            onClose={closeDrawer}
            footer={
              <DrawerFooter
                onCancel={closeDrawer}
                submitLabel={editingCompany ? 'حفظ التغييرات' : 'إضافة الشركة'}
              />
            }
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField label="اسم الشركة" value={formData.name} required onChange={(value) => setFormData((current) => ({ ...current, name: value }))} />
              {/* Not a text box. The code is the only thing binding this row
                  to an adapter, so a typo creates a company that looks
                  healthy, quietly prices every order at the fallback fee and
                  then fails at dispatch with "no shipping integration". */}
              <div>
                <SelectField
                  label="الكود — التكامل المرتبط"
                  value={formData.code || ''}
                  options={codeOptions}
                  onChange={(value) => setFormData((current) => ({ ...current, code: value }))}
                />
                <p className="mt-1.5 text-xs font-semibold text-slate-400">
                  {formData.code
                    ? 'الشحن والتتبّع والإلغاء تمر عبر هذا التكامل.'
                    : 'بدون كود لن تستطيع هذه الشركة شحن أي طلب — التسعير فقط.'}
                </p>
                {/* A row created before an adapter existed, or by hand. Kept
                    selectable so editing the company does not silently
                    rewrite its code to something else. */}
                {unknownCode && (
                  <p className="mt-1.5 text-xs font-black text-orange-600">
                    لا يوجد تكامل بهذا الكود. اختر واحدًا من القائمة أو أزل الكود.
                  </p>
                )}
              </div>
              <FormField label="جهة الاتصال" value={formData.contact} onChange={(value) => setFormData((current) => ({ ...current, contact: value }))} />
              <FormField label="البريد الإلكتروني" value={formData.email} required onChange={(value) => setFormData((current) => ({ ...current, email: value }))} />
              <FormField label="رقم الهاتف" value={formData.phone} onChange={(value) => setFormData((current) => ({ ...current, phone: value }))} />
              <FormField label="رابط الشعار" value={formData.logo} onChange={(value) => setFormData((current) => ({ ...current, logo: value }))} />
              <FormField label="الموقع الإلكتروني" value={formData.website} onChange={(value) => setFormData((current) => ({ ...current, website: value }))} />
              <FormField label="العنوان" value={formData.address} onChange={(value) => setFormData((current) => ({ ...current, address: value }))} />
              <FormField label="الرمز البريدي" value={formData.zip} onChange={(value) => setFormData((current) => ({ ...current, zip: value }))} />
              <FormField label="التقييم" type="number" value={formData.rating} onChange={(value) => setFormData((current) => ({ ...current, rating: Number(value) }))} />
              <div className="sm:col-span-2 pt-2">
                <h4 className="text-sm font-black text-slate-950">تسعير الشحن</h4>
                <p className="mt-1 text-xs text-slate-500">
                  تُستخدم هذه القيم عندما يتعذر الحصول على سعر مباشر من شركة الشحن — أو
                  عندما لا تكون مدينة الزبون مربوطة بكود لدى الشركة.
                </p>
              </div>

              <FormField
                label="السعر الافتراضي (د.ع)"
                type="number"
                value={formData.baseFee ?? ''}
                onChange={(value) => setFormData((current) => ({ ...current, baseFee: Number(value) }))}
              />
              <FormField
                label="السعر داخل نفس المحافظة (د.ع)"
                type="number"
                value={formData.sameStateFee ?? ''}
                onChange={(value) => setFormData((current) => ({ ...current, sameStateFee: toOptionalNumber(value) }))}
              />

              <FormField
                label="أقصى وزن (غرام)"
                type="number"
                value={formData.maxWeightGrams ?? ''}
                onChange={(value) => setFormData((current) => ({ ...current, maxWeightGrams: toOptionalNumber(value) }))}
              />
              <FormField
                label="رسوم كل وحدة وزن إضافية (د.ع)"
                type="number"
                value={formData.weightStepFee ?? ''}
                onChange={(value) => setFormData((current) => ({ ...current, weightStepFee: Number(value) }))}
              />
              <FormField
                label="وحدة الوزن (غرام)"
                type="number"
                value={formData.weightStepGrams ?? ''}
                onChange={(value) => setFormData((current) => ({ ...current, weightStepGrams: Number(value) }))}
              />

              <FormField
                label="أقصى حجم (سم³)"
                type="number"
                value={formData.maxVolumeCm3 ?? ''}
                onChange={(value) => setFormData((current) => ({ ...current, maxVolumeCm3: toOptionalNumber(value) }))}
              />
              <FormField
                label="رسوم كل وحدة حجم إضافية (د.ع)"
                type="number"
                value={formData.volumeStepFee ?? ''}
                onChange={(value) => setFormData((current) => ({ ...current, volumeStepFee: Number(value) }))}
              />
              <FormField
                label="وحدة الحجم (سم³)"
                type="number"
                value={formData.volumeStepCm3 ?? ''}
                onChange={(value) => setFormData((current) => ({ ...current, volumeStepCm3: Number(value) }))}
              />

              <FormField
                label="أقصى عدد قطع"
                type="number"
                value={formData.maxQty ?? ''}
                onChange={(value) => setFormData((current) => ({ ...current, maxQty: toOptionalNumber(value) }))}
              />
              <FormField
                label="رسوم كل قطعة إضافية (د.ع)"
                type="number"
                value={formData.qtyStepFee ?? ''}
                onChange={(value) => setFormData((current) => ({ ...current, qtyStepFee: Number(value) }))}
              />

              <SelectField
                label="الحالة"
                value={formData.status}
                options={[{ value: 'ACTIVE', label: 'نشطة' }, { value: 'INACTIVE', label: 'غير نشطة' }]}
                onChange={(value) => setFormData((current) => ({ ...current, status: value as DeliveryCompanyStatus }))}
              />
            </div>
          </SideDrawer>
        </form>
      )}

      {companyToDelete && (
        <ConfirmDeleteModal
          title="هل أنت متأكد من حذف شركة الشحن؟"
          description={`سيتم حذف ${companyToDelete.name} من قائمة شركات الشحن.`}
          confirmLabel="حذف الشركة"
          onClose={() => setCompanyToDelete(null)}
          onConfirm={handleDelete}
          preview={
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <Truck className="mx-auto mb-4 h-12 w-12 text-red-500" />
              <p className="text-xl font-black text-slate-950">{companyToDelete.name}</p>
            </div>
          }
        />
      )}
    </div>
  );
};

export default DeliveryCompanies;

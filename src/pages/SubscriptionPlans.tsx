import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Crown, Layers3, Pencil, Plus, ReceiptText, Sparkles, Trash2 } from 'lucide-react';
import {
  AlertMessage,
  CheckboxListField,
  ConfirmDeleteModal,
  DrawerFooter,
  FormField,
  LoadingState,
  PageHeader,
  PrimaryActionButton,
  SearchFiltersBar,
  SelectField,
  SideDrawer,
  StatCard,
  StatusPill,
  TableShell,
  TextAreaField,
} from '@/components/dashboard';
import {
  plansService,
  type FeatureOption,
  type EditorPricing,
  type ModuleOption,
  type Plan,
  type PlanFeature,
  type PlanPayload,
} from '../services/plansService';
import { systemSubscriptionsService, type Subscription } from '../services/systemSubscriptionsService';
import { renderText } from '@/utils/renderText';
import {
  subscriptionStatusLabel,
  subscriptionStatusTone,
} from '@/utils/subscriptionStatus';

/**
 * The defaults a new plan starts from — Basic's shape, so an operator adjusts
 * rather than discovers that everything fell to a schema default.
 *
 * This used to carry only the six fields the form showed, and `featureIds` was
 * absent entirely, which is what made `create` reject any feature text: the
 * server reads `featureIds ?? features`, so the free-text names were validated as
 * uuids.
 */
const defaultPlanForm: PlanPayload = {
  name: '',
  description: '',
  monthly_price: 0,
  enabled: true,
  most_popular: false,
  code: '',
  max_users: 1,
  ai_store_credits: 0,
  ai_editor_credits: 0,
  has_mobile_app: false,
  has_ai_editor: false,
  has_pos: false,
  is_free: false,
  order_number: null,
  promo_enabled: true,
  promo_free_months: 1,
  promo_discount_months: 0,
  promo_discount_percent: 0,
  quarterly_discount_percent: 10,
  yearly_discount_percent: 25,
  max_products: 50,
  max_categories: 10,
  max_category_groups: 5,
  max_coupons: 5,
  max_monthly_orders: 50,
  ai_store_trial: 1,
  ai_editor_trial: 5,
  has_social_pixels: false,
  has_custom_domain: false,
  featureIds: [],
  moduleIds: [],
};

const YES_NO = [
  { value: 'false', label: 'لا' },
  { value: 'true', label: 'نعم' },
];

/** The capped resources, in the order the form and the card list them. Empty is unlimited. */
const LIMIT_FIELDS = [
  { key: 'max_products', label: 'أقصى عدد للمنتجات', short: 'منتج' },
  { key: 'max_categories', label: 'أقصى عدد للأقسام', short: 'قسم' },
  { key: 'max_category_groups', label: 'أقصى عدد لمجموعات الأقسام', short: 'مجموعة أقسام' },
  { key: 'max_coupons', label: 'أقصى عدد للكوبونات', short: 'كوبون' },
  { key: 'max_monthly_orders', label: 'الطلبات شهرياً', short: 'طلب شهرياً' },
] as const;

type LimitKey = (typeof LIMIT_FIELDS)[number]['key'];

/** A cap as typed: blank or negative means unlimited. */
const parseLimit = (value: string): number | null => {
  if (value.trim() === '') return null;
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionTotal, setSubscriptionTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<PlanPayload>(defaultPlanForm);
  const [featureOptions, setFeatureOptions] = useState<FeatureOption[]>([]);
  const [moduleOptions, setModuleOptions] = useState<ModuleOption[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Each request settles on its own. With `Promise.all`, one failing endpoint
   * (the plans query, when the server is ahead of its database) blanked the
   * subscriptions, features and modules that had loaded fine.
   */
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [plansRes, subsRes, features, modules] = await Promise.allSettled([
        plansService.getAllPlans(),
        systemSubscriptionsService.getAllSubscriptions({ page: 1, limit: 10 }),
        plansService.getFeatureOptions(),
        plansService.getModuleOptions(),
      ]);
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data || []);
      if (subsRes.status === 'fulfilled') {
        setSubscriptions(subsRes.value?.data || []);
        setSubscriptionTotal(subsRes.value?.total || 0);
      }
      if (features.status === 'fulfilled') setFeatureOptions(features.value);
      if (modules.status === 'fulfilled') setModuleOptions(modules.value);

      const failed = [
        plansRes.status === 'rejected' && 'الباقات',
        subsRes.status === 'rejected' && 'الاشتراكات',
        (features.status === 'rejected' || modules.status === 'rejected') && 'الميزات',
      ].filter(Boolean);
      if (failed.length) {
        setError(`فشل في جلب ${failed.join(' و')}. حاول مرة أخرى بعد قليل.`);
        [plansRes, subsRes, features, modules].forEach((result) => {
          if (result.status === 'rejected') console.error('Error loading plans page:', result.reason);
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = useMemo(() => plans.filter((plan) => {
    const text = [renderText(plan.name), renderText(plan.description)].join(' ').toLowerCase();
    return text.includes(search.toLowerCase());
  }), [plans, search]);

  const openCreateDrawer = () => {
    setEditingPlan(null);
    setFormData(defaultPlanForm);
    setShowDrawer(true);
  };

  const openEditDrawer = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: renderText(plan.name),
      description: renderText(plan.description),
      monthly_price: plan.monthly_price || 0,
      enabled: plan.enabled,
      most_popular: plan.most_popular,
      code: plan.code ?? '',
      max_users: plan.max_users ?? 1,
      ai_store_credits: plan.ai_store_credits ?? 0,
      ai_editor_credits: plan.ai_editor_credits ?? 0,
      has_mobile_app: plan.has_mobile_app ?? false,
      has_ai_editor: plan.has_ai_editor ?? false,
      has_pos: plan.has_pos ?? false,
      is_free: plan.is_free ?? false,
      order_number: plan.order_number ?? null,
      promo_enabled: plan.promo_enabled ?? true,
      promo_free_months: plan.promo_free_months ?? 1,
      promo_discount_months: plan.promo_discount_months ?? 6,
      promo_discount_percent: plan.promo_discount_percent ?? 50,
      quarterly_discount_percent: plan.quarterly_discount_percent ?? 10,
      yearly_discount_percent: plan.yearly_discount_percent ?? 25,
      // `undefined` (server older than the columns) reads as unlimited, which is
      // what those plans were.
      max_products: plan.max_products ?? null,
      max_categories: plan.max_categories ?? null,
      max_category_groups: plan.max_category_groups ?? null,
      max_coupons: plan.max_coupons ?? null,
      max_monthly_orders: plan.max_monthly_orders ?? null,
      ai_store_trial: plan.ai_store_trial ?? 0,
      ai_editor_trial: plan.ai_editor_trial ?? 0,
      has_social_pixels: plan.has_social_pixels ?? false,
      has_custom_domain: plan.has_custom_domain ?? false,
      featureIds: plan.features?.map((item) => item.feature.id) || [],
      // `item.module.id`, not `item.id`: the server wraps each module in a join
      // row, exactly as it does features one line above. Reading the wrapper
      // produced `[undefined]`, so a plan with any module attached could not be
      // saved again.
      moduleIds: plan.modules?.map((item) => item.module.id) || [],
    });
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setEditingPlan(null);
    setFormData(defaultPlanForm);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    // The yearly price is the server's to work out from the monthly price and
    // the yearly discount; sending a stale one would only be ignored.
    const payload: PlanPayload = {
      ...formData,
      yearly_price: undefined,
      // Empty means "no machine key", which the column allows. Sending '' would
      // claim the unique index for the empty string and block the next plan.
      code: formData.code?.trim() ? formData.code.trim() : null,
      order_number:
        formData.order_number === null || Number.isNaN(formData.order_number)
          ? null
          : Number(formData.order_number),
    };

    try {
      setError('');
      if (editingPlan) {
        await plansService.updatePlan(editingPlan.id, payload);
      } else {
        await plansService.createPlan(payload);
      }
      closeDrawer();
      loadData();
    } catch (err) {
      // The server's own message, which says *what* was wrong. The generic line
      // this replaces hid "One or more feature IDs are invalid" — the error the
      // old free-text fields produced every time.
      const detail = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      setError(
        [
          editingPlan ? 'فشل في تحديث الباقة.' : 'فشل في إنشاء الباقة.',
          Array.isArray(detail) ? detail.join(' — ') : detail,
        ]
          .filter(Boolean)
          .join(' '),
      );
      console.error('Error saving plan:', err);
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    try {
      setError('');
      await plansService.deletePlan(planToDelete.id);
      setPlanToDelete(null);
      loadData();
    } catch (err) {
      setError('فشل في حذف الباقة.');
      console.error('Error deleting plan:', err);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="page-shell bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="باقات الاشتراك"
        description={<>هناك <span className="font-black text-violet-600">{plans.length} باقة</span> و <span className="font-black text-violet-600">{subscriptionTotal} اشتراك</span></>}
        icon={<Crown className="h-6 w-6" />}
        action={<PrimaryActionButton onClick={openCreateDrawer}>إضافة باقة<Plus className="h-4 w-4" /></PrimaryActionButton>}
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      <div className="grid grid-cols-2 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="إجمالي الباقات" value={plans.length} icon={<Layers3 />} tone="blue" />
        <StatCard title="الباقات المفعلة" value={plans.filter((plan) => plan.enabled).length} icon={<CheckCircle />} tone="teal" />
        <StatCard title="الأكثر شيوعاً" value={plans.filter((plan) => plan.most_popular).length} icon={<Sparkles />} tone="amber" />
        <StatCard title="الاشتراكات" value={subscriptionTotal} icon={<ReceiptText />} tone="violet" />
      </div>

      <EditorCreditValue />

      <SearchFiltersBar search={search} onSearchChange={setSearch} placeholder="ابحث عن باقة" onFilterClick={() => setSearch('')} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredPlans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onEdit={openEditDrawer} onDelete={setPlanToDelete} />
        ))}
      </div>

      {/* The table had no heading, so on desktop it read as part of the plan
          grid. It shows the latest page only; the full list lives on its own
          screen. */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <h2 className="text-lg font-black text-slate-950">أحدث الاشتراكات</h2>
        <button
          type="button"
          onClick={() => navigate('/dashboard/subscriptions')}
          className="rounded-xl bg-violet-50 px-4 py-2 text-sm font-black text-violet-600"
        >
          عرض الكل
        </button>
      </div>

      <TableShell>
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
              <th className="px-5 py-5 text-right">المتجر</th>
              <th className="px-5 py-5 text-right">الخطة</th>
              <th className="px-5 py-5 text-right">الحالة</th>
              <th className="px-5 py-5 text-right">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subscriptions.map((sub) => (
              <tr key={sub.id} className="text-sm text-slate-700 transition hover:bg-slate-50/70">
                {/* `.name`, not `renderText(sub.store)` — that only printed the
                    right thing by accident, via renderText's object fallback. */}
                <td className="px-5 py-4 font-black text-slate-950">{sub.store?.name || '—'}</td>
                <td className="px-5 py-4 font-semibold text-slate-600">{sub.plan?.name || '—'}</td>
                <td className="px-5 py-4">
                  <StatusPill tone={subscriptionStatusTone(sub.status)}>
                    {subscriptionStatusLabel(sub.status)}
                  </StatusPill>
                </td>
                {/* Had no onClick at all. */}
                <td className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/stores/${sub.storeId}`)}
                    className="rounded-xl bg-violet-50 px-4 py-2 text-sm font-black text-violet-600"
                  >
                    عرض
                  </button>
                </td>
              </tr>
            ))}
            {subscriptions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center font-bold text-slate-400">لا توجد اشتراكات</td>
              </tr>
            )}
          </tbody>
        </table>
      </TableShell>

      {showDrawer && (
        <form onSubmit={handleSubmit}>
          <SideDrawer
            title={editingPlan ? 'تعديل الباقة' : 'إضافة باقة'}
            icon={<Crown className="h-6 w-6" />}
            onClose={closeDrawer}
            footer={<DrawerFooter onCancel={closeDrawer} submitLabel={editingPlan ? 'حفظ التغييرات' : 'إضافة الباقة'} />}
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField label="اسم الباقة" value={formData.name} required onChange={(value) => setFormData((current) => ({ ...current, name: value }))} />
              <FormField label="السعر الشهري" type="number" value={formData.monthly_price} required onChange={(value) => setFormData((current) => ({ ...current, monthly_price: Number(value) }))} />
              <FormField
                label="خصم الاشتراك لـ 3 أشهر %"
                type="number"
                value={formData.quarterly_discount_percent}
                required
                onChange={(value) => setFormData((current) => ({ ...current, quarterly_discount_percent: Number(value) }))}
              />
              <FormField
                label="خصم الاشتراك السنوي %"
                type="number"
                value={formData.yearly_discount_percent}
                required
                onChange={(value) => setFormData((current) => ({ ...current, yearly_discount_percent: Number(value) }))}
              />
              <p className="md:col-span-2 -mt-2 text-xs font-semibold text-slate-500">
                {`3 أشهر: ${periodPrice(formData.monthly_price, 3, formData.quarterly_discount_percent).toLocaleString('en-US')} د.ع · سنة: ${periodPrice(formData.monthly_price, 12, formData.yearly_discount_percent).toLocaleString('en-US')} د.ع. لا يجتمع هذا الخصم مع عرض المشتركين الجدد، ويدفع العميل الأرخص منهما.`}
              </p>
              <SelectField
                label="الحالة"
                value={formData.enabled ? 'true' : 'false'}
                options={[{ value: 'true', label: 'مفعلة' }, { value: 'false', label: 'معطلة' }]}
                onChange={(value) => setFormData((current) => ({ ...current, enabled: value === 'true' }))}
              />
              <SelectField
                label="الأكثر شيوعاً"
                value={formData.most_popular ? 'true' : 'false'}
                options={[{ value: 'false', label: 'لا' }, { value: 'true', label: 'نعم' }]}
                onChange={(value) => setFormData((current) => ({ ...current, most_popular: value === 'true' }))}
              />
              <div className="md:col-span-2">
                <TextAreaField label="الوصف" value={formData.description} rows={4} onChange={(value) => setFormData((current) => ({ ...current, description: value }))} />
              </div>
              {/* What the plan actually grants. None of these were on the form,
                  so every one fell to its schema default: a plan created here got
                  `code: null`, one seat, no AI editor and no mobile app, whatever
                  the operator had in mind. Entitlement checks read these columns,
                  and `upgradeAvailable` reads `code !== 'PLUS'`. */}
              <FormField
                label="الرمز (GO / PLUS) — يُستخدم للتحقق من المزايا"
                value={formData.code ?? ''}
                placeholder="اتركه فارغاً إن لم يكن باقة أساسية"
                onChange={(value) => setFormData((current) => ({ ...current, code: value }))}
              />
              <FormField
                label="ترتيب العرض"
                type="number"
                value={formData.order_number ?? ''}
                onChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    order_number: value === '' ? null : Number(value),
                  }))
                }
              />
              <FormField
                label="عدد المستخدمين (يشمل المالك)"
                type="number"
                value={formData.max_users}
                required
                onChange={(value) => setFormData((current) => ({ ...current, max_users: Number(value) }))}
              />
              <FormField
                label="رصيد توليد المتاجر شهرياً"
                type="number"
                value={formData.ai_store_credits}
                required
                onChange={(value) => setFormData((current) => ({ ...current, ai_store_credits: Number(value) }))}
              />
              <FormField
                label="رصيد مساعد المحرر شهرياً (يُحسب بالتكلفة الفعلية)"
                type="number"
                value={formData.ai_editor_credits}
                required
                onChange={(value) => setFormData((current) => ({ ...current, ai_editor_credits: Number(value) }))}
              />
              <SelectField
                label="محرر الذكاء الاصطناعي"
                value={formData.has_ai_editor ? 'true' : 'false'}
                options={YES_NO}
                onChange={(value) => setFormData((current) => ({ ...current, has_ai_editor: value === 'true' }))}
              />
              <SelectField
                label="تطبيق الهاتف"
                value={formData.has_mobile_app ? 'true' : 'false'}
                options={YES_NO}
                onChange={(value) => setFormData((current) => ({ ...current, has_mobile_app: value === 'true' }))}
              />
              <SelectField
                label="نقطة البيع POS"
                value={formData.has_pos ? 'true' : 'false'}
                options={YES_NO}
                onChange={(value) => setFormData((current) => ({ ...current, has_pos: value === 'true' }))}
              />
              <SelectField
                label="باقة مجانية"
                value={formData.is_free ? 'true' : 'false'}
                options={YES_NO}
                onChange={(value) => setFormData((current) => ({ ...current, is_free: value === 'true' }))}
              />

              {/* Caps. A store over one keeps what it has; only adding more is
                  refused. Orders never block checkout: past the cap the merchant
                  only sees an upgrade prompt. */}
              <div className="md:col-span-2 rounded-2xl bg-slate-50 p-4 text-right">
                <p className="text-sm font-black text-slate-800">حدود الباقة</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  اترك الحقل فارغاً ليكون بلا حدود. المتجر الذي تجاوز الحد يحتفظ بكل بياناته لكن لا يضيف المزيد، وتجاوز حد الطلبات لا يوقف الطلبات بل يظهر للتاجر دعوة للترقية.
                </p>
              </div>
              {LIMIT_FIELDS.map((field) => (
                <FormField
                  key={field.key}
                  label={field.label}
                  type="number"
                  value={formData[field.key] ?? ''}
                  placeholder="بلا حدود"
                  onChange={(value) =>
                    setFormData((current) => ({ ...current, [field.key]: parseLimit(value) }))
                  }
                />
              ))}

              <div className="md:col-span-2 rounded-2xl bg-slate-50 p-4 text-right">
                <p className="text-sm font-black text-slate-800">التجربة المجانية والمزايا</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  التجربة مرة واحدة لكل حساب ولا تتجدد. تُستخدم فقط عندما لا تشمل الباقة الخدمة نفسها.
                </p>
              </div>
              <FormField
                label="تجربة توليد متجر بالذكاء الاصطناعي (مرة واحدة)"
                type="number"
                value={formData.ai_store_trial}
                required
                onChange={(value) => setFormData((current) => ({ ...current, ai_store_trial: Number(value) }))}
              />
              <FormField
                label="رسائل تجربة مساعد المحرر (مرة واحدة)"
                type="number"
                value={formData.ai_editor_trial}
                required
                onChange={(value) => setFormData((current) => ({ ...current, ai_editor_trial: Number(value) }))}
              />
              <SelectField
                label="بكسلات الإعلانات (ميتا، تيك توك، سناب)"
                value={formData.has_social_pixels ? 'true' : 'false'}
                options={YES_NO}
                onChange={(value) => setFormData((current) => ({ ...current, has_social_pixels: value === 'true' }))}
              />
              <SelectField
                label="ربط نطاق خاص"
                value={formData.has_custom_domain ? 'true' : 'false'}
                options={YES_NO}
                onChange={(value) => setFormData((current) => ({ ...current, has_custom_domain: value === 'true' }))}
              />

              {/* The intro offer new customers get on monthly billing. The
                  server bills from these columns, and the landing page shows
                  them, so editing them changes both. */}
              <div className="md:col-span-2 rounded-2xl bg-violet-50 p-4 text-right">
                <p className="text-sm font-black text-violet-700">عرض المشتركين الجدد (الدفع الشهري)</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  أشهر مجانية للعميل الجديد، ثم أشهر بخصم، ثم السعر الكامل. يُمنح مرة واحدة لكل مالك مهما كان عدد متاجره. إيقاف العرض يحاسب الجميع بالسعر الكامل من دفعتهم القادمة.
                </p>
              </div>
              <SelectField
                label="تفعيل العرض"
                value={formData.promo_enabled ? 'true' : 'false'}
                options={YES_NO}
                onChange={(value) => setFormData((current) => ({ ...current, promo_enabled: value === 'true' }))}
              />
              <FormField
                label="الأشهر المجانية"
                type="number"
                value={formData.promo_free_months}
                required
                onChange={(value) => setFormData((current) => ({ ...current, promo_free_months: Number(value) }))}
              />
              <FormField
                label="أشهر الخصم بعد المجانية"
                type="number"
                value={formData.promo_discount_months}
                required
                onChange={(value) => setFormData((current) => ({ ...current, promo_discount_months: Number(value) }))}
              />
              <FormField
                label="نسبة الخصم %"
                type="number"
                value={formData.promo_discount_percent}
                required
                onChange={(value) => setFormData((current) => ({ ...current, promo_discount_percent: Number(value) }))}
              />

              {/* Picked by id from the real rows. These were two comma-separated
                  text boxes, and the server validates what it is sent as uuids —
                  so creating a plan with any feature typed in failed, and editing
                  one ignored the box because `featureIds` won. */}
              <div className="md:col-span-2">
                <CheckboxListField
                  label="الميزات"
                  hint={`${formData.featureIds.length} مختارة`}
                  options={featureOptions}
                  selected={formData.featureIds}
                  onChange={(featureIds) => setFormData((current) => ({ ...current, featureIds }))}
                  empty="لا توجد ميزات معرّفة — أضفها من قاعدة البيانات أولاً"
                />
              </div>
              <div className="md:col-span-2">
                <CheckboxListField
                  label="الموديولات"
                  hint={`${formData.moduleIds.length} مختارة`}
                  options={moduleOptions}
                  selected={formData.moduleIds}
                  onChange={(moduleIds) => setFormData((current) => ({ ...current, moduleIds }))}
                  empty="لا توجد موديولات معرّفة"
                />
              </div>
            </div>
          </SideDrawer>
        </form>
      )}

      {planToDelete && (
        <ConfirmDeleteModal
          title="هل أنت متأكد من حذف الباقة؟"
          description={`سيتم حذف ${renderText(planToDelete.name)} من قائمة الباقات.`}
          confirmLabel="حذف الباقة"
          onClose={() => setPlanToDelete(null)}
          onConfirm={handleDeletePlan}
          preview={<div className="rounded-3xl bg-white p-6 shadow-sm"><Crown className="mx-auto mb-4 h-12 w-12 text-red-500" /><p className="text-xl font-black text-slate-950">{renderText(planToDelete.name)}</p></div>}
        />
      )}
    </div>
  );
};

/**
 * The page is RTL, so the card is laid out from the right: icon first, then the
 * text, and every row starts at the right edge. It was written LTR-first
 * (`justify-end`, icon after the text), which in RTL pushed the header, badges
 * and feature list to the *left* edge of the card while the price block stayed
 * right-aligned — most visible on a plan with a short name.
 */
const PlanCard = ({ plan, onEdit, onDelete }: { plan: Plan; onEdit: (plan: Plan) => void; onDelete: (plan: Plan) => void }) => (
  <div className="flex h-full flex-col rounded-[1.7rem] bg-white p-6 text-right shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg">
    <div className="mb-5 flex items-start gap-3">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600">
        <Crown className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 truncate text-xl font-black text-slate-950">{renderText(plan.name)}</h2>
          {plan.most_popular && (
            <span className="shrink-0 rounded-full bg-violet-600 px-3 py-1 text-xs font-black text-white">الأكثر شيوعاً</span>
          )}
        </div>
        {renderText(plan.description) ? (
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-400">{renderText(plan.description)}</p>
        ) : null}
        {/* The list now includes disabled and free plans, because the one screen
            that can re-enable a plan was reading a feed that hid it. That makes
            saying which is which the card's job — without this, a plan nobody can
            buy looks exactly like a live one. */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusPill tone={plan.enabled ? 'green' : 'red'} dot>
            {plan.enabled ? 'مفعلة' : 'معطلة'}
          </StatusPill>
          {plan.code ? <StatusPill tone="violet">{plan.code}</StatusPill> : null}
          {plan.is_free ? <StatusPill tone="blue">مجانية</StatusPill> : null}
        </div>
      </div>
    </div>
    <div className="mb-5 rounded-3xl bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-400">السعر الشهري</p>
      <p className="mt-1 text-3xl font-black text-slate-950">{plan.monthly_price?.toLocaleString('en-US') || 0} <span className="text-sm text-slate-500">د.ع</span></p>
      <p className="mt-3 text-sm font-bold text-slate-400">
        السنوي: <span className="text-slate-700">{plan.yearly_price?.toLocaleString('en-US') || 0} د.ع</span>
        {plan.yearly_discount_percent ? ` (خصم ${plan.yearly_discount_percent}%)` : ''}
        {plan.quarterly_discount_percent ? ` · 3 أشهر: خصم ${plan.quarterly_discount_percent}%` : ''}
      </p>
      {(plan.promo_enabled ?? true) && promoText(plan) ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
          {`عرض المشتركين الجدد: ${promoText(plan)}`}
        </p>
      ) : null}
    </div>
    <div className="mb-5 flex flex-wrap gap-2">
      {LIMIT_FIELDS.map((field) => (
        <span key={field.key} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {limitText(plan[field.key as LimitKey], field.short)}
        </span>
      ))}
      {plan.ai_store_trial ? (
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{`تجربة ${plan.ai_store_trial} توليد متجر`}</span>
      ) : null}
      {plan.ai_editor_trial ? (
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{`تجربة ${plan.ai_editor_trial} رسائل للمساعد`}</span>
      ) : null}
      {plan.has_social_pixels ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">بكسلات الإعلانات</span> : null}
      {plan.has_custom_domain ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">نطاق خاص</span> : null}
    </div>
    <ul className="space-y-3">
      {Array.isArray(plan.features) && plan.features.length > 0 ? (
        plan.features.slice(0, 5).map((feature: PlanFeature) => (
          <li key={feature.feature.id} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
            <span className="min-w-0">{renderText(feature.feature.name)}</span>
          </li>
        ))
      ) : (
        <li className="text-sm font-semibold text-slate-400">لا توجد ميزات</li>
      )}
    </ul>
    {/* `mt-auto`: cards in a row stretch to the tallest, so the buttons line up
        along the bottom instead of floating under a short feature list. */}
    <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-6">
      <button type="button" onClick={() => onEdit(plan)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-l from-violet-700 to-fuchsia-500 font-black text-white">
        <Pencil className="h-4 w-4" />
        إدارة الباقة
      </button>
      <button type="button" onClick={() => onDelete(plan)} aria-label="حذف الباقة" className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-500"><Trash2 className="h-4 w-4" /></button>
    </div>
  </div>
);

/**
 * What one editor-agent credit is worth. Agent turns are charged by their real
 * model cost, so a plan's monthly credits mean credits × this many dollars of
 * model spend. The last 30 days are shown beside it so a change can be judged
 * before it is saved.
 */
const EditorCreditValue = () => {
  const [pricing, setPricing] = useState<EditorPricing | null>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    plansService
      .getEditorPricing()
      .then((result) => {
        setPricing(result);
        setValue(String(result.usdPerCredit));
      })
      // Server older than the endpoint: the panel just stays hidden.
      .catch((err) => console.error('Error loading editor pricing:', err));
  }, []);

  if (!pricing) return null;

  const parsed = Number(value);
  const valid = Number.isFinite(parsed) && parsed >= 0.001 && parsed <= 100;
  const avgAtValue = valid && pricing.last30Days.avgCostUsd > 0
    ? Math.max(0.01, Math.round((pricing.last30Days.avgCostUsd / parsed) * 100) / 100)
    : 0;

  const save = async () => {
    if (!valid) return;
    try {
      setSaving(true);
      setMessage('');
      const result = await plansService.updateEditorPricing(parsed);
      setPricing(result);
      setValue(String(result.usdPerCredit));
      setMessage('تم الحفظ');
    } catch (err) {
      setMessage('فشل الحفظ');
      console.error('Error saving editor pricing:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[1.7rem] bg-white p-6 text-right shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-slate-950">قيمة رصيد مساعد المحرر</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            كل رسالة للمساعد تُخصم حسب تكلفتها الفعلية. الرصيد الواحد يساوي هذا المبلغ من تكلفة النموذج بالدولار.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
          دولار لكل رصيد
          <input
            type="number"
            step="0.001"
            min="0.001"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="h-12 w-36 rounded-2xl border border-slate-200 px-4 text-left font-black text-slate-950"
            dir="ltr"
          />
        </label>
        <button
          type="button"
          onClick={save}
          disabled={!valid || saving || parsed === pricing.usdPerCredit}
          className="h-12 rounded-2xl bg-blue-600 px-6 font-black text-white disabled:opacity-40"
        >
          {saving ? 'جارٍ الحفظ…' : 'حفظ'}
        </button>
      </div>
      <table className="mt-5 w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          <tr>
            <td className="py-2 font-semibold text-slate-500">رسائل آخر 30 يوماً</td>
            <td className="py-2 font-black text-slate-950">{pricing.last30Days.turns.toLocaleString('en-US')}</td>
          </tr>
          <tr>
            <td className="py-2 font-semibold text-slate-500">متوسط تكلفة الرسالة</td>
            <td className="py-2 font-black text-slate-950" dir="ltr">${pricing.last30Days.avgCostUsd.toFixed(4)}</td>
          </tr>
          <tr>
            <td className="py-2 font-semibold text-slate-500">متوسط الخصم لكل رسالة بهذه القيمة</td>
            <td className="py-2 font-black text-slate-950">{avgAtValue ? `${avgAtValue} رصيد` : '—'}</td>
          </tr>
          <tr>
            <td className="py-2 font-semibold text-slate-500">القيمة الافتراضية</td>
            <td className="py-2 font-black text-slate-950" dir="ltr">${pricing.defaultUsdPerCredit}</td>
          </tr>
        </tbody>
      </table>
      {message && <p className="mt-3 text-sm font-bold text-slate-500">{message}</p>}
    </div>
  );
};

/** `months` of `monthly` less `percent`, rounded to the dinar like the server. */
const periodPrice = (monthly: number, months: number, percent: number) =>
  Math.round(((Number(monthly) || 0) * months * (100 - (Number(percent) || 0))) / 100);

const limitText = (limit: number | null | undefined, unit: string) =>
  typeof limit === 'number' ? `${limit.toLocaleString('en-US')} ${unit}` : `${unit} بلا حدود`;

/** The intro offer in words, or '' when it gives nothing. */
const promoText = (plan: Plan) => {
  const free = plan.promo_free_months ?? 0;
  const months = plan.promo_discount_months ?? 0;
  const percent = plan.promo_discount_percent ?? 0;
  const parts = [
    free > 0 ? (free === 1 ? 'شهر مجاني' : `${free} أشهر مجانية`) : '',
    months > 0 && percent > 0 ? `خصم ${percent}% لمدة ${months === 1 ? 'شهر' : `${months} أشهر`}` : '',
  ].filter(Boolean);
  return parts.join('، ثم ');
};

export default SubscriptionPlans;

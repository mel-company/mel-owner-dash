import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
  type ModuleOption,
  type Plan,
  type PlanFeature,
  type PlanPayload,
} from '../services/plansService';
import { systemSubscriptionsService, type Subscription } from '../services/systemSubscriptionsService';
import { renderText } from '@/utils/renderText';

/**
 * The defaults a new plan starts from — MEL GO's shape, so an operator adjusts
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
  yearly_price: 0,
  enabled: true,
  most_popular: false,
  code: '',
  max_users: 1,
  ai_store_credits: 2,
  ai_editor_credits: 0,
  has_mobile_app: false,
  has_ai_editor: false,
  is_free: false,
  order_number: null,
  featureIds: [],
  moduleIds: [],
};

const YES_NO = [
  { value: 'false', label: 'لا' },
  { value: 'true', label: 'نعم' },
];

const SubscriptionPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
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

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [plansRes, subsRes, features, modules] = await Promise.all([
        plansService.getAllPlans(),
        systemSubscriptionsService.getAllSubscriptions(),
        plansService.getFeatureOptions(),
        plansService.getModuleOptions(),
      ]);
      setPlans(plansRes.data || []);
      setSubscriptions(subsRes || []);
      setFeatureOptions(features);
      setModuleOptions(modules);
    } catch (err) {
      setError('فشل في جلب بيانات الباقات.');
      console.error('Error loading plans:', err);
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
      yearly_price: plan.yearly_price || 0,
      enabled: plan.enabled,
      most_popular: plan.most_popular,
      code: plan.code ?? '',
      max_users: plan.max_users ?? 1,
      ai_store_credits: plan.ai_store_credits ?? 0,
      ai_editor_credits: plan.ai_editor_credits ?? 0,
      has_mobile_app: plan.has_mobile_app ?? false,
      has_ai_editor: plan.has_ai_editor ?? false,
      is_free: plan.is_free ?? false,
      order_number: plan.order_number ?? null,
      featureIds: plan.features?.map((item) => item.feature.id) || [],
      moduleIds: plan.modules?.map((item) => item.id) || [],
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
    const payload: PlanPayload = {
      ...formData,
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
        description={<>هناك <span className="font-black text-violet-600">{plans.length} باقة</span> و <span className="font-black text-violet-600">{subscriptions.length} اشتراك</span></>}
        icon={<Crown className="h-6 w-6" />}
        action={<PrimaryActionButton onClick={openCreateDrawer}>إضافة باقة<Plus className="h-4 w-4" /></PrimaryActionButton>}
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="إجمالي الباقات" value={plans.length} icon={<Layers3 />} tone="blue" />
        <StatCard title="الباقات المفعلة" value={plans.filter((plan) => plan.enabled).length} icon={<CheckCircle />} tone="teal" />
        <StatCard title="الأكثر شيوعاً" value={plans.filter((plan) => plan.most_popular).length} icon={<Sparkles />} tone="amber" />
        <StatCard title="الاشتراكات" value={subscriptions.length} icon={<ReceiptText />} tone="violet" />
      </div>

      <SearchFiltersBar search={search} onSearchChange={setSearch} placeholder="ابحث عن باقة" onFilterClick={() => setSearch('')} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredPlans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onEdit={openEditDrawer} onDelete={setPlanToDelete} />
        ))}
      </div>

      <TableShell>
        <table className="w-full min-w-[760px]">
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
                <td className="px-5 py-4 font-black text-slate-950">{renderText(sub.store)}</td>
                <td className="px-5 py-4 font-semibold text-slate-600">{renderText(sub.plan)}</td>
                <td className="px-5 py-4"><StatusPill tone={sub.status === 'ACTIVE' ? 'green' : 'amber'}>{sub.status}</StatusPill></td>
                <td className="px-5 py-4"><button className="rounded-xl bg-violet-50 px-4 py-2 text-sm font-black text-violet-600">عرض</button></td>
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
              <FormField label="السعر السنوي" type="number" value={formData.yearly_price} required onChange={(value) => setFormData((current) => ({ ...current, yearly_price: Number(value) }))} />
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
                label="رصيد محرر الذكاء الاصطناعي شهرياً"
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
                label="باقة مجانية"
                value={formData.is_free ? 'true' : 'false'}
                options={YES_NO}
                onChange={(value) => setFormData((current) => ({ ...current, is_free: value === 'true' }))}
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

const PlanCard = ({ plan, onEdit, onDelete }: { plan: Plan; onEdit: (plan: Plan) => void; onDelete: (plan: Plan) => void }) => (
  <div className="relative overflow-hidden rounded-[1.7rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg">
    {plan.most_popular && (
      <span className="absolute left-5 top-5 rounded-full bg-violet-600 px-3 py-1 text-xs font-black text-white">الأكثر شيوعاً</span>
    )}
    <div className="mb-5 flex items-center justify-end gap-3">
      <div>
        <h2 className="text-xl font-black text-slate-950">{renderText(plan.name)}</h2>
        <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-400">{renderText(plan.description)}</p>
        {/* The list now includes disabled and free plans, because the one screen
            that can re-enable a plan was reading a feed that hid it. That makes
            saying which is which the card's job — without this, a plan nobody can
            buy looks exactly like a live one. */}
        <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
          {plan.code ? <StatusPill tone="violet">{plan.code}</StatusPill> : null}
          {plan.is_free ? <StatusPill tone="blue">مجانية</StatusPill> : null}
          <StatusPill tone={plan.enabled ? 'green' : 'red'} dot>
            {plan.enabled ? 'مفعلة' : 'معطلة'}
          </StatusPill>
        </div>
      </div>
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600">
        <Crown className="h-6 w-6" />
      </div>
    </div>
    <div className="mb-5 rounded-3xl bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-400">السعر الشهري</p>
      <p className="mt-1 text-3xl font-black text-slate-950">{plan.monthly_price?.toLocaleString('en-US') || 0} <span className="text-sm text-slate-500">د.ع</span></p>
      <p className="mt-3 text-sm font-bold text-slate-400">السعر السنوي: <span className="text-slate-700">{plan.yearly_price?.toLocaleString('en-US') || 0} د.ع</span></p>
    </div>
    <ul className="space-y-3">
      {Array.isArray(plan.features) && plan.features.length > 0 ? (
        plan.features.slice(0, 5).map((feature: PlanFeature) => (
          <li key={feature.feature.id} className="flex items-center justify-end gap-2 text-sm font-semibold text-slate-600">
            <span>{renderText(feature.feature.name)}</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </li>
        ))
      ) : (
        <li className="text-sm font-semibold text-slate-400">لا توجد ميزات</li>
      )}
    </ul>
    <div className="mt-6 grid grid-cols-[auto_1fr] gap-2">
      <button type="button" onClick={() => onDelete(plan)} className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-500"><Trash2 className="h-4 w-4" /></button>
      <button type="button" onClick={() => onEdit(plan)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-l from-violet-700 to-fuchsia-500 font-black text-white">
        إدارة الباقة
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  </div>
);


export default SubscriptionPlans;

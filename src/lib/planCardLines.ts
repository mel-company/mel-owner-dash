/**
 * A copy of mel-backend `src/plan/plan-card-lines.ts` (without the server's
 * validation) — keep the two in sync. The server builds `card_lines` for the
 * pricing page and the merchant dashboard; this copy only lets the plan form
 * show the lines live while limits and switches change, before saving.
 *
 * The lines a plan card lists (pricing page, merchant plans page, admin).
 *
 * Every line is read from a plan column the backend enforces, so a line can
 * never promise more than the plan gives: a limit fills its real number into
 * `{n}`, and a switch that is off drops its line. What the owner dashboard
 * may change is only how a line reads, whether it shows, and the order —
 * stored per plan in `platform_settings` under `plan_card_lines`, so no
 * migration.
 *
 * A limit has two lines, capped and unlimited, each with its own wording;
 * only the one that matches the plan shows.
 */

export type CardLinePlan = {
  max_products?: number | null;
  max_categories?: number | null;
  max_category_groups?: number | null;
  max_coupons?: number | null;
  max_monthly_orders?: number | null;
  ai_store_credits?: number | null;
  ai_store_trial?: number | null;
  has_ai_editor?: boolean | null;
  ai_editor_credits?: number | null;
  ai_editor_trial?: number | null;
  has_online_payment?: boolean | null;
  has_courier_integrations?: boolean | null;
  has_advanced_stats?: boolean | null;
  has_social_pixels?: boolean | null;
  has_custom_domain?: boolean | null;
  has_mobile_app?: boolean | null;
  has_pos?: boolean | null;
};

type LineDefinition = {
  key: string;
  /** Shown to the operator next to the line. */
  title: string;
  template: string;
  /** Placeholders the wording must keep, so the number stays the real one. */
  placeholders: string[];
  values: (plan: CardLinePlan) => Record<string, number> | null;
};

const capped =
  (column: keyof CardLinePlan) =>
  (plan: CardLinePlan): Record<string, number> | null =>
    typeof plan[column] === 'number' ? { n: plan[column] as number } : null;

const unlimited =
  (column: keyof CardLinePlan) =>
  (plan: CardLinePlan): Record<string, number> | null =>
    typeof plan[column] === 'number' ? null : {};

/** `!== false`: these switches default to on. */
const switchedOn =
  (column: keyof CardLinePlan, defaultOn = false) =>
  (plan: CardLinePlan): Record<string, number> | null =>
    (defaultOn ? plan[column] !== false : plan[column] === true) ? {} : null;

export const CARD_LINE_DEFINITIONS: LineDefinition[] = [
  { key: 'products', title: 'المنتجات', template: 'حتى {n} منتج', placeholders: ['{n}'], values: capped('max_products') },
  { key: 'products_unlimited', title: 'المنتجات', template: 'منتجات بلا حدود', placeholders: [], values: unlimited('max_products') },
  {
    key: 'categories',
    title: 'الأقسام',
    template: 'حتى {n} أقسام و{groups} مجموعات أقسام',
    placeholders: ['{n}'],
    values: (plan) =>
      typeof plan.max_categories === 'number'
        ? { n: plan.max_categories, groups: plan.max_category_groups ?? 5 }
        : null,
  },
  { key: 'categories_unlimited', title: 'الأقسام', template: 'أقسام ومجموعات أقسام بلا حدود', placeholders: [], values: unlimited('max_categories') },
  { key: 'orders', title: 'الطلبات', template: '{n} طلب شهرياً', placeholders: ['{n}'], values: capped('max_monthly_orders') },
  { key: 'orders_unlimited', title: 'الطلبات', template: 'طلبات بلا حدود', placeholders: [], values: unlimited('max_monthly_orders') },
  { key: 'coupons', title: 'الكوبونات', template: '{n} كوبونات خصم', placeholders: ['{n}'], values: capped('max_coupons') },
  { key: 'coupons_unlimited', title: 'الكوبونات', template: 'كوبونات بلا حدود', placeholders: [], values: unlimited('max_coupons') },
  {
    key: 'ai_stores',
    title: 'متاجر الذكاء الاصطناعي',
    template: '{n} متاجر بالذكاء الاصطناعي شهرياً',
    placeholders: ['{n}'],
    values: (plan) => {
      const n = Number(plan.ai_store_credits ?? 0);
      return n > 0 ? { n } : null;
    },
  },
  {
    key: 'ai_stores_trial',
    title: 'متاجر الذكاء الاصطناعي',
    template: 'تجربة مجانية لإنشاء متجر بالذكاء الاصطناعي',
    placeholders: [],
    values: (plan) => {
      const n = Number(plan.ai_store_trial ?? 1);
      return Number(plan.ai_store_credits ?? 0) > 0 || n <= 0 ? null : { n };
    },
  },
  {
    key: 'ai_editor',
    title: 'مساعد المحرر الذكي',
    template: '{n} رصيد شهرياً لمساعد المحرر الذكي',
    placeholders: ['{n}'],
    values: (plan) => (plan.has_ai_editor ? { n: plan.ai_editor_credits ?? 20 } : null),
  },
  {
    key: 'ai_editor_trial',
    title: 'مساعد المحرر الذكي',
    template: 'تجربة مساعد المحرر الذكي ({n} رسائل)',
    placeholders: ['{n}'],
    values: (plan) => {
      const n = Number(plan.ai_editor_trial ?? 5);
      return plan.has_ai_editor || n <= 0 ? null : { n };
    },
  },
  { key: 'online_payment', title: 'الدفع الإلكتروني', template: 'الدفع الإلكتروني: زين كاش وكي كارد', placeholders: [], values: switchedOn('has_online_payment', true) },
  { key: 'courier_integrations', title: 'ربط شركات الشحن', template: 'ربط شركات الشحن وإرسال الطلبات تلقائياً', placeholders: [], values: switchedOn('has_courier_integrations', true) },
  { key: 'advanced_stats', title: 'الإحصائيات المتقدمة', template: 'إحصائيات وتقارير متقدمة', placeholders: [], values: switchedOn('has_advanced_stats', true) },
  { key: 'social_pixels', title: 'بكسلات الإعلانات', template: 'بكسلات الإعلانات: ميتا، تيك توك، سناب', placeholders: [], values: switchedOn('has_social_pixels') },
  { key: 'custom_domain', title: 'النطاق الخاص', template: 'ربط نطاقك الخاص (yourstore.com)', placeholders: [], values: switchedOn('has_custom_domain') },
  { key: 'mobile_app', title: 'تطبيق التاجر', template: 'تطبيق التاجر على الهاتف', placeholders: [], values: switchedOn('has_mobile_app') },
  { key: 'pos', title: 'نقطة البيع', template: 'نقطة البيع POS', placeholders: [], values: switchedOn('has_pos') },
  { key: 'editor_cod', title: 'المحرر والدفع عند الاستلام', template: 'محرر المتجر والدفع عند الاستلام', placeholders: [], values: () => ({}) },
];

export type CardLineSetting = { label?: string; hidden?: boolean };
/**
 * A line the operator wrote themselves (support, onboarding, ...). Nothing in
 * the backend enforces it, so the admin marks it as text only.
 */
export type CustomCardLine = { id: string; label: string };
export type PlanCardLinesConfig = {
  order?: string[];
  lines?: Record<string, CardLineSetting>;
  custom?: CustomCardLine[];
};

export const CUSTOM_LINE_PREFIX = 'custom_';
export const MAX_CUSTOM_LINES = 20;

export type CardLineItem = {
  key: string;
  title: string;
  /** The wording with placeholders, as stored (or the default). */
  template: string;
  default_template: string;
  placeholders: string[];
  /** The wording with the plan's real numbers in. */
  text: string;
  hidden: boolean;
  /** Written by the operator, not read from a plan column. */
  custom: boolean;
};

const fill = (template: string, values: Record<string, number>) =>
  template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );

/**
 * Every line that applies to the plan, in the operator's order (keys they
 * never placed keep their default spot after the ordered ones), hidden ones
 * included and flagged.
 */
export function cardLineItems(
  plan: CardLinePlan,
  config: PlanCardLinesConfig | undefined,
): CardLineItem[] {
  const order = Array.isArray(config?.order) ? config!.order : [];
  const rank = (key: string) => {
    const at = order.indexOf(key);
    return at === -1 ? order.length + CARD_LINE_DEFINITIONS.findIndex((d) => d.key === key) : at;
  };
  const builtIn: CardLineItem[] = CARD_LINE_DEFINITIONS.flatMap((definition) => {
    const values = definition.values(plan);
    if (!values) return [];
    const setting = config?.lines?.[definition.key] ?? {};
    const label = typeof setting.label === 'string' ? setting.label.trim() : '';
    const template = label || definition.template;
    return [
      {
        key: definition.key,
        title: definition.title,
        template,
        default_template: definition.template,
        placeholders: definition.placeholders,
        text: fill(template, values),
        hidden: setting.hidden === true,
        custom: false,
      },
    ];
  });
  const custom: CardLineItem[] = (Array.isArray(config?.custom) ? config!.custom : [])
    .filter((line) => typeof line?.label === 'string')
    .map((line) => ({
      key: `${CUSTOM_LINE_PREFIX}${line.id}`,
      title: 'سطر مخصص',
      template: line.label.trim(),
      default_template: line.label.trim(),
      placeholders: [],
      text: line.label.trim(),
      hidden: false,
      custom: true,
    }));
  // A custom line never placed goes after everything else.
  const rankOf = (item: CardLineItem) =>
    item.custom && !order.includes(item.key) ? Number.MAX_SAFE_INTEGER : rank(item.key);
  return [...builtIn, ...custom].sort((a, b) => rankOf(a) - rankOf(b));
}

/** What a card shows: the visible lines' text, in order. */
export const cardLines = (plan: CardLinePlan, config: PlanCardLinesConfig | undefined) =>
  cardLineItems(plan, config)
    .filter((item) => !item.hidden && item.text)
    .map((item) => item.text);

/** Placeholders a wording dropped; non-empty means the form can't save it. */
export const missingPlaceholders = (item: Pick<CardLineItem, 'template' | 'placeholders'>) =>
  item.placeholders.filter((placeholder) => !item.template.includes(placeholder));

/** Read a plan's saved config back from the items the server returned. */
export const configFromItems = (items: CardLineItem[] | undefined): PlanCardLinesConfig => {
  if (!items?.length) return {};
  const lines: Record<string, CardLineSetting> = {};
  const custom: CustomCardLine[] = [];
  for (const item of items) {
    if (item.custom) {
      custom.push({ id: item.key.slice(CUSTOM_LINE_PREFIX.length), label: item.template });
      continue;
    }
    const setting: CardLineSetting = {};
    if (item.template !== item.default_template) setting.label = item.template;
    if (item.hidden) setting.hidden = true;
    if (Object.keys(setting).length) lines[item.key] = setting;
  }
  return { order: items.map((item) => item.key), lines, custom };
};

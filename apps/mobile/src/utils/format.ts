const MONTHS_SHORT = [
  'янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.',
  'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.',
];

const MONTHS_LONG = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Friendly relative date for transaction lists:
 * "Сегодня, 21:14" / "Вчера" / "14 марта" / "14 марта 2024"
 */
export function formatTxDate(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const now = new Date();
  if (isSameDay(date, now)) {
    return `Сегодня, ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return 'Вчера';
  }
  const day = date.getDate();
  const monthFull = MONTHS_GENITIVE[date.getMonth()];
  if (date.getFullYear() === now.getFullYear()) {
    return `${day} ${monthFull}`;
  }
  return `${day} ${monthFull} ${date.getFullYear()}`;
}

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export type TxGroupKey =
  | { kind: 'today' }
  | { kind: 'yesterday' }
  | { kind: 'thisWeek' }
  | { kind: 'month'; year: number; month: number };

export interface TxGroup<T> {
  key: string;
  label: string;
  items: T[];
}

/**
 * Group transactions chronologically:
 * Today / Yesterday / This week / by month.
 */
export function groupTransactions<T extends { occurredAt: Date | string }>(
  items: T[],
): TxGroup<T>[] {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const sevenDaysAgo = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7));

  const buckets = new Map<string, TxGroup<T>>();
  const order: string[] = [];

  function push(key: string, label: string, item: T) {
    let g = buckets.get(key);
    if (!g) {
      g = { key, label, items: [] };
      buckets.set(key, g);
      order.push(key);
    }
    g.items.push(item);
  }

  for (const item of items) {
    const d = typeof item.occurredAt === 'string' ? new Date(item.occurredAt) : item.occurredAt;
    const day = startOfDay(d);
    if (day.getTime() === today.getTime()) {
      push('today', 'Сегодня', item);
    } else if (day.getTime() === yesterday.getTime()) {
      push('yesterday', 'Вчера', item);
    } else if (day.getTime() >= sevenDaysAgo.getTime() && day.getTime() < yesterday.getTime()) {
      push('week', 'На этой неделе', item);
    } else {
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `m_${y}_${m}`;
      const monthLabel = MONTHS_LONG[m];
      const label = y === now.getFullYear() ? monthLabel : `${monthLabel} ${y}`;
      push(key, label, item);
    }
  }

  return order.map((k) => buckets.get(k)!);
}

/**
 * Formats a number with space as thousands separator (ru-RU style).
 * Example: 12345.67 → "12 345,67"
 */
function formatNumberRu(value: number, minFrac = 0, maxFrac = 0): string {
  const fixed = value.toFixed(maxFrac);
  const [intPart, decPart] = fixed.split('.');

  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');

  if (maxFrac === 0) return withSpaces;

  let frac = decPart ?? '';
  // Trim trailing zeros down to minFrac
  while (frac.length > minFrac && frac.endsWith('0')) {
    frac = frac.slice(0, -1);
  }

  return frac.length > 0 ? `${withSpaces},${frac}` : withSpaces;
}

/**
 * Formats a points balance number with thousands separator and 2 decimal places.
 * Example: 12345.6 → "12 345,60"
 */
export function formatPoints(points: number): string {
  return formatNumberRu(points, 2, 2);
}

/**
 * Formats a date string or Date object to a Russian date.
 * Example: "2026-04-03T10:00:00Z" → "3 апр. 2026"
 */
export function formatDate(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const day = date.getDate();
  const month = MONTHS_SHORT[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Formats a date string to a relative time description.
 */
export function formatRelativeTime(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин. назад`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ч. назад`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} д. назад`;

  return formatDate(date);
}

/**
 * Formats a currency amount.
 * Example: 1234.5 → "1 234,50 ₽"
 */
export function formatCurrency(amount: number, currency = 'RUB'): string {
  const symbol = currency === 'RUB' ? '\u20BD' : currency;
  const formatted = formatNumberRu(amount, 0, 2);
  return `${formatted} ${symbol}`;
}

/**
 * Maps raw transaction description from the loyalty API to a display label.
 */
export function mapTransactionLabel(raw: string | null | undefined): string {
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (lower.includes('оплата наличн') || lower.includes('оплата карт')) {
    return 'Сумма чека';
  }
  if (
    lower.includes('внесение') ||
    lower.includes('начисление') ||
    lower.includes('бонус') && lower.includes('начисл')
  ) {
    return 'Начисление';
  }
  if (
    lower.includes('снятие') ||
    lower.includes('оплата бонус') ||
    lower.includes('списан')
  ) {
    return 'Списание';
  }
  return raw;
}

/**
 * Formats a date as "DD.MM.YYYY" (short Russian format).
 * Example: "2026-04-03T10:00:00Z" → "03.04.2026"
 */
export function formatDateShort(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

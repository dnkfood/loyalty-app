/**
 * Formats a points balance number with thousands separator.
 * Example: 12345 → "12 345"
 */
export function formatPoints(points: number): string {
  return new Intl.NumberFormat('ru-RU').format(points);
}

/**
 * Formats a date string or Date object to a localized Russian date.
 * Example: "2026-04-03T10:00:00Z" → "3 апр. 2026"
 */
export function formatDate(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats a date string to a relative time description.
 * Example: "5 minutes ago"
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
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

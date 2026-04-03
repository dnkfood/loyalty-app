/**
 * Masks a phone number for safe logging.
 * Example: 79123456789 → 791***789
 */
export function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return `${phone.slice(0, 3)}***${phone.slice(-3)}`;
}

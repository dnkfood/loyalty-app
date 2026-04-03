export const PushTemplates = {
  TRANSACTION_EARN: {
    title: 'Баллы начислены',
    body: 'Вам начислено {{amount}} баллов. Баланс: {{new_balance}}',
  },
  TRANSACTION_SPEND: {
    title: 'Баллы списаны',
    body: 'Списано {{amount}} баллов. Остаток: {{new_balance}}',
  },
  STATUS_UPGRADED: {
    title: 'Новый статус!',
    body: 'Поздравляем! Вы достигли уровня {{status_name}}',
  },
  OFFER_ASSIGNED: {
    title: 'Персональное предложение',
    body: '{{offer_title}} — только для вас до {{expires_at}}',
  },
  BIRTHDAY: {
    title: 'С днём рождения!',
    body: '{{name}}, мы дарим вам {{gift_description}}',
  },
} as const;

export type PushTemplateKey = keyof typeof PushTemplates;

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Interpolates template variables.
 * Example: "Hello {{name}}" + { name: "Ivan" } → "Hello Ivan"
 */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

/**
 * Renders a push notification from a template key and variables.
 */
export function renderPushTemplate(
  key: PushTemplateKey,
  vars: Record<string, string>,
): PushNotification {
  const template = PushTemplates[key];
  return {
    title: interpolate(template.title, vars),
    body: interpolate(template.body, vars),
  };
}

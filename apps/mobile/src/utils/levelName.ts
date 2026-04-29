const MAP: Record<string, string> = {
  FRIEND: 'Друзья',
  FAMILY: 'Семья',
  'BIG LOVE': 'Большая любовь',
  BIGLOVE: 'Большая любовь',
};

export function localizeLevelName(raw: string | null | undefined): string {
  if (!raw) return '';
  const key = raw.trim().toUpperCase();
  return MAP[key] ?? raw;
}

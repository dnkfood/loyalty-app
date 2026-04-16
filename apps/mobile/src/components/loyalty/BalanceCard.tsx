import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { formatPoints } from '../../utils/format';

interface BalanceCardProps {
  guestName: string | null;
  balance: number;
  statusLevel: string;
  statusName: string;
  bonusPercent: number;
  currentSpend: number;
  nextLevelPoints?: number | null;
  isCached?: boolean;
}

/**
 * Color coding by loyalty tier. Falls back to FRIEND blue for unknown
 * level keys so unknown new tiers don't render as transparent.
 */
const LEVEL_COLORS: Record<string, { bg: string; accent: string }> = {
  FRIEND: { bg: '#0A84FF', accent: '#5AC8FA' },
  FAMILY: { bg: '#B8860B', accent: '#FFD700' },
  'BIG LOVE': { bg: '#7B1FA2', accent: '#CE93D8' },
};

function getLevelColors(level: string) {
  return LEVEL_COLORS[level] ?? LEVEL_COLORS.FRIEND;
}

export function BalanceCard({
  guestName,
  balance,
  statusLevel,
  statusName,
  bonusPercent,
  currentSpend,
  nextLevelPoints,
  isCached = false,
}: BalanceCardProps) {
  const colors = getLevelColors(statusLevel);
  const hasNextLevel = nextLevelPoints != null && nextLevelPoints > 0;
  const totalToNext = hasNextLevel ? currentSpend + nextLevelPoints : 0;
  const remaining = hasNextLevel ? nextLevelPoints : 0;

  return (
    <Card style={{ backgroundColor: colors.bg }} padding={24}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {guestName ? `Привет, ${guestName}` : 'Привет!'}
        </Text>
        {isCached && (
          <Badge label="Кэш" color="#856404" backgroundColor="#fff3cd" />
        )}
      </View>

      <Text style={styles.label}>Баланс баллов</Text>
      <Text style={styles.balance}>{formatPoints(balance)}</Text>

      <View style={styles.statusRow}>
        <Badge
          label={statusName}
          color="#fff"
          backgroundColor={colors.accent}
        />
        <Text style={styles.bonusPercent}>Кэшбэк {bonusPercent}%</Text>
      </View>

      {hasNextLevel && (
        <View style={styles.progressSection}>
          <ProgressBar
            value={currentSpend}
            max={totalToNext}
            color="#fff"
            trackColor="rgba(255,255,255,0.25)"
          />
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>
              {formatPoints(currentSpend)} ₽
            </Text>
            <Text style={styles.progressText}>
              до след. уровня: {formatPoints(remaining)} ₽
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginBottom: 4,
  },
  balance: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 56,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  bonusPercent: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  progressSection: {
    marginTop: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
});

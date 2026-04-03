import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatPoints } from '../../utils/format';

interface BalanceCardProps {
  balance: number;
  statusName: string;
  statusLevel: string;
  nextLevelPoints?: number;
  isCached?: boolean;
}

export function BalanceCard({
  balance,
  statusName,
  statusLevel: _statusLevel,
  nextLevelPoints,
  isCached = false,
}: BalanceCardProps) {
  return (
    <Card style={styles.card} padding={24}>
      <View style={styles.header}>
        <Text style={styles.label}>Баланс баллов</Text>
        {isCached && (
          <Badge label="Кэшировано" color="#856404" backgroundColor="#fff3cd" />
        )}
      </View>

      <Text style={styles.balance}>{formatPoints(balance)}</Text>
      <Text style={styles.balanceLabel}>баллов</Text>

      <View style={styles.statusRow}>
        <Badge label={statusName} color="#fff" backgroundColor="#007AFF" />
      </View>

      {nextLevelPoints !== undefined && nextLevelPoints > 0 && (
        <Text style={styles.nextLevel}>
          До следующего уровня: {formatPoints(nextLevelPoints)} баллов
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    background: 'linear-gradient(135deg, #007AFF, #00A2FF)',
    backgroundColor: '#007AFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  balance: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 56,
  },
  balanceLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  nextLevel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
});

import { View, Text, StyleSheet } from 'react-native';
import type { TransactionItem as TransactionItemType } from '@loyalty/shared-types';
import { formatDate, formatPoints } from '../../utils/format';

interface TransactionItemProps {
  transaction: TransactionItemType;
}

const typeConfig = {
  earn: { label: 'Начисление', color: '#34c759', sign: '+' },
  spend: { label: 'Списание', color: '#ff3b30', sign: '-' },
  expire: { label: 'Сгорание', color: '#ff9500', sign: '-' },
  correction: { label: 'Корректировка', color: '#8e8e93', sign: '±' },
} as const;

export function TransactionItem({ transaction }: TransactionItemProps) {
  const config = typeConfig[transaction.type];

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <View style={[styles.icon, { backgroundColor: config.color + '20' }]}>
          <Text style={[styles.iconText, { color: config.color }]}>
            {config.sign}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.type}>{config.label}</Text>
        {transaction.description && (
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description}
          </Text>
        )}
        <Text style={styles.date}>{formatDate(transaction.occurredAt.toString())}</Text>
      </View>

      <View style={styles.amount}>
        <Text style={[styles.amountText, { color: config.color }]}>
          {config.sign}{formatPoints(Math.abs(transaction.amount))}
        </Text>
        <Text style={styles.balance}>{formatPoints(transaction.newBalance)} ост.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  details: {
    flex: 1,
  },
  type: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  amount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  balance: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});

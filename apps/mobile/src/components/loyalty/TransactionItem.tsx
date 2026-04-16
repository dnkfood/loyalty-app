import { View, Text, StyleSheet } from 'react-native';
import type { TransactionItem as TransactionItemType } from '@loyalty/shared-types';
import { formatDate, formatPoints, mapTransactionLabel } from '../../utils/format';

interface TransactionItemProps {
  transaction: TransactionItemType;
}

const typeColors = {
  earn: '#34c759',
  spend: '#ff3b30',
  expire: '#ff9500',
  correction: '#8e8e93',
} as const;

const typeSigns = {
  earn: '+',
  spend: '-',
  expire: '-',
  correction: '±',
} as const;

export function TransactionItem({ transaction }: TransactionItemProps) {
  const color = typeColors[transaction.type];
  const sign = typeSigns[transaction.type];
  const label = mapTransactionLabel(transaction.description);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <View style={[styles.icon, { backgroundColor: color + '20' }]}>
          <Text style={[styles.iconText, { color }]}>{sign}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.type}>{label}</Text>
        <Text style={styles.date}>{formatDate(transaction.occurredAt.toString())}</Text>
      </View>

      <View style={styles.amount}>
        <Text style={[styles.amountText, { color }]}>
          {sign}{formatPoints(Math.abs(transaction.amount))}
        </Text>
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
});

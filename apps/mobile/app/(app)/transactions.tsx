import { FlatList, StyleSheet, View, Text, RefreshControl } from 'react-native';
import { TransactionItem } from '../../src/components/loyalty/TransactionItem';
import { useTransactions } from '../../src/hooks/useTransactions';

export default function TransactionsScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useTransactions();

  const transactions = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <View style={styles.container}>
      {isError && (
        <View style={styles.error}>
          <Text style={styles.errorText}>Не удалось загрузить историю операций</Text>
        </View>
      )}

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionItem transaction={item} />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Нет операций</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  list: {
    padding: 16,
  },
  error: {
    margin: 16,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
  },
  errorText: {
    color: '#856404',
    textAlign: 'center',
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8e8e93',
    fontSize: 16,
  },
});

import { ScrollView, StyleSheet, RefreshControl, View, Text } from 'react-native';
import { BalanceCard } from '../../src/components/loyalty/BalanceCard';
import { useBalance } from '../../src/hooks/useBalance';

export default function HomeScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useBalance();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
      }
    >
      <View style={styles.content}>
        {isLoading && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Загрузка...</Text>
          </View>
        )}

        {isError && (
          <View style={styles.error}>
            <Text style={styles.errorText}>Не удалось загрузить данные</Text>
          </View>
        )}

        {data && (
          <BalanceCard
            balance={data.balance}
            statusName={data.statusName}
            statusLevel={data.statusLevel}
            nextLevelPoints={data.nextLevelPoints ?? undefined}
            isCached={data.isCached}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  content: {
    padding: 16,
  },
  placeholder: {
    height: 180,
    borderRadius: 16,
    backgroundColor: '#e5e5ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#8e8e93',
    fontSize: 16,
  },
  error: {
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 12,
  },
  errorText: {
    color: '#856404',
    textAlign: 'center',
  },
});

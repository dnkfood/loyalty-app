import {
  ScrollView,
  StyleSheet,
  RefreshControl,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { BalanceCard } from '../../src/components/loyalty/BalanceCard';
import { Card } from '../../src/components/ui/Card';
import { useBalance } from '../../src/hooks/useBalance';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useAuthStore } from '../../src/stores/auth.store';
import { clearTokens } from '../../src/utils/token';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { formatPoints, formatRelativeTime, mapTransactionLabel } from '../../src/utils/format';
import type { TransactionItem } from '@loyalty/shared-types';

function HomeContent() {
  const balance = useBalance();
  const transactions = useTransactions();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await clearTokens();
          logout();
        },
      },
    ]);
  };

  const recentItems: TransactionItem[] =
    transactions.data?.pages[0]?.items.slice(0, 3) ?? [];

  const refreshing = balance.isRefetching || transactions.isRefetching;
  const onRefresh = () => {
    void balance.refetch();
    void transactions.refetch();
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        {balance.isLoading && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Загрузка...</Text>
          </View>
        )}

        {balance.isError && (
          <View style={styles.error}>
            <Text style={styles.errorText}>Не удалось загрузить данные</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void balance.refetch()}
            >
              <Text style={styles.retryText}>Повторить</Text>
            </TouchableOpacity>
          </View>
        )}

        {balance.data && (
          <>
            <BalanceCard
              guestName={balance.data.guestName}
              balance={balance.data.balance}
              statusLevel={balance.data.statusLevel}
              statusName={balance.data.statusName}
              bonusPercent={balance.data.bonusPercent}
              currentSpend={balance.data.currentSpend}
              nextLevelPoints={balance.data.nextLevelPoints ?? undefined}
            />

            <Card style={styles.txCard} padding={20}>
              <Text style={styles.sectionTitle}>Последние операции</Text>
              {recentItems.length === 0 ? (
                <Text style={styles.emptyText}>Пока нет операций</Text>
              ) : (
                recentItems.map((item, idx) => (
                  <View
                    key={item.id}
                    style={[
                      styles.txRow,
                      idx < recentItems.length - 1 && styles.txRowDivider,
                    ]}
                  >
                    <View style={styles.txMain}>
                      <Text style={styles.txDescription} numberOfLines={1}>
                        {mapTransactionLabel(item.description) || txTypeLabel(item.type)}
                      </Text>
                      <Text style={styles.txDate}>
                        {formatRelativeTime(item.occurredAt)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        item.type === 'spend'
                          ? styles.txAmountNegative
                          : styles.txAmountPositive,
                      ]}
                    >
                      {item.type === 'spend' ? '-' : '+'}
                      {formatPoints(Math.abs(item.amount))}
                    </Text>
                  </View>
                ))
              )}
            </Card>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Выйти</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function txTypeLabel(type: TransactionItem['type']): string {
  switch (type) {
    case 'earn':
      return 'Начисление';
    case 'spend':
      return 'Списание';
    case 'expire':
      return 'Сгорание';
    case 'correction':
      return 'Корректировка';
  }
}

export default function HomeScreen() {
  return (
    <ErrorBoundary>
      <HomeContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  content: {
    padding: 16,
    gap: 16,
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
  retryButton: {
    marginTop: 12,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  txCard: {},
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    paddingVertical: 16,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  txRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
  },
  txMain: {
    flex: 1,
  },
  txDescription: {
    fontSize: 15,
    color: '#1c1c1e',
    fontWeight: '500',
  },
  txDate: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 12,
  },
  txAmountPositive: {
    color: '#34c759',
  },
  txAmountNegative: {
    color: '#ff3b30',
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

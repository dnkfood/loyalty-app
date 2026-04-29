import {
  ScrollView,
  StyleSheet,
  RefreshControl,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBalance } from '../../src/hooks/useBalance';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useAuthStore } from '../../src/stores/auth.store';
import { clearTokens } from '../../src/utils/token';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import {
  formatPoints,
  formatTxDate,
  mapTransactionLabel,
} from '../../src/utils/format';
import { ScreenContainer } from '../../src/theme/ScreenContainer';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { HeroCard } from '../../src/components/ui/HeroCard';
import { SectionHead } from '../../src/components/ui/SectionHead';
import { OpRow, type OpRowData } from '../../src/components/ui/OpRow';
import { Colors, Type, Fonts, Spacing, Radii } from '../../src/theme/tokens';
import { localizeLevelName } from '../../src/utils/levelName';
import { classifyTransaction } from '../../src/utils/transactionType';
import type { TransactionItem } from '@loyalty/shared-types';

function HomeContent() {
  const router = useRouter();
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
    transactions.data?.pages[0]?.items.slice(0, 2) ?? [];

  const recentRows: OpRowData[] = recentItems.map((tx) => ({
    id: tx.id,
    name:
      mapTransactionLabel(tx.description) ||
      txTypeLabel(tx.type),
    date: formatTxDate(tx.occurredAt),
    amount: tx.amount,
    kind: classifyTransaction(tx),
  }));

  const refreshing = balance.isRefetching || transactions.isRefetching;
  const onRefresh = () => {
    void balance.refetch();
    void transactions.refetch();
  };

  const data = balance.data;
  const currentSpend = data?.currentSpend ?? 0;
  const nextLevelPoints = data?.nextLevelPoints ?? null;
  const isMaxLevel = nextLevelPoints == null || nextLevelPoints <= 0;
  const total = isMaxLevel ? 1 : currentSpend + nextLevelPoints;
  const ratio = isMaxLevel ? 1 : Math.max(0, Math.min(1, currentSpend / total));
  const progressPct = `${Math.round(ratio * 100)}%` as `${number}%`;

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.ink} />
        }
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title="Профиль"
          rightIcon="sunny-outline"
          onRightPress={() => Alert.alert('Тёмная тема', 'Скоро будет.')}
        />

        {balance.isLoading && !data && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Загрузка…</Text>
          </View>
        )}

        {balance.isError && !data && (
          <View style={styles.error}>
            <Text style={styles.errorText}>Не удалось загрузить данные</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => void balance.refetch()}
            >
              <Text style={styles.retryText}>Повторить</Text>
            </TouchableOpacity>
          </View>
        )}

        {data && (
          <>
            <View style={styles.heroWrap}>
              <HeroCard tier={localizeLevelName(data.statusName || data.statusLevel)}>
                <View style={styles.heroBody}>
                  <Text style={styles.balanceLabel}>БАЛАНС</Text>
                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceNum}>
                      {formatPoints(data.balance)}
                    </Text>
                    <Text style={styles.balanceCurrency}> ₽</Text>
                  </View>
                  {data.guestName ? (
                    <Text style={styles.ownerName} numberOfLines={1}>
                      {data.guestName.toUpperCase()}
                    </Text>
                  ) : null}
                </View>
              </HeroCard>
            </View>

            <View style={styles.levelBlock}>
              <View style={styles.levelHeader}>
                <Text style={styles.levelLabel}>ВАШ УРОВЕНЬ</Text>
                <Text style={styles.levelName}>
                  {localizeLevelName(data.statusName || data.statusLevel)}
                </Text>
              </View>
              <View style={styles.levelMeta}>
                <Text style={styles.levelMetaText}>
                  Кэшбэк {data.bonusPercent}%
                </Text>
                <Text style={styles.levelMetaText}>
                  {isMaxLevel
                    ? 'Максимальный уровень'
                    : `До следующего: ${formatPoints(nextLevelPoints!)} ₽`}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progressPct }]} />
              </View>
            </View>

            <View style={styles.opsBlock}>
              <SectionHead
                label="ПОСЛЕДНИЕ ОПЕРАЦИИ"
                actionLabel="Все"
                onAction={() => router.push('/(app)/transactions' as never)}
              />
              <View style={styles.opsCard}>
                {recentRows.length === 0 ? (
                  <Text style={styles.emptyText}>Пока нет операций</Text>
                ) : (
                  recentRows.map((row, idx) => (
                    <OpRow
                      key={row.id}
                      item={row}
                      showDivider={idx > 0}
                    />
                  ))
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.5}
              style={styles.logoutBtn}
            >
              <Text style={styles.logoutText}>Выйти из аккаунта</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
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
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 100 },

  placeholder: {
    margin: Spacing.xl,
    height: 180,
    borderRadius: Radii.xl,
    backgroundColor: Colors.bgAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { ...Type.body, color: Colors.inkMuted },
  error: {
    margin: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  errorText: { ...Type.body, textAlign: 'center', color: Colors.inkSub },
  retryBtn: {
    marginTop: Spacing.md,
    alignSelf: 'center',
    backgroundColor: Colors.ink,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: Radii.pill,
  },
  retryText: { color: Colors.heroInk, fontFamily: Fonts.sansSemi, fontSize: 13 },

  heroWrap: {
    paddingHorizontal: Spacing.xl,
  },

  heroBody: {
    marginTop: 8,
  },
  balanceLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: Colors.heroMuted,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  balanceNum: {
    fontFamily: Fonts.monoSemi,
    fontSize: 38,
    lineHeight: 42,
    color: Colors.heroInk,
    letterSpacing: -0.5,
  },
  balanceCurrency: {
    fontFamily: Fonts.sansMed,
    fontSize: 16,
    color: Colors.heroMuted,
    marginBottom: 6,
    marginLeft: 2,
  },
  ownerName: {
    marginTop: 14,
    fontFamily: Fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.heroInk,
  },

  levelBlock: {
    marginTop: Spacing.xxl,
    marginHorizontal: Spacing.xl,
    padding: 18,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  levelLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.inkMuted,
  },
  levelName: {
    fontFamily: Fonts.sansSemi,
    fontSize: 14,
    letterSpacing: 0.2,
    color: Colors.ink,
  },
  levelMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  levelMetaText: {
    ...Type.bodySub,
    color: Colors.inkSub,
  },
  progressTrack: {
    height: 2,
    backgroundColor: Colors.divider,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.ink,
  },

  opsBlock: {
    marginTop: Spacing.xxl,
  },
  opsCard: {
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    overflow: 'hidden',
    paddingHorizontal: 0,
  },
  emptyText: {
    ...Type.bodySub,
    textAlign: 'center',
    paddingVertical: 24,
    color: Colors.inkMuted,
  },

  logoutBtn: {
    alignSelf: 'center',
    marginTop: 32,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  logoutText: {
    ...Type.caption,
    color: Colors.inkMuted,
  },
});

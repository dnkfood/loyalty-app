import { useMemo } from 'react';
import {
  SectionList,
  StyleSheet,
  View,
  Text,
  RefreshControl,
} from 'react-native';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useBalance } from '../../src/hooks/useBalance';
import { ScreenContainer } from '../../src/theme/ScreenContainer';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { OpRow, type OpRowData } from '../../src/components/ui/OpRow';
import {
  formatPoints,
  formatTxDate,
  groupTransactions,
  mapTransactionLabel,
} from '../../src/utils/format';
import { Colors, Type, Fonts, Spacing, Radii } from '../../src/theme/tokens';
import { classifyTransaction } from '../../src/utils/transactionType';
import type { TransactionItem } from '@loyalty/shared-types';

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

interface SectionItem extends OpRowData {}
interface Section {
  key: string;
  title: string;
  data: SectionItem[];
}

export default function TransactionsScreen() {
  const transactions = useTransactions();
  const balance = useBalance();

  const allItems: TransactionItem[] = useMemo(
    () => transactions.data?.pages.flatMap((p) => p.items) ?? [],
    [transactions.data],
  );

  const summary = useMemo(() => {
    let earned = 0;
    let spent = 0;
    for (const tx of allItems) {
      const kind = classifyTransaction(tx);
      if (kind === 'earn') earned += Math.abs(tx.amount);
      else if (kind === 'spend') spent += Math.abs(tx.amount);
    }
    return { earned, spent };
  }, [allItems]);

  const sections: Section[] = useMemo(() => {
    const groups = groupTransactions(allItems);
    return groups.map<Section>((g) => ({
      key: g.key,
      title: g.label,
      data: g.items.map<SectionItem>((tx) => ({
        id: tx.id,
        name:
          mapTransactionLabel(tx.description ?? null) ||
          txTypeLabel(tx.type),
        date: formatTxDate(tx.occurredAt),
        amount: tx.amount,
        kind: classifyTransaction(tx),
      })),
    }));
  }, [allItems]);

  return (
    <ScreenContainer>
      <AppHeader title="История" />

      {transactions.isError && (
        <View style={styles.error}>
          <Text style={styles.errorText}>
            Не удалось загрузить историю операций
          </Text>
        </View>
      )}

      <SectionList<SectionItem, Section>
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <SummaryStrip
            earned={summary.earned}
            spent={summary.spent}
            balance={balance.data?.balance ?? 0}
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>
              {section.title.toUpperCase()}
            </Text>
          </View>
        )}
        renderSectionFooter={() => <View style={styles.sectionFooter} />}
        renderItem={({ item, index, section }) => (
          <View style={styles.rowWrap}>
            <View
              style={[
                styles.rowInner,
                index === 0 && styles.rowInnerFirst,
                index === section.data.length - 1 && styles.rowInnerLast,
              ]}
            >
              <OpRow item={item} showDivider={index > 0} />
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={transactions.isRefetching}
            onRefresh={() => void transactions.refetch()}
            tintColor={Colors.ink}
          />
        }
        ListEmptyComponent={
          !transactions.isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Нет операций</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        onEndReached={() => {
          if (transactions.hasNextPage && !transactions.isFetchingNextPage) {
            void transactions.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
      />
    </ScreenContainer>
  );
}

interface SummaryStripProps {
  earned: number;
  spent: number;
  balance: number;
}

function SummaryStrip({ earned, spent, balance }: SummaryStripProps) {
  return (
    <View style={styles.summary}>
      <SummaryCol label="НАЧИСЛЕНО" value={`+${formatPoints(earned)}`} />
      <View style={styles.summaryDivider} />
      <SummaryCol label="СПИСАНО" value={`−${formatPoints(spent)}`} />
      <View style={styles.summaryDivider} />
      <SummaryCol label="ИТОГО" value={formatPoints(balance)} />
    </View>
  );
}

function SummaryCol({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCol}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 100 },

  summary: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.divider,
    marginVertical: 4,
  },
  summaryLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.inkMuted,
    marginBottom: 6,
  },
  summaryValue: {
    fontFamily: Fonts.monoSemi,
    fontSize: 18,
    letterSpacing: -0.3,
    color: Colors.ink,
  },

  sectionHeader: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 18,
    paddingBottom: 10,
  },
  sectionHeaderText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.inkMuted,
  },
  sectionFooter: { height: 4 },

  rowWrap: {
    paddingHorizontal: Spacing.xl,
  },
  rowInner: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.divider,
  },
  rowInnerFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
  },
  rowInnerLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: Radii.lg,
    borderBottomRightRadius: Radii.lg,
  },

  error: {
    margin: Spacing.xl,
    padding: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  errorText: { ...Type.bodySub, textAlign: 'center', color: Colors.inkSub },

  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: { ...Type.body, color: Colors.inkMuted },
});

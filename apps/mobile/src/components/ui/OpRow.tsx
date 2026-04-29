import { View, Text, StyleSheet } from 'react-native';
import { Colors, Type, Fonts, Spacing } from '../../theme/tokens';
import { formatPoints } from '../../utils/format';
import type { TransactionKind } from '../../utils/transactionType';

export interface OpRowData {
  id: string;
  name: string;
  date: string;
  amount: number;
  kind: TransactionKind;
}

interface OpRowProps {
  item: OpRowData;
  showDivider?: boolean;
}

export function OpRow({ item, showDivider = false }: OpRowProps) {
  const formatted = formatPoints(Math.abs(item.amount));

  let sign = '';
  let amountColor: string = Colors.ink;
  let iconSymbol = '';
  let iconBorder: string = Colors.dividerStrong;
  let iconColor: string = Colors.ink;

  if (item.kind === 'earn') {
    sign = '+';
    amountColor = Colors.positive;
    iconSymbol = '+';
    iconBorder = Colors.positive;
    iconColor = Colors.positive;
  } else if (item.kind === 'spend') {
    sign = '−';
    amountColor = Colors.inkSub;
    iconSymbol = '−';
    iconBorder = Colors.dividerStrong;
    iconColor = Colors.inkSub;
  } else {
    sign = '';
    amountColor = Colors.inkSub;
    iconSymbol = '';
    iconBorder = Colors.dividerStrong;
  }

  return (
    <View style={[styles.row, showDivider && styles.divider]}>
      <View style={[styles.icon, { borderColor: iconBorder }]}>
        {iconSymbol ? (
          <Text style={[styles.iconText, { color: iconColor }]}>{iconSymbol}</Text>
        ) : null}
      </View>
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {sign}
        {formatted}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 14,
    lineHeight: 16,
  },
  left: { flex: 1, paddingRight: Spacing.md },
  name: { ...Type.bodyMed },
  date: { ...Type.caption, marginTop: 2 },
  amount: {
    fontFamily: Fonts.sansSemi,
    fontSize: 15,
    letterSpacing: -0.3,
  },
});

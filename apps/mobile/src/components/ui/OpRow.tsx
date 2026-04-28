import { View, Text, StyleSheet } from 'react-native';
import { Colors, Type, Fonts, Spacing } from '../../theme/tokens';
import { formatPoints } from '../../utils/format';

export interface OpRowData {
  id: string;
  name: string;
  date: string;
  amount: number;
  positive: boolean;
}

interface OpRowProps {
  item: OpRowData;
  showDivider?: boolean;
}

export function OpRow({ item, showDivider = false }: OpRowProps) {
  const sign = item.positive ? '+' : '−';
  const formatted = formatPoints(Math.abs(item.amount));

  return (
    <View style={[styles.row, showDivider && styles.divider]}>
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>
      <Text
        style={[
          styles.amount,
          { color: item.positive ? Colors.positive : Colors.ink },
        ]}
      >
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
  left: { flex: 1, paddingRight: Spacing.md },
  name: { ...Type.bodyMed },
  date: { ...Type.caption, marginTop: 2 },
  amount: {
    fontFamily: Fonts.sansSemi,
    fontSize: 15,
    letterSpacing: -0.3,
  },
});

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Type, Spacing } from '../../theme/tokens';

interface SectionHeadProps {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHead({ label, actionLabel, onAction }: SectionHeadProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} hitSlop={8} activeOpacity={0.6}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  label: { ...Type.small },
  action: { ...Type.caption, color: Colors.inkSub },
});

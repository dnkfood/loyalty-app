import type { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Type, Spacing } from '../../theme/tokens';

interface AppHeaderProps {
  title: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightSlot?: ReactNode;
}

export function AppHeader({ title, rightIcon, onRightPress, rightSlot }: AppHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {rightSlot ?? (
        rightIcon ? (
          <TouchableOpacity
            onPress={onRightPress}
            hitSlop={12}
            style={styles.iconBtn}
            activeOpacity={0.6}
          >
            <Ionicons name={rightIcon} size={22} color={Colors.ink} />
          </TouchableOpacity>
        ) : null
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.bg,
  },
  title: {
    ...Type.h1,
    fontSize: 20,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

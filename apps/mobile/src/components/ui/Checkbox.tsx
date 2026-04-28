import type { ReactNode } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Type } from '../../theme/tokens';

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function Checkbox({ checked, onToggle, children }: CheckboxProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onToggle}
      activeOpacity={0.7}
      hitSlop={6}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? (
          <Ionicons name="checkmark" size={14} color={Colors.heroInk} />
        ) : null}
      </View>
      <Text style={styles.label}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.dividerStrong,
    marginRight: 12,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  boxChecked: {
    borderColor: Colors.ink,
    backgroundColor: Colors.ink,
  },
  label: {
    ...Type.caption,
    flex: 1,
    color: Colors.inkSub,
    lineHeight: 18,
  },
});

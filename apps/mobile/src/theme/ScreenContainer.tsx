import type { ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { Colors } from './tokens';

interface ScreenContainerProps {
  children: ReactNode;
  edges?: ReadonlyArray<Edge>;
  style?: ViewStyle;
}

export function ScreenContainer({
  children,
  edges = ['top'],
  style,
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={[styles.root, style]} edges={edges}>
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  inner: { flex: 1, backgroundColor: Colors.bg },
});

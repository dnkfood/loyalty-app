import { View, StyleSheet, type ViewStyle } from 'react-native';

interface ProgressBarProps {
  /** Current progress value. Clamped to [0, max]. */
  value: number;
  /** Maximum value. If 0 or missing, the bar renders empty. */
  max: number;
  color?: string;
  trackColor?: string;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({
  value,
  max,
  color = '#fff',
  trackColor = 'rgba(255,255,255,0.25)',
  height = 8,
  style,
}: ProgressBarProps) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const percent = `${Math.round(ratio * 100)}%` as `${number}%`;

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: trackColor, height, borderRadius: height / 2 },
        style,
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            width: percent,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});

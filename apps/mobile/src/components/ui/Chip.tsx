import { Text, View, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, Fonts, Radii } from '../../theme/tokens';

interface ChipProps {
  label: string;
  onHero?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Chip({ label, onHero = false, style, textStyle }: ChipProps) {
  return (
    <View
      style={[
        styles.chip,
        {
          borderColor: onHero ? Colors.heroMuted : Colors.divider,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: onHero ? Colors.heroInk : Colors.ink },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: Fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});

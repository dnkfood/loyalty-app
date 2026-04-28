import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Colors, Fonts, Radii } from '../../theme/tokens';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const isGhost = variant === 'ghost';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        styles.base,
        isGhost ? styles.ghost : styles.primary,
        isDisabled && (isGhost ? styles.ghostDisabled : styles.primaryDisabled),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? Colors.ink : Colors.heroInk} />
      ) : (
        <View style={styles.row}>
          <Text
            style={[
              styles.text,
              isGhost ? styles.textGhost : styles.textPrimary,
              isDisabled && styles.textDisabled,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: Colors.ink,
  },
  primaryDisabled: {
    backgroundColor: Colors.dividerStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.dividerStrong,
  },
  ghostDisabled: {
    borderColor: Colors.divider,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontFamily: Fonts.sansSemi,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  textPrimary: {
    color: Colors.heroInk,
  },
  textGhost: {
    color: Colors.ink,
  },
  textDisabled: {
    color: Colors.heroInk,
    opacity: 0.7,
  },
});

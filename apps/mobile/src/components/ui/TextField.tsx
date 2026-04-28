import { forwardRef, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Colors, Fonts, Radii, Type } from '../../theme/tokens';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  required?: boolean;
  error?: string | null;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  containerStyle?: ViewStyle;
  fieldStyle?: ViewStyle;
  /** When true, render content slot instead of TextInput (used for selects/dropdowns). */
  asSlot?: boolean;
  children?: ReactNode;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    required,
    error,
    leftSlot,
    rightSlot,
    containerStyle,
    fieldStyle,
    asSlot,
    children,
    onFocus,
    onBlur,
    placeholderTextColor,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.requiredMark}>{' *'}</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          error ? styles.fieldError : null,
          fieldStyle,
        ]}
      >
        {leftSlot ? <View style={styles.slotLeft}>{leftSlot}</View> : null}
        {asSlot ? (
          <View style={styles.slotContent}>{children}</View>
        ) : (
          <TextInput
            ref={ref}
            style={styles.input}
            placeholderTextColor={placeholderTextColor ?? Colors.inkMuted}
            selectionColor={Colors.ink}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...rest}
          />
        )}
        {rightSlot ? <View style={styles.slotRight}>{rightSlot}</View> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    ...Type.small,
    marginBottom: 8,
  },
  requiredMark: {
    color: Colors.ink,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  fieldFocused: {
    borderColor: Colors.ink,
  },
  fieldError: {
    borderColor: Colors.danger,
  },
  slotLeft: {
    marginRight: 8,
  },
  slotRight: {
    marginLeft: 8,
  },
  slotContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.sansMed,
    fontSize: 16,
    color: Colors.ink,
    paddingVertical: 14,
  },
  errorText: {
    ...Type.caption,
    color: Colors.danger,
    marginTop: 4,
  },
});

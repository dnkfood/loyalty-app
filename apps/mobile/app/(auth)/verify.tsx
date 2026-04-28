import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { verifyOtp, sendOtp } from '../../src/api/auth.api';
import { useAuthStore } from '../../src/stores/auth.store';
import { saveTokens } from '../../src/utils/token';
import { maskPhone } from '@loyalty/shared-utils';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { Colors, Type, Fonts, Spacing, Radii } from '../../src/theme/tokens';

const RESEND_COOLDOWN = 60;

function formatTimer(s: number): string {
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);

  const startTimer = useCallback(() => {
    setResendSeconds(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const handleResend = async () => {
    if (resendSeconds > 0 || resending) return;
    try {
      setResending(true);
      await sendOtp(phone ?? '');
      startTimer();
      Alert.alert('Код отправлен', `SMS отправлен на ${maskPhone(phone ?? '')}`);
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить код. Попробуйте позже.');
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    if (code.length < 4) {
      Alert.alert('Ошибка', 'Введите код из SMS');
      return;
    }

    try {
      setLoading(true);
      const result = await verifyOtp(phone ?? '', code);
      console.log('[Verify] isNewUser:', result.isNewUser);
      await saveTokens(result.accessToken, result.refreshToken);
      if (result.isNewUser) {
        useAuthStore.getState().setNeedsRegistration(true);
        setAuth(result.accessToken, { ...result.user, name: result.user.name ?? null });
        router.replace('/(auth)/register' as never);
        return;
      }
      setAuth(result.accessToken, { ...result.user, name: result.user.name ?? null });
    } catch {
      Alert.alert('Ошибка', 'Неверный или истёкший код. Попробуйте снова.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const canResend = resendSeconds === 0 && !resending;
  const masked = maskPhone(phone ?? '');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Подтверждение</Text>
          <Text style={styles.subtitle}>
            Код отправлен на <Text style={styles.subtitleStrong}>{masked}</Text>
          </Text>

          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={[
              styles.codeField,
              focused && styles.codeFieldFocused,
            ]}
          >
            <TextInput
              ref={inputRef}
              style={styles.codeInput}
              value={code}
              onChangeText={setCode}
              placeholder="------"
              placeholderTextColor={Colors.inkMuted}
              keyboardType="number-pad"
              maxLength={10}
              autoFocus
              textAlign="center"
              selectionColor={Colors.ink}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={() => void handleResend()}
            disabled={!canResend}
            activeOpacity={0.6}
          >
            <Text
              style={[
                styles.resendText,
                canResend ? styles.resendActive : styles.resendDisabled,
              ]}
            >
              {resendSeconds > 0
                ? `Отправить код повторно через ${formatTimer(resendSeconds)}`
                : 'Отправить код повторно'}
            </Text>
          </TouchableOpacity>

          <PrimaryButton
            title="Подтвердить"
            onPress={() => void handleVerify()}
            loading={loading}
            disabled={code.length < 4}
            style={styles.cta}
          />

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
            activeOpacity={0.6}
          >
            <Text style={styles.backText}>Изменить номер</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 48,
  },
  title: {
    ...Type.title,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Type.body,
    color: Colors.inkSub,
    textAlign: 'center',
    marginBottom: 36,
  },
  subtitleStrong: {
    fontFamily: Fonts.sansSemi,
    color: Colors.ink,
  },
  codeField: {
    height: 64,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  codeFieldFocused: {
    borderColor: Colors.ink,
    borderWidth: 1.5,
  },
  codeInput: {
    fontFamily: Fonts.monoSemi,
    fontSize: 28,
    letterSpacing: 10,
    color: Colors.ink,
    paddingVertical: 0,
    height: 48,
  },
  resendBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    marginBottom: 28,
  },
  resendText: {
    ...Type.bodySub,
  },
  resendActive: {
    color: Colors.ink,
    textDecorationLine: 'underline',
  },
  resendDisabled: {
    color: Colors.inkMuted,
  },
  cta: {
    marginTop: 4,
  },
  backLink: {
    alignSelf: 'center',
    marginTop: 28,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backText: {
    ...Type.caption,
    color: Colors.inkSub,
  },
});

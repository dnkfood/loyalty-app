import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { sendOtp } from '../../src/api/auth.api';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { TextField } from '../../src/components/ui/TextField';
import { Checkbox } from '../../src/components/ui/Checkbox';
import { Colors, Type, Fonts, Spacing } from '../../src/theme/tokens';

function applyPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 8)
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function extractDigits(masked: string): string {
  return masked.replace(/\D/g, '');
}

export default function PhoneScreen() {
  const [display, setDisplay] = useState('');
  const [loading, setLoading] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [adsAccepted, setAdsAccepted] = useState(false);

  const digits = extractDigits(display);
  const fullPhone = `7${digits}`;
  const canSubmit = digits.length >= 10 && privacyAccepted;

  const handleChangeText = (text: string) => {
    setDisplay(applyPhoneMask(text));
  };

  const handleSendOtp = async () => {
    if (digits.length !== 10) {
      Alert.alert('Ошибка', 'Введите 10 цифр номера телефона');
      return;
    }

    try {
      setLoading(true);
      await sendOtp(fullPhone);
      router.push({ pathname: '/(auth)/verify', params: { phone: fullPhone } });
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить код. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandWrap}>
            <Text style={styles.brandText}>DNK FOOD</Text>
          </View>

          <Text style={styles.title}>Вход</Text>
          <Text style={styles.subtitle}>
            Введите номер телефона, на него придёт код подтверждения
          </Text>

          <TextField
            label="Номер телефона"
            required
            value={display}
            onChangeText={handleChangeText}
            placeholder="(9XX) XXX-XX-XX"
            keyboardType="phone-pad"
            maxLength={15}
            autoFocus
            leftSlot={<Text style={styles.prefix}>+7</Text>}
          />

          <View style={styles.checks}>
            <Checkbox
              checked={privacyAccepted}
              onToggle={() => setPrivacyAccepted(!privacyAccepted)}
            >
              Я согласен с{' '}
              <Text
                style={styles.link}
                onPress={() => void Linking.openURL('https://dnkfood.ru/privacy')}
              >
                политикой обработки персональных данных
              </Text>
            </Checkbox>
            <Checkbox
              checked={adsAccepted}
              onToggle={() => setAdsAccepted(!adsAccepted)}
            >
              Я согласен на получение рекламных рассылок
            </Checkbox>
          </View>

          <PrimaryButton
            title="Получить код"
            onPress={() => void handleSendOtp()}
            loading={loading}
            disabled={!canSubmit}
            style={styles.cta}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 32,
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: 36,
  },
  brandText: {
    fontFamily: Fonts.sansBold,
    fontSize: 24,
    color: Colors.ink,
    letterSpacing: 3.5,
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
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  prefix: {
    fontFamily: Fonts.sansMed,
    fontSize: 16,
    color: Colors.inkSub,
  },
  checks: {
    marginTop: 8,
    marginBottom: 12,
    gap: 4,
  },
  link: {
    color: Colors.ink,
    textDecorationLine: 'underline',
    fontFamily: Fonts.sansMed,
  },
  cta: {
    marginTop: 16,
  },
});

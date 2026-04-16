import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { sendOtp } from '../../src/api/auth.api';

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Loyalty App</Text>
        <Text style={styles.subtitle}>Введите номер телефона для входа</Text>

        <View style={styles.phoneRow}>
          <Text style={styles.prefix}>+7</Text>
          <TextInput
            style={styles.input}
            value={display}
            onChangeText={handleChangeText}
            placeholder="(9XX) XXX-XX-XX"
            keyboardType="phone-pad"
            maxLength={15}
            autoFocus
          />
        </View>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setPrivacyAccepted(!privacyAccepted)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, privacyAccepted && styles.checkboxChecked]}>
            {privacyAccepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            Я согласен с{' '}
            <Text
              style={styles.link}
              onPress={() => void Linking.openURL('https://dnkfood.ru/privacy')}
            >
              политикой обработки персональных данных
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAdsAccepted(!adsAccepted)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, adsAccepted && styles.checkboxChecked]}>
            {adsAccepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            Я согласен на получение рекламных рассылок
          </Text>
        </TouchableOpacity>

        <Button
          title="Получить код"
          onPress={() => void handleSendOtp()}
          loading={loading}
          disabled={!canSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    marginBottom: 16,
    height: 52,
  },
  prefix: {
    fontSize: 18,
    color: '#999',
    paddingLeft: 16,
    paddingRight: 4,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 18,
    paddingHorizontal: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingRight: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 10,
    marginTop: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});

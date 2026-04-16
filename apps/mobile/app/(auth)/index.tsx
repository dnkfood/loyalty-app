import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
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

  const digits = extractDigits(display);
  const fullPhone = `7${digits}`;

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
      <View style={styles.content}>
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

        <Button
          title="Получить код"
          onPress={() => void handleSendOtp()}
          loading={loading}
          disabled={digits.length < 10}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
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
});

import { useState, useRef } from 'react';
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
import { useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { verifyOtp } from '../../src/api/auth.api';
import { useAuthStore } from '../../src/stores/auth.store';
import { saveTokens } from '../../src/utils/token';
import { maskPhone } from '@loyalty/shared-utils';

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleVerify = async () => {
    if (code.length < 4) {
      Alert.alert('Ошибка', 'Введите код из SMS');
      return;
    }

    try {
      setLoading(true);
      const result = await verifyOtp(phone ?? '', code);
      await saveTokens(result.accessToken, result.refreshToken);
      setAuth(result.accessToken, { ...result.user, name: result.user.name ?? null });
      // Navigation handled by root layout auth guard
    } catch {
      Alert.alert('Ошибка', 'Неверный или истёкший код. Попробуйте снова.');
      setCode('');
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
        <Text style={styles.title}>Подтверждение</Text>
        <Text style={styles.subtitle}>
          Введите код, отправленный на номер {maskPhone(phone ?? '')}
        </Text>

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="------"
          keyboardType="number-pad"
          maxLength={10}
          autoFocus
          textAlign="center"
        />

        <Button
          title="Подтвердить"
          onPress={() => void handleVerify()}
          loading={loading}
          disabled={code.length < 4}
        />

        <TouchableOpacity style={styles.resendButton}>
          <Text style={styles.resendText}>Отправить код повторно</Text>
        </TouchableOpacity>
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
  input: {
    height: 64,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 32,
    marginBottom: 16,
    backgroundColor: '#fafafa',
    letterSpacing: 12,
  },
  resendButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  resendText: {
    color: '#007AFF',
    fontSize: 16,
  },
});

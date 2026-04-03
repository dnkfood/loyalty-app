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

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (!/^7\d{10}$/.test(cleaned)) {
      Alert.alert('Ошибка', 'Введите корректный номер телефона (79XXXXXXXXX)');
      return;
    }

    try {
      setLoading(true);
      await sendOtp(cleaned);
      router.push({ pathname: '/(auth)/verify', params: { phone: cleaned } });
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

        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+7 (9XX) XXX-XX-XX"
          keyboardType="phone-pad"
          maxLength={18}
          autoFocus
        />

        <Button
          title="Получить код"
          onPress={() => void handleSendOtp()}
          loading={loading}
          disabled={phone.replace(/\D/g, '').length < 11}
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
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
});

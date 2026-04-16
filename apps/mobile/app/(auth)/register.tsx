import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { apiClient } from '../../src/api/client';
import { useAuthStore } from '../../src/stores/auth.store';
import type { ApiSuccessResponse } from '@loyalty/shared-types';

interface Region {
  id: string;
  name: string;
}

function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

export default function RegisterScreen() {
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [patronymic, setPatronymic] = useState('');
  const [birthday, setBirthday] = useState('');
  const [email, setEmail] = useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [showRegions, setShowRegions] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient
      .get<ApiSuccessResponse<Region[]>>('/loyalty/regions')
      .then((res) => setRegions(res.data.data))
      .catch(() => {});
  }, []);

  const fullName = [lastName, firstName, patronymic].filter(Boolean).join(' ').trim();
  const canSubmit =
    lastName.trim().length > 0 &&
    firstName.trim().length > 0 &&
    birthday.length === 10 &&
    selectedRegion != null;

  const handleRegister = async () => {
    if (!canSubmit || !selectedRegion) return;

    try {
      setLoading(true);
      await apiClient.post('/loyalty/register', {
        name: fullName,
        birthday,
        regionId: selectedRegion.id,
        email: email.trim() || undefined,
      });
      // Clear registration flag so root layout lets user into (app)
      useAuthStore.getState().setNeedsRegistration(false);
      router.replace('/(app)' as never);
    } catch {
      Alert.alert('Ошибка', 'Не удалось зарегистрироваться. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Регистрация</Text>
      <Text style={styles.subtitle}>Заполните данные для программы лояльности</Text>

      <Text style={styles.label}>Фамилия *</Text>
      <TextInput
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
        placeholder="Иванов"
        autoCapitalize="words"
      />

      <Text style={styles.label}>Имя *</Text>
      <TextInput
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Иван"
        autoCapitalize="words"
      />

      <Text style={styles.label}>Отчество</Text>
      <TextInput
        style={styles.input}
        value={patronymic}
        onChangeText={setPatronymic}
        placeholder="Иванович"
        autoCapitalize="words"
      />

      <Text style={styles.label}>Дата рождения *</Text>
      <TextInput
        style={styles.input}
        value={birthday}
        onChangeText={(t) => setBirthday(applyDateMask(t))}
        placeholder="ДД.ММ.ГГГГ"
        keyboardType="number-pad"
        maxLength={10}
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="email@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Город *</Text>
      <TouchableOpacity
        style={styles.select}
        onPress={() => setShowRegions(!showRegions)}
      >
        <Text style={selectedRegion ? styles.selectText : styles.selectPlaceholder}>
          {selectedRegion?.name ?? 'Выберите город'}
        </Text>
        <Text style={styles.selectArrow}>{showRegions ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showRegions && (
        <View style={styles.dropdown}>
          {regions.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[
                styles.dropdownItem,
                selectedRegion?.id === r.id && styles.dropdownItemSelected,
              ]}
              onPress={() => {
                setSelectedRegion(r);
                setShowRegions(false);
              }}
            >
              <Text style={styles.dropdownText}>{r.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.buttonWrapper}>
        <Button
          title="Зарегистрироваться"
          onPress={() => void handleRegister()}
          loading={loading}
          disabled={!canSubmit}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  select: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fafafa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  selectPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  selectArrow: {
    fontSize: 12,
    color: '#999',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginTop: 4,
    backgroundColor: '#fff',
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  dropdownItemSelected: {
    backgroundColor: '#e8f0fe',
  },
  dropdownText: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  buttonWrapper: {
    marginTop: 24,
    marginBottom: 32,
  },
});

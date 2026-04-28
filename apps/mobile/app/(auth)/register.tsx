import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../src/api/client';
import { useAuthStore } from '../../src/stores/auth.store';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { TextField } from '../../src/components/ui/TextField';
import { Colors, Type, Fonts, Spacing, Radii } from '../../src/theme/tokens';
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
    email.trim().length > 0 &&
    selectedRegion != null;

  const handleRegister = async () => {
    if (!canSubmit || !selectedRegion) return;

    try {
      setLoading(true);
      await apiClient.post('/loyalty/register', {
        name: fullName,
        birthday,
        regionId: selectedRegion.id,
        email: email.trim(),
      });
      useAuthStore.getState().setNeedsRegistration(false);
      router.replace('/(app)' as never);
    } catch {
      Alert.alert('Ошибка', 'Не удалось зарегистрироваться. Попробуйте позже.');
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
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Регистрация</Text>
          <Text style={styles.subtitle}>
            Заполните данные для программы лояльности
          </Text>

          <TextField
            label="Фамилия"
            required
            value={lastName}
            onChangeText={setLastName}
            placeholder="Иванов"
            autoCapitalize="words"
          />

          <TextField
            label="Имя"
            required
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Иван"
            autoCapitalize="words"
          />

          <TextField
            label="Отчество"
            value={patronymic}
            onChangeText={setPatronymic}
            placeholder="Иванович"
            autoCapitalize="words"
          />

          <TextField
            label="Дата рождения"
            required
            value={birthday}
            onChangeText={(t) => setBirthday(applyDateMask(t))}
            placeholder="ДД.ММ.ГГГГ"
            keyboardType="number-pad"
            maxLength={10}
          />

          <TextField
            label="Email"
            required
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.cityLabel}>
            Город<Text style={styles.requiredMark}>{' *'}</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.select,
              showRegions && styles.selectOpen,
            ]}
            onPress={() => {
              Keyboard.dismiss();
              setShowRegions(!showRegions);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={selectedRegion ? styles.selectText : styles.selectPlaceholder}
            >
              {selectedRegion?.name ?? 'Выберите город'}
            </Text>
            <Ionicons
              name={showRegions ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.inkMuted}
            />
          </TouchableOpacity>

          {showRegions && (
            <ScrollView
              style={styles.dropdown}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {regions.map((r) => {
                const selected = selectedRegion?.id === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.dropdownItem,
                      selected && styles.dropdownItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedRegion(r);
                      setShowRegions(false);
                    }}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        selected && styles.dropdownTextSelected,
                      ]}
                    >
                      {r.name}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark" size={16} color={Colors.ink} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.buttonWrap}>
            <PrimaryButton
              title="Зарегистрироваться"
              onPress={() => void handleRegister()}
              loading={loading}
              disabled={!canSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  content: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 48,
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
    marginBottom: 24,
  },
  cityLabel: {
    ...Type.small,
    marginBottom: 8,
    marginTop: 0,
  },
  requiredMark: {
    color: Colors.ink,
  },
  select: {
    minHeight: 54,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectOpen: {
    borderColor: Colors.ink,
  },
  selectText: {
    fontFamily: Fonts.sansMed,
    fontSize: 16,
    color: Colors.ink,
  },
  selectPlaceholder: {
    fontFamily: Fonts.sansMed,
    fontSize: 16,
    color: Colors.inkMuted,
  },
  dropdown: {
    marginTop: 6,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    maxHeight: 220,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.bgAlt,
  },
  dropdownText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.ink,
  },
  dropdownTextSelected: {
    fontFamily: Fonts.sansSemi,
  },
  buttonWrap: {
    marginTop: 28,
  },
});

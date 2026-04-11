import { ScrollView, View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getProfile } from '../../src/api/profile.api';
import { useAuthStore } from '../../src/stores/auth.store';
import { clearTokens } from '../../src/utils/token';
import { Card } from '../../src/components/ui/Card';
import { maskPhone } from '@loyalty/shared-utils';
import { formatDateShort } from '../../src/utils/format';

export default function ProfileScreen() {
  const logout = useAuthStore((s) => s.logout);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const handleLogout = () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            await clearTokens();
            logout();
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.profileCard}>
        <Text style={styles.name}>{profile?.name ?? 'Гость'}</Text>
        <Text style={styles.phone}>{maskPhone(profile?.phone ?? '')}</Text>
        {profile?.email && <Text style={styles.email}>{profile.email}</Text>}
      </Card>

      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Согласие ПДн</Text>
          <Text style={styles.infoValue}>
            {profile?.consentGiven ? 'Дано' : 'Не дано'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Дата регистрации</Text>
          <Text style={styles.infoValue}>
            {profile?.createdAt ? formatDateShort(profile.createdAt as string) : '—'}
          </Text>
        </View>
      </Card>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Выйти</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  content: { padding: 16 },
  profileCard: { alignItems: 'center', marginBottom: 16 },
  name: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  phone: { fontSize: 16, color: '#666', marginBottom: 4 },
  email: { fontSize: 14, color: '#999' },
  infoCard: { marginBottom: 16 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: { fontSize: 15, color: '#666' },
  infoValue: { fontSize: 15, fontWeight: '500' },
  logoutButton: {
    backgroundColor: '#ff3b30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

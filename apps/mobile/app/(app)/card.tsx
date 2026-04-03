import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { LoyaltyQRCard } from '../../src/components/loyalty/LoyaltyQRCard';
import { getLoyaltyCard } from '../../src/api/loyalty.api';

export default function CardScreen() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['loyaltyCard'],
    queryFn: getLoyaltyCard,
    staleTime: 60_000, // QR data valid for 1 minute
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Карта лояльности</Text>
      <Text style={styles.subtitle}>Покажите QR-код кассиру для начисления баллов</Text>

      {isLoading && (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Загрузка QR-кода...</Text>
        </View>
      )}

      {isError && (
        <View style={styles.error}>
          <Text style={styles.errorText}>Не удалось загрузить карту</Text>
        </View>
      )}

      {data && (
        <LoyaltyQRCard
          qrData={data.qrData}
          externalGuestId={data.externalGuestId}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  placeholder: {
    width: 280,
    height: 280,
    borderRadius: 16,
    backgroundColor: '#e5e5ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#8e8e93',
  },
  error: {
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    width: '100%',
  },
  errorText: {
    color: '#856404',
    textAlign: 'center',
  },
});

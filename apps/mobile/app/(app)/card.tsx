import { View, Text, StyleSheet, ScrollView, RefreshControl, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { getLoyaltyCard } from '../../src/api/loyalty.api';

export default function CardScreen() {
  const { width } = useWindowDimensions();
  const qrSize = Math.min(width - 80, 300);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['loyalty', 'card'],
    queryFn: getLoyaltyCard,
    staleTime: 60_000,
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
      }
    >
      <Text style={styles.title}>Карта лояльности</Text>
      <Text style={styles.subtitle}>Покажите QR-код кассиру для начисления баллов</Text>

      {isLoading && (
        <View style={[styles.placeholder, { width: qrSize, height: qrSize }]}>
          <Text style={styles.placeholderText}>Загрузка...</Text>
        </View>
      )}

      {isError && (
        <View style={styles.error}>
          <Text style={styles.errorText}>Не удалось загрузить карту</Text>
        </View>
      )}

      {data?.qrData ? (
        <View style={styles.qrCard}>
          <View style={styles.qrWrapper}>
            <QRCode value={data.qrData} size={qrSize} />
          </View>
          <Text style={styles.cardCode}>{data.qrData}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  content: {
    padding: 24,
    alignItems: 'center',
    paddingTop: 32,
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
    borderRadius: 16,
    backgroundColor: '#e5e5ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#8e8e93',
    fontSize: 16,
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
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  cardCode: {
    marginTop: 20,
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 4,
    fontFamily: 'Courier',
  },
});

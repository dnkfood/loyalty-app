import { FlatList, StyleSheet, View, Text, Image, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getOffers } from '../../src/api/loyalty.api';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { formatDate } from '../../src/utils/format';

export default function OffersScreen() {
  const { data: offers, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['offers'],
    queryFn: getOffers,
  });

  return (
    <View style={styles.container}>
      {isError && (
        <View style={styles.error}>
          <Text style={styles.errorText}>Не удалось загрузить предложения</Text>
        </View>
      )}
      <FlatList
        data={offers ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.offerCard}>
            {item.imageUrl && (
              <Image source={{ uri: item.imageUrl }} style={styles.offerImage} />
            )}
            <View style={styles.offerContent}>
              <Text style={styles.offerTitle}>{item.title}</Text>
              <Text style={styles.offerDescription}>{item.description}</Text>
              {item.expiresAt && (
                <Badge label={`До ${formatDate(item.expiresAt)}`} color="#FF6B00" />
              )}
            </View>
          </Card>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Нет персональных предложений</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  list: { padding: 16 },
  error: { margin: 16, padding: 12, backgroundColor: '#fff3cd', borderRadius: 8 },
  errorText: { color: '#856404', textAlign: 'center' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#8e8e93', fontSize: 16 },
  offerCard: { marginBottom: 12, overflow: 'hidden', padding: 0 },
  offerImage: { width: '100%', height: 160, resizeMode: 'cover' },
  offerContent: { padding: 16 },
  offerTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  offerDescription: { fontSize: 14, color: '#666', marginBottom: 8 },
});

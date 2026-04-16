import { FlatList, StyleSheet, View, Text, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../src/api/client';
import { formatRelativeTime } from '../../src/utils/format';
import type { ApiSuccessResponse } from '@loyalty/shared-types';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationListResponse {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
}

async function getNotifications(): Promise<Notification[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<NotificationListResponse>>(
    '/notifications',
    { params: { page: 1, limit: 50 } },
  );
  return data.data.items;
}

export default function NotificationsScreen() {
  const { data: notifications, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  return (
    <View style={styles.container}>
      {isError && (
        <View style={styles.error}>
          <Text style={styles.errorText}>Не удалось загрузить уведомления</Text>
        </View>
      )}
      <FlatList
        data={notifications ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.isRead && styles.cardUnread]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardDate}>{formatRelativeTime(item.createdAt)}</Text>
            </View>
            {item.body ? (
              <Text style={styles.cardBody} numberOfLines={3}>{item.body}</Text>
            ) : null}
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Нет уведомлений</Text>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1c1e',
    flex: 1,
    marginRight: 8,
  },
  cardDate: {
    fontSize: 12,
    color: '#8e8e93',
  },
  cardBody: {
    fontSize: 14,
    color: '#3c3c43',
    lineHeight: 20,
  },
});

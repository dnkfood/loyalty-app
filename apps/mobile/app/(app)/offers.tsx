import { FlatList, StyleSheet, View, Text, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../src/api/client';
import { formatRelativeTime } from '../../src/utils/format';
import { ScreenContainer } from '../../src/theme/ScreenContainer';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { Colors, Type, Fonts, Spacing, Radii } from '../../src/theme/tokens';
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
    <ScreenContainer>
      <AppHeader title="Уведомления" />

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
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={Colors.ink}
          />
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  error: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    padding: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  errorText: { ...Type.bodySub, textAlign: 'center', color: Colors.inkSub },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { ...Type.body, color: Colors.inkMuted },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 16,
    marginBottom: 10,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.ink,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontFamily: Fonts.sansSemi,
    fontSize: 15,
    color: Colors.ink,
    flex: 1,
    marginRight: 8,
  },
  cardDate: {
    ...Type.caption,
  },
  cardBody: {
    ...Type.bodySub,
    color: Colors.inkSub,
  },
});

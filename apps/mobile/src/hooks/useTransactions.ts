import { useInfiniteQuery } from '@tanstack/react-query';
import { getTransactions } from '../api/loyalty.api';
import type { TransactionListResponse } from '@loyalty/shared-types';

export function useTransactions() {
  return useInfiniteQuery<TransactionListResponse>({
    queryKey: ['loyalty', 'transactions'],
    queryFn: ({ pageParam }) => getTransactions(pageParam as number, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, limit, total } = lastPage;
      const hasMore = page * limit < total;
      return hasMore ? page + 1 : undefined;
    },
  });
}

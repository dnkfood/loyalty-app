import { useQuery } from '@tanstack/react-query';
import { getBalance } from '../api/loyalty.api';

export function useBalance() {
  return useQuery({
    queryKey: ['loyalty', 'balance'],
    queryFn: getBalance,
    staleTime: 30_000, // 30 seconds
  });
}

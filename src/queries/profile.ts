import { queryOptions } from '@tanstack/react-query'
import { getProfile } from '@/api/profile'
import { queryKeys } from './keys'

export const profileQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.user.profile(userId),
    queryFn: ({ signal }) => getProfile(signal),
  })

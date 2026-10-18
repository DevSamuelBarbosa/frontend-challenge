import { mutationOptions, type QueryClient, queryOptions } from '@tanstack/react-query'
import type { ChangePasswordRequest, Profile, Session, UpdateProfileRequest } from '@/api/contracts'
import {
  changePassword,
  getProfile,
  removeAvatar,
  updateProfile,
  uploadAvatar,
} from '@/api/profile'
import { queryKeys } from './keys'

export const profileQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.user.profile(userId),
    queryFn: ({ signal }) => getProfile(signal),
  })

/**
 * Guarda o perfil devolvido pela API e atualiza o usuário da sessão, que o header
 * e outras telas leem (nome, usuário, e-mail e avatar).
 */
function applyProfile(queryClient: QueryClient, userId: string, profile: Profile) {
  queryClient.setQueryData(queryKeys.user.profile(userId), profile)
  queryClient.setQueryData<Session | null>(queryKeys.session, (session) =>
    session
      ? {
          ...session,
          user: {
            ...session.user,
            name: profile.name,
            username: profile.username,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
          },
        }
      : session,
  )
}

export const updateProfileMutationOptions = (queryClient: QueryClient, userId: string) =>
  mutationOptions<Profile, Error, UpdateProfileRequest>({
    mutationKey: ['profile', 'update'],
    mutationFn: updateProfile,
    onSuccess: (profile) => applyProfile(queryClient, userId, profile),
  })

export const uploadAvatarMutationOptions = (queryClient: QueryClient, userId: string) =>
  mutationOptions<Profile, Error, File>({
    mutationKey: ['profile', 'avatar'],
    mutationFn: uploadAvatar,
    onSuccess: (profile) => applyProfile(queryClient, userId, profile),
  })

export const removeAvatarMutationOptions = (queryClient: QueryClient, userId: string) =>
  mutationOptions<Profile, Error, void>({
    mutationKey: ['profile', 'avatar'],
    mutationFn: removeAvatar,
    onSuccess: (profile) => applyProfile(queryClient, userId, profile),
  })

export const changePasswordMutationOptions = () =>
  mutationOptions<void, Error, ChangePasswordRequest>({
    mutationKey: ['profile', 'password'],
    mutationFn: changePassword,
  })

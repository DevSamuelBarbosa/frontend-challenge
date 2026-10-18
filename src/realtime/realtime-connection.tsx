import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useSession } from '@/queries/session'
import { openRealtimeConnection } from './connection'

/** Mantém a conexão em tempo real em sincronia com a sessão atual */
export function RealtimeConnection() {
  const queryClient = useQueryClient()
  const { session, isPending } = useSession()
  const token = session?.token ?? null
  const userId = session?.user.id ?? null

  useEffect(() => {
    if (isPending) return
    return openRealtimeConnection({ queryClient, token, userId })
  }, [queryClient, token, userId, isPending])

  return null
}

import { mutationOptions, type QueryClient, queryOptions } from '@tanstack/react-query'
import type { CreateOrderRequest, Order } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { createOrder, getOrder, listOrders } from '@/api/orders'
import { queryKeys } from './keys'

/** Enquanto o pedido está pendente, consulta periodicamente caso um evento se perca */
const PENDING_POLL_MS = 4000
const MAX_ORDER_RETRIES = 2

export const orderQueryOptions = (userId: string, orderId: string) =>
  queryOptions({
    queryKey: queryKeys.user.order(userId, orderId),
    queryFn: ({ signal }) => getOrder(orderId, signal),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? PENDING_POLL_MS : false),
  })

export const pendingOrdersQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.user.ordersByStatus(userId, 'pending'),
    queryFn: ({ signal }) => listOrders('pending', signal),
  })

export interface CreateOrderVariables {
  body: CreateOrderRequest
  /** Chave da tentativa: reenvios usam a mesma chave */
  idempotencyKey: string
}

/**
 * Cria o pedido. Como a chave de idempotência é a mesma em cada reenvio, é seguro
 * repetir falhas transitórias (timeout, rede, 5xx): o servidor devolve o pedido
 * já criado em vez de criar outro.
 */
export const createOrderMutationOptions = (queryClient: QueryClient, userId: string) =>
  mutationOptions<Order, Error, CreateOrderVariables>({
    mutationKey: ['orders', 'create'],
    // Cliques repetidos entram na fila e chegam com a mesma chave
    scope: { id: 'create-order' },
    mutationFn: ({ body, idempotencyKey }) => createOrder(body, idempotencyKey),
    retry: (failureCount, error) =>
      isApiError(error) && error.isRetryable && failureCount < MAX_ORDER_RETRIES,
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.user.order(userId, order.id), order)
      void queryClient.invalidateQueries({ queryKey: queryKeys.user.orders(userId), exact: true })
    },
  })

import {
  type CreateOrderRequest,
  type Order,
  type OrderList,
  orderListSchema,
  orderSchema,
  type OrderStatus,
} from './contracts'
import { api } from './client'
import { parseResponse } from './parse'

/** A mesma chave de idempotência em reenvios garante que o pedido não é duplicado */
export async function createOrder(
  body: CreateOrderRequest,
  idempotencyKey: string,
): Promise<Order> {
  const { data } = await api.post('/orders', body, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return parseResponse(orderSchema, data)
}

export async function getOrder(orderId: string, signal?: AbortSignal): Promise<Order> {
  const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}`, { signal })
  return parseResponse(orderSchema, data)
}

export async function listOrders(status?: OrderStatus, signal?: AbortSignal): Promise<OrderList> {
  const { data } = await api.get('/orders', { params: { status }, signal })
  return parseResponse(orderListSchema, data)
}

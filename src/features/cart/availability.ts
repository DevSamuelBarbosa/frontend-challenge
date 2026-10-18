import type { CartItem } from '@/api/contracts'

/** Quantidade máxima que o item aceita agora: o menor entre o estoque e o limite por pedido */
export const maxQuantity = (item: CartItem) => Math.min(item.available, item.maxPerOrder)

/** Item sem estoque ou com mais unidades no carrinho do que o disponível */
export const isUnavailable = (item: CartItem) => item.quantity > maxQuantity(item)

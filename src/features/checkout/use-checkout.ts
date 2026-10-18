import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { collectorSchema, type WalletConnection } from '@/api/contracts'
import { ApiError } from '@/api/errors'
import { queryKeys } from '@/queries/keys'
import { orderQueryOptions } from '@/queries/orders'
import { quoteQueryOptions } from '@/queries/quote'
import {
  connectWalletMutationOptions,
  disconnectWalletMutationOptions,
  walletsQueryOptions,
} from '@/queries/wallets'
import { type CheckoutController, type ConfirmResult, createCheckoutController } from './controller'
import { hasBlockingIssues, quoteSummary } from './quote-summary'
import { type CheckoutDraft, checkoutStore } from './store'

const controllers = new WeakMap<QueryClient, Map<string, CheckoutController>>()

/** Uma instância por usuário: a trava contra confirmações simultâneas precisa ser única */
function getController(queryClient: QueryClient, userId: string) {
  let byUser = controllers.get(queryClient)
  if (!byUser) controllers.set(queryClient, (byUser = new Map()))
  let controller = byUser.get(userId)
  if (!controller) {
    controller = createCheckoutController({ queryClient, userId, store: checkoutStore(userId) })
    byUser.set(userId, controller)
  }
  return controller
}

export function useCheckout(userId: string) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const store = checkoutStore(userId)
  const state = useSyncExternalStore(store.subscribe, store.get)
  const controller = getController(queryClient, userId)
  const { draft, attempt, acceptedQuote } = state

  const quote = useQuery(
    quoteQueryOptions(userId, {
      network: draft.network,
      couponCode: draft.couponCode ?? undefined,
    }),
  )
  const wallets = useQuery(walletsQueryOptions(userId))
  // A conexão simulada não tem consulta própria: o cache guarda a última conexão feita
  const connection = useQuery<WalletConnection | null>({
    queryKey: queryKeys.user.walletConnection(userId),
    queryFn: () => null,
    staleTime: Infinity,
  })
  const orderId = attempt?.orderId ?? null
  const order = useQuery({ ...orderQueryOptions(userId, orderId ?? ''), enabled: Boolean(orderId) })

  const [result, setResult] = useState<ConfirmResult | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [walletError, setWalletError] = useState<ApiError | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const isConnected =
    connection.data?.walletId === draft.walletId && connection.data?.network === draft.network
  const reviewed = acceptedQuote !== null
  const quoteChanged =
    reviewed &&
    quote.data !== undefined &&
    !quote.isPlaceholderData &&
    (quoteSummary(quote.data) !== acceptedQuote || hasBlockingIssues(quote.data))
  const locked = Boolean(attempt) // pedido enviado: os dados não podem mais mudar

  const confirm = useCallback(async () => {
    setConfirming(true)
    setFieldErrors({})
    try {
      const outcome = await controller.confirm()
      setResult(outcome)
      if (outcome.type === 'error') setFieldErrors(outcome.error.fields)
      return outcome
    } finally {
      setConfirming(false)
    }
  }, [controller])

  // Refresh ou reconexão no meio do envio: retoma a mesma tentativa, sem criar outra
  const resumed = useRef(false)
  useEffect(() => {
    if (resumed.current || !attempt || attempt.orderId) return
    resumed.current = true
    void confirm()
  }, [attempt, confirm])

  // A confirmação só é exibida para pedido efetivamente confirmado na simulação
  const status = order.data?.status
  useEffect(() => {
    if (status !== 'confirmed' || !orderId) return
    void navigate({ to: '/orders/$orderId', params: { orderId }, replace: true }).then(() =>
      controller.complete(),
    )
  }, [status, orderId, navigate, controller])

  function updateDraft(change: Partial<CheckoutDraft>) {
    if (locked) return
    store.update((s) => ({ ...s, draft: { ...s.draft, ...change } }))
  }

  /** Valida os dados e registra os valores que o usuário está aceitando */
  async function review() {
    const parsed = collectorSchema.safeParse(draft.collector)
    const errors: Record<string, string> = {}
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        errors[`collector.${issue.path.join('.')}`] ??= issue.message
    }
    if (!draft.walletId) errors.walletId = 'Selecione uma carteira'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return false

    const fresh = await controller.fetchFreshQuote()
    if (hasBlockingIssues(fresh)) {
      setResult({ type: 'changed', quote: fresh })
      return false
    }
    controller.accept(fresh)
    setResult(null)
    return true
  }

  async function connectWallet() {
    if (!draft.walletId) return
    setWalletError(null)
    try {
      await queryClient
        .getMutationCache()
        .build(queryClient, connectWalletMutationOptions(queryClient, userId))
        .execute({ walletId: draft.walletId, network: draft.network })
    } catch (error) {
      setWalletError(error instanceof ApiError ? error : null)
    }
  }

  async function disconnectWallet() {
    if (!draft.walletId) return
    await queryClient
      .getMutationCache()
      .build(queryClient, disconnectWalletMutationOptions(queryClient, userId))
      .execute({ walletId: draft.walletId })
      .catch(() => undefined)
  }

  function retryAfterRejection() {
    controller.discardAttempt()
    setResult(null)
  }

  return {
    draft,
    attempt,
    quote,
    wallets,
    order,
    result,
    fieldErrors,
    walletError,
    isConnected,
    reviewed,
    quoteChanged,
    locked,
    confirming,
    canConfirm: reviewed && !quoteChanged && isConnected && !confirming && !orderId,
    updateDraft,
    review,
    acceptChanges: review,
    confirm,
    connectWallet,
    disconnectWallet,
    retryAfterRejection,
  }
}

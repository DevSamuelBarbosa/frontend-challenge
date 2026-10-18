import { zodResolver } from '@hookform/resolvers/zod'
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { type FieldPath, useForm, useWatch } from 'react-hook-form'
import type { Quote, Wallet, WalletConnection } from '@/api/contracts'
import { ApiError } from '@/api/errors'
import { queryKeys } from '@/queries/keys'
import { orderQueryOptions } from '@/queries/orders'
import { profileQueryOptions } from '@/queries/profile'
import { quoteQueryOptions } from '@/queries/quote'
import {
  connectWalletMutationOptions,
  disconnectWalletMutationOptions,
  walletsQueryOptions,
} from '@/queries/wallets'
import { type CheckoutController, type ConfirmResult, createCheckoutController } from './controller'
import { type CheckoutFormInput, type CheckoutFormOutput, checkoutFormSchema } from './form-schema'
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

const toFormValues = (draft: CheckoutDraft): CheckoutFormInput => ({
  collector: draft.collector,
  walletId: draft.walletId ?? '',
  network: draft.network,
  deliverToOther: draft.deliverToOther,
})

/** Etapas do diálogo de revisão e envio do pedido */
export type ReviewPhase =
  | 'review' // conferindo os dados antes de enviar
  | 'changed' // valores ou disponibilidade mudaram: nova confirmação
  | 'blocked' // há item esgotado ou reduzido: precisa voltar ao carrinho
  | 'sending' // enviando o pedido
  | 'pending' // pedido criado, aguardando a carteira
  | 'rejected' // pagamento recusado
  | 'error' // falha ao enviar

export function useCheckout(userId: string) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const store = checkoutStore(userId)
  const { draft, attempt, acceptedQuote } = useSyncExternalStore(store.subscribe, store.get)
  const controller = getController(queryClient, userId)
  const locked = Boolean(attempt) // pedido enviado: os dados não podem mais mudar

  const form = useForm<CheckoutFormInput, unknown, CheckoutFormOutput>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: toFormValues(draft),
    mode: 'onTouched',
  })
  const walletId = useWatch({ control: form.control, name: 'walletId' })
  const network = useWatch({ control: form.control, name: 'network' })
  const deliverToOther = useWatch({ control: form.control, name: 'deliverToOther' })

  // O rascunho persiste a cada alteração: sobrevive a refresh e à expiração da sessão
  const values = useWatch({ control: form.control })
  useEffect(() => {
    store.update((s) => ({
      ...s,
      draft: {
        ...s.draft,
        collector: { ...s.draft.collector, ...values.collector },
        walletId: values.walletId || null,
        network: values.network ?? s.draft.network,
        deliverToOther: values.deliverToOther ?? false,
      },
    }))
  }, [values, store])

  // Pré-preenche com os dados do perfil, sem sobrescrever o que o usuário já digitou
  const profile = useQuery(profileQueryOptions(userId))
  const prefilled = useRef(false)
  useEffect(() => {
    const data = profile.data
    if (!data || prefilled.current) return
    prefilled.current = true
    const fill = (name: FieldPath<CheckoutFormInput>, value: string) => {
      if (value && !form.getValues(name)) form.setValue(name, value)
    }
    fill('collector.displayName', data.name)
    fill('collector.profileName', data.name)
    fill('collector.username', data.username)
    fill('collector.email', data.email)
    fill('collector.ensName', data.ensName)
  }, [profile.data, form])

  // Carteiras cadastradas. A principal é a escolha inicial; uma escolha salva que não existe mais é descartada.
  const wallets = useQuery(walletsQueryOptions(userId))
  const selectedWallet: Wallet | undefined = wallets.data?.find((w) => w.id === walletId)
  const selectWallet = useCallback(
    (wallet: Wallet) => {
      form.setValue('walletId', wallet.id, { shouldValidate: form.formState.isSubmitted })
      if (!wallet.networks.includes(form.getValues('network'))) {
        form.setValue('network', wallet.networks[0])
      }
    },
    [form],
  )
  useEffect(() => {
    const list = wallets.data
    if (!list?.length || selectedWallet) return
    selectWallet(list.find((w) => w.role === 'primary') ?? list[0])
  }, [wallets.data, selectedWallet, selectWallet])

  // Cotação ao vivo, com a rede e o cupom escolhidos
  const quote = useQuery(
    quoteQueryOptions(userId, { network, couponCode: draft.couponCode ?? undefined }),
  )

  // Conexão simulada da carteira (conectar, recusa e desconectar)
  const connection = useQuery<WalletConnection | null>({
    queryKey: queryKeys.user.walletConnection(userId),
    queryFn: () => null,
    staleTime: Infinity,
  })
  const connectMutation = useMutation(connectWalletMutationOptions(queryClient, userId))
  const disconnectMutation = useMutation(disconnectWalletMutationOptions(queryClient, userId))
  const [walletError, setWalletError] = useState<ApiError | null>(null)
  const isConnected =
    Boolean(walletId) &&
    connection.data?.walletId === walletId &&
    connection.data?.network === network

  const connect = useCallback(async () => {
    setWalletError(null)
    try {
      await connectMutation.mutateAsync({ walletId, network })
      return true
    } catch (error) {
      setWalletError(error instanceof ApiError ? error : null)
      return false
    }
  }, [connectMutation, walletId, network])

  const disconnect = useCallback(async () => {
    setWalletError(null)
    await disconnectMutation.mutateAsync({ walletId }).catch(() => undefined)
  }, [disconnectMutation, walletId])

  // Pedido enviado: acompanha o estado até a confirmação ou a recusa
  const orderId = attempt?.orderId ?? null
  const order = useQuery({ ...orderQueryOptions(userId, orderId ?? ''), enabled: Boolean(orderId) })

  const [reviewQuote, setReviewQuote] = useState<Quote | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [outcome, setOutcome] = useState<ConfirmResult | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const liveQuote = quote.isPlaceholderData ? undefined : quote.data
  const liveQuoteBlocked = liveQuote !== undefined && hasBlockingIssues(liveQuote)
  const quoteChanged =
    acceptedQuote !== null &&
    quote.data !== undefined &&
    !quote.isPlaceholderData &&
    (quoteSummary(quote.data) !== acceptedQuote || hasBlockingIssues(quote.data))

  let phase: ReviewPhase = 'review'
  if (order.data?.status === 'rejected') phase = 'rejected'
  else if (orderId) phase = 'pending'
  else if (confirming || attempt) phase = 'sending'
  // Item esgotado ou reduzido não tem como ser aceito: só resta voltar ao carrinho
  else if (
    (reviewQuote && hasBlockingIssues(reviewQuote)) ||
    (acceptedQuote !== null && liveQuoteBlocked)
  ) {
    phase = 'blocked'
  } else if (outcome?.type === 'changed' || quoteChanged) phase = 'changed'
  else if (outcome?.type === 'error') phase = 'error'

  /** Fecha o diálogo, exceto enquanto o pedido está sendo enviado ou processado */
  const closeDialog = useCallback(() => {
    if (!attempt) setDialogOpen(false)
  }, [attempt])

  const confirm = useCallback(async () => {
    setConfirming(true)
    setOutcome(null)
    try {
      const result = await controller.confirm()
      if (result.type === 'changed') setReviewQuote(result.quote)
      if (result.type === 'error') {
        // Erros de validação da API voltam para os campos do formulário
        const fields = Object.entries(result.error.fields)
        for (const [path, message] of fields) {
          form.setError(path as FieldPath<CheckoutFormInput>, { message })
        }
        if (fields.length > 0) setDialogOpen(false)
      }
      setOutcome(result)
      return result
    } finally {
      setConfirming(false)
    }
  }, [controller, form])

  // Refresh ou queda no meio do envio: retoma a mesma tentativa, sem criar outra.
  // O diálogo já abre sozinho enquanto existe uma tentativa (ver `review.open`).
  const resumed = useRef(false)
  useEffect(() => {
    if (resumed.current || !attempt || attempt.orderId) return
    resumed.current = true
    void confirm()
  }, [attempt, confirm])

  // A tela de confirmação só aparece para pedido efetivamente confirmado na simulação
  const status = order.data?.status
  useEffect(() => {
    if (status !== 'confirmed' || !orderId) return
    void navigate({ to: '/orders/$orderId', params: { orderId }, replace: true }).then(() =>
      controller.complete(),
    )
  }, [status, orderId, navigate, controller])

  /** Dados válidos: conecta a carteira (se preciso), refaz a cotação e abre a revisão */
  const submit = form.handleSubmit(async () => {
    setSubmitError(null)
    setOutcome(null)
    setPreparing(true)
    try {
      if (!isConnected && !(await connect())) return
      const fresh = await controller.fetchFreshQuote()
      setReviewQuote(fresh)
      if (!hasBlockingIssues(fresh)) controller.accept(fresh)
      setDialogOpen(true)
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : 'Não foi possível preparar o pedido.',
      )
    } finally {
      setPreparing(false)
    }
  })

  // Cupom: fica no rascunho, então o resumo do carrinho e o do pagamento mostram o mesmo
  const applyCoupon = useCallback(
    (code: string) => {
      const normalized = code.trim().toUpperCase()
      store.update((s) => ({ ...s, draft: { ...s.draft, couponCode: normalized || null } }))
    },
    [store],
  )

  /** Aceita os novos valores depois de uma mudança, exigindo nova confirmação */
  const acceptChanges = useCallback(async () => {
    setOutcome(null)
    const fresh = await controller.fetchFreshQuote()
    setReviewQuote(fresh)
    if (!hasBlockingIssues(fresh)) controller.accept(fresh)
  }, [controller])

  const retryAfterRejection = useCallback(() => {
    controller.discardAttempt()
    setOutcome(null)
    setDialogOpen(false)
  }, [controller])

  return {
    form,
    locked,
    walletId,
    network,
    deliverToOther,
    wallets,
    selectedWallet,
    selectWallet,
    quote,
    profile,
    couponCode: draft.couponCode,
    applyCoupon,
    removeCoupon: () => applyCoupon(''),
    // carteira
    isConnected,
    isConnecting: connectMutation.isPending,
    walletError,
    connect,
    disconnect,
    // envio
    submit,
    preparing,
    submitError,
    review: {
      open: dialogOpen || Boolean(attempt),
      phase,
      quote: reviewQuote,
      order: order.data ?? null,
      error: outcome?.type === 'error' ? outcome.error : null,
      confirming,
      onClose: closeDialog,
      onConfirm: () => void confirm(),
      onAcceptChanges: () => void acceptChanges(),
      onRetryAfterRejection: retryAfterRejection,
    },
  }
}

export type Checkout = ReturnType<typeof useCheckout>

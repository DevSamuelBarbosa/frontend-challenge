import { createFileRoute, Link } from '@tanstack/react-router'
import type { Network } from '@/api/contracts'
import { useCheckout } from '@/features/checkout/use-checkout'

export const Route = createFileRoute('/_authenticated/checkout')({
  component: CheckoutPage,
})

const NETWORKS: Network[] = ['ethereum', 'polygon', 'base']

// Renderização provisória: a tela do Figma substitui este conteúdo
function CheckoutPage() {
  const { session } = Route.useRouteContext()
  const c = useCheckout(session.user.id)
  const { draft, quote, order, result } = c
  const collector = (field: keyof typeof draft.collector) => ({
    id: `collector-${field}`,
    value: draft.collector[field],
    disabled: c.locked,
    'aria-invalid': Boolean(c.fieldErrors[`collector.${field}`]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      c.updateDraft({ collector: { ...draft.collector, [field]: e.target.value } }),
  })

  return (
    <>
      <h1 className="text-2xl font-bold">Pagamento</h1>

      <section aria-label="Dados do colecionador">
        {(['fullName', 'email', 'country'] as const).map((field) => (
          <p key={field}>
            <label htmlFor={`collector-${field}`}>{field}</label> <input {...collector(field)} />{' '}
            <span role="alert">{c.fieldErrors[`collector.${field}`]}</span>
          </p>
        ))}
      </section>

      <section aria-label="Carteira e rede">
        <select
          aria-label="Carteira"
          value={draft.walletId ?? ''}
          disabled={c.locked}
          onChange={(e) => c.updateDraft({ walletId: e.target.value || null })}
        >
          <option value="">Selecione a carteira</option>
          {c.wallets.data?.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label} ({w.networks.join(', ')})
            </option>
          ))}
        </select>{' '}
        <select
          aria-label="Rede"
          value={draft.network}
          disabled={c.locked}
          onChange={(e) => c.updateDraft({ network: e.target.value as Network })}
        >
          {NETWORKS.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>{' '}
        {c.isConnected ? (
          <button type="button" onClick={() => void c.disconnectWallet()} disabled={c.locked}>
            Desconectar carteira
          </button>
        ) : (
          <button type="button" onClick={() => void c.connectWallet()} disabled={!draft.walletId}>
            Conectar carteira
          </button>
        )}{' '}
        <span role="status">{c.isConnected ? 'Carteira conectada' : 'Carteira desconectada'}</span>
        <span role="alert"> {c.walletError?.message ?? c.fieldErrors.walletId}</span>
      </section>

      <section aria-label="Cupom">
        <input
          aria-label="Cupom"
          defaultValue={draft.couponCode ?? ''}
          disabled={c.locked}
          onBlur={(e) => c.updateDraft({ couponCode: e.target.value.trim() || null })}
        />{' '}
        <span role="alert">{quote.data?.couponError?.message}</span>
      </section>

      <section aria-label="Resumo" aria-live="polite">
        {quote.status === 'pending' && <p>Calculando…</p>}
        {quote.status === 'error' && <p role="alert">{quote.error.message}</p>}
        {quote.data && (
          <p>
            Subtotal {quote.data.subtotalEth} · Desconto {quote.data.discountEth} · Taxa{' '}
            {quote.data.networkFeeEth} · <strong>Total {quote.data.totalEth} ETH</strong>
            {quote.isFetching && ' · atualizando…'}
          </p>
        )}
        {c.quoteChanged && (
          <p role="alert">
            Os valores ou a disponibilidade mudaram desde a revisão.{' '}
            <button type="button" onClick={() => void c.acceptChanges()}>
              Revisar novos valores
            </button>
          </p>
        )}
      </section>

      <p>
        {!c.reviewed && (
          <button type="button" onClick={() => void c.review()} disabled={c.locked}>
            Revisar pedido
          </button>
        )}{' '}
        <button type="button" onClick={() => void c.confirm()} disabled={!c.canConfirm}>
          {c.confirming ? 'Enviando…' : 'Confirmar compra'}
        </button>
      </p>

      <section aria-label="Situação do pedido" aria-live="polite">
        {result?.type === 'changed' && (
          <p role="alert">Revise os valores atualizados e confirme novamente.</p>
        )}
        {result?.type === 'error' && <p role="alert">{result.error.message}</p>}
        {order.data?.status === 'pending' && <p>Pagamento pendente: aguardando a carteira…</p>}
        {order.data?.status === 'rejected' && (
          <p role="alert">
            Pagamento recusado: {order.data.rejectionReason}. Seus itens continuam no carrinho.{' '}
            <button type="button" onClick={c.retryAfterRejection}>
              Tentar novamente
            </button>
          </p>
        )}
      </section>
      <Link to="/cart">Voltar ao carrinho</Link>
    </>
  )
}

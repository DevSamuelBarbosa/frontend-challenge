import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Quote, QuoteIssue } from '@/api/contracts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PriceBreakdown } from '@/features/cart/components/price-breakdown'
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { formatEth, shortAddress } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCart } from '@/queries/cart'
import { PROVIDER_LABELS } from '../form-schema'
import type { Checkout, ReviewPhase } from '../use-checkout'

const primary =
  'h-10 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60'
const secondary =
  'h-10 rounded-md border border-primary px-5 text-sm transition-colors hover:bg-primary/10'

/** Etapas em que o pedido está em andamento e o diálogo não pode ser fechado */
const BUSY: ReviewPhase[] = ['sending', 'pending']

/**
 * Revisão antes do envio. Qualquer mudança de valores ou de disponibilidade exige uma nova
 * confirmação, e o mesmo diálogo acompanha o pedido pendente, recusado ou com erro.
 */
export function ReviewDialog({ checkout }: { checkout: Checkout }) {
  const { review, form, selectedWallet, network, deliverToOther } = checkout
  const cart = useCart()
  const busy = BUSY.includes(review.phase)
  // Na mudança, mostra os valores atuais; nas demais etapas, os que o usuário revisou
  const shown: Quote | null =
    (review.phase === 'changed' || review.phase === 'blocked') && checkout.quote.data
      ? checkout.quote.data
      : review.quote
  const collector = form.getValues('collector')
  const names = new Map(cart.items.map((item) => [item.id, item.name]))

  return (
    <Dialog open={review.open} onOpenChange={(open) => !open && review.onClose()}>
      <DialogContent
        showCloseButton={!busy}
        onEscapeKeyDown={(e) => busy && e.preventDefault()}
        // A revisão abre por estado, sem um gatilho do diálogo: o foco volta, de forma
        // explícita, ao botão que a abriu (senão cai no início da página)
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          document.querySelector<HTMLElement>('[data-checkout-confirm]')?.focus()
        }}
        onInteractOutside={(e) => e.preventDefault()}
        className="max-h-[90dvh] gap-5 overflow-y-auto border-input bg-card sm:max-w-xl"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl">{TITLES[review.phase]}</DialogTitle>
          <DialogDescription>{DESCRIPTIONS[review.phase]}</DialogDescription>
        </DialogHeader>

        <div aria-live="polite" className="flex flex-col gap-4">
          {review.phase === 'changed' && (
            <Notice>
              Os valores ou a disponibilidade mudaram desde a sua revisão.
              <IssueList issues={shown?.issues ?? []} names={names} />
            </Notice>
          )}
          {review.phase === 'blocked' && (
            <Notice>
              Alguns itens não estão mais disponíveis.
              <IssueList issues={shown?.issues ?? []} names={names} />
            </Notice>
          )}
          {review.phase === 'rejected' && (
            <Notice>
              {review.order?.rejectionReason ?? 'A carteira recusou o pagamento.'} Seus itens
              continuam no carrinho.
            </Notice>
          )}
          {review.phase === 'error' && review.error && <Notice>{review.error.message}</Notice>}
          {(review.phase === 'sending' || review.phase === 'pending') && (
            <p role="status" className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
              {review.phase === 'sending'
                ? 'Enviando o pedido…'
                : 'Pedido criado. Aguardando a confirmação da carteira…'}
            </p>
          )}
        </div>

        {shown && review.phase !== 'rejected' && (
          <>
            <ul className="flex flex-col gap-2 text-sm">
              {shown.lines.map((line) => (
                <li key={line.cartItemId} className="flex items-baseline justify-between gap-4">
                  <span>
                    {line.name}{' '}
                    <span className="text-muted-foreground">
                      ({line.editionName}) · {line.quantity} × {formatEth(line.unitPriceEth)}
                    </span>
                  </span>
                  <span className="font-bold whitespace-nowrap text-highlight">
                    {formatEth(line.lineTotalEth)}
                  </span>
                </li>
              ))}
            </ul>
            <PriceBreakdown quote={shown} className="mt-0" />
          </>
        )}

        {review.phase !== 'rejected' && (
          <dl className="border-divider grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t pt-4 text-sm">
            <dt className="text-muted-foreground">Carteira</dt>
            <dd>
              {selectedWallet
                ? `${selectedWallet.label} (${PROVIDER_LABELS[selectedWallet.provider]}) · ${shortAddress(selectedWallet.address)}`
                : '—'}
            </dd>
            <dt className="text-muted-foreground">Rede</dt>
            <dd>{NETWORK_LABELS[network]}</dd>
            <dt className="text-muted-foreground">Entrega</dt>
            <dd className="break-all">
              {deliverToOther && collector.secondaryWallet
                ? collector.secondaryWallet
                : 'Na própria carteira'}
            </dd>
            <dt className="text-muted-foreground">Colecionador</dt>
            <dd>
              {collector.displayName} · {collector.email}
            </dd>
          </dl>
        )}

        <DialogFooter className="gap-2 sm:justify-end">
          {review.phase === 'review' && (
            <>
              <button type="button" className={secondary} onClick={review.onClose}>
                Voltar e editar
              </button>
              <button
                type="button"
                className={primary}
                onClick={review.onConfirm}
                disabled={review.confirming}
              >
                Confirmar e enviar
              </button>
            </>
          )}
          {review.phase === 'changed' && (
            <>
              <button type="button" className={secondary} onClick={review.onClose}>
                Voltar e editar
              </button>
              <button type="button" className={primary} onClick={review.onAcceptChanges}>
                Revisar novos valores
              </button>
            </>
          )}
          {review.phase === 'blocked' && (
            <Link to="/cart" className={cn(primary, 'grid place-items-center')}>
              Voltar ao carrinho
            </Link>
          )}
          {review.phase === 'error' && (
            <>
              <button type="button" className={secondary} onClick={review.onClose}>
                Fechar
              </button>
              <button type="button" className={primary} onClick={review.onConfirm}>
                Tentar novamente
              </button>
            </>
          )}
          {review.phase === 'rejected' && (
            <button type="button" className={primary} onClick={review.onRetryAfterRejection}>
              Tentar novamente
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const TITLES: Record<ReviewPhase, string> = {
  review: 'Revise seu pedido',
  changed: 'Os valores mudaram',
  blocked: 'Itens indisponíveis',
  sending: 'Enviando pedido',
  pending: 'Pagamento pendente',
  rejected: 'Pagamento recusado',
  error: 'Não foi possível enviar',
}

const DESCRIPTIONS: Record<ReviewPhase, string> = {
  review: 'Confira os itens, os valores e os dados antes de enviar.',
  changed: 'Confirme os novos valores para continuar.',
  blocked: 'Volte ao carrinho para ajustar ou remover esses itens.',
  sending: 'Não feche esta janela.',
  pending: 'Você pode recarregar a página: o pedido continua sendo acompanhado.',
  rejected: 'O pedido não foi concluído e nada foi cobrado.',
  error: 'Seus dados foram mantidos. Tente novamente.',
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="border border-primary bg-band px-4 py-3 text-sm">
      {children}
    </div>
  )
}

function IssueList({ issues, names }: { issues: QuoteIssue[]; names: Map<string, string> }) {
  if (issues.length === 0) return null
  return (
    <ul className="mt-2 list-disc pl-5">
      {issues.map((issue, i) => {
        const name = names.get(issue.cartItemId) ?? 'Item'
        switch (issue.type) {
          case 'price_changed':
            return (
              <li key={i}>
                {name}: o preço mudou de {formatEth(issue.previousPriceEth)} para{' '}
                {formatEth(issue.currentPriceEth)}.
              </li>
            )
          case 'quantity_reduced':
            return (
              <li key={i}>
                {name}: restam {issue.available} (você pediu {issue.requested}).
              </li>
            )
          case 'sold_out':
            return <li key={i}>{name}: esgotado.</li>
        }
      })}
    </ul>
  )
}

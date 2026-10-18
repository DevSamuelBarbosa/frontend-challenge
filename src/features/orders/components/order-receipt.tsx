import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import type { Network, Order } from '@/api/contracts'
import { NftImage } from '@/components/nft-image'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { PROVIDER_LABELS } from '@/features/checkout/form-schema'
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { formatEth, formatReceiptDate, shortHash } from '@/lib/format'
import { ThankYouIcon } from './thank-you-icon'

const EXPLORER_LABELS: Record<Network, string> = {
  ethereum: 'Etherscan',
  polygon: 'Polygonscan',
  solana: 'Solscan',
}

/**
 * Recibo do pedido confirmado. Todos os dados vêm do snapshot gravado no pedido
 * (itens, valores, carteira e colecionador): mudanças posteriores no catálogo não o alteram.
 */
export function OrderReceipt({ order }: { order: Order }) {
  const hash = order.transaction?.hash ?? ''
  const explorer = EXPLORER_LABELS[order.network]
  const delivered = order.collector.secondaryWallet

  async function copyHash() {
    try {
      await navigator.clipboard.writeText(hash)
      toast.success('ID da transação copiado')
    } catch {
      toast.error('Não foi possível copiar. Selecione e copie o ID manualmente.')
    }
  }

  return (
    <>
      <header className="px-6 pt-8 pb-5 text-center">
        <ThankYouIcon className="mx-auto h-[5.125rem] w-16 text-primary" />
        <DialogTitle className="mt-4 text-base font-bold text-muted-foreground">
          Seus NFTs agora estão na sua carteira
        </DialogTitle>
        <DialogDescription className="sr-only">
          Recibo do pedido {order.id}, confirmado em {formatReceiptDate(order.updatedAt)}.
        </DialogDescription>
      </header>

      <dl className="grid grid-cols-2 gap-y-4 border-y border-primary px-6 py-3.5 text-sm sm:grid-cols-[1.35fr_1.15fr_1fr_0.9fr] sm:gap-y-0">
        <div className="sm:border-r sm:border-primary sm:pr-4">
          <dt className="font-bold">ID da transação</dt>
          <dd className="flex items-center gap-1.5 text-muted-foreground">
            <abbr title={hash} className="no-underline">
              {shortHash(hash)}
            </abbr>
            <button
              type="button"
              onClick={() => void copyHash()}
              aria-label="Copiar ID da transação"
              className="rounded p-0.5 hover:text-highlight"
            >
              <Copy className="size-3.5" aria-hidden />
            </button>
          </dd>
        </div>
        <div className="sm:border-r sm:border-primary sm:px-4">
          <dt className="text-muted-foreground">Data</dt>
          <dd className="whitespace-nowrap text-muted-foreground">
            <time dateTime={order.updatedAt}>{formatReceiptDate(order.updatedAt)}</time>
          </dd>
        </div>
        <div className="sm:border-r sm:border-primary sm:px-4">
          <dt className="text-muted-foreground">Total</dt>
          <dd className="text-muted-foreground">{formatEth(order.totalEth)}</dd>
        </div>
        <div className="sm:pl-4">
          <dt className="font-bold">Carteira</dt>
          <dd className="text-muted-foreground">{PROVIDER_LABELS[order.wallet.provider]}</dd>
        </div>
      </dl>

      <section aria-labelledby="receipt-details" className="px-6 pt-5 pb-6">
        <h2 id="receipt-details" className="text-[0.9375rem] font-bold">
          Detalhes da transação
        </h2>

        <table className="mt-2 w-full border-separate border-spacing-y-3">
          <caption className="sr-only">Itens do pedido {order.id}</caption>
          <thead>
            <tr className="[&>th]:border-divider [&>th]:border-b">
              <th scope="col" className="pb-1.5 text-left text-[0.9375rem] font-bold">
                NFTs
              </th>
              <th scope="col" className="pb-1.5 text-center text-[0.9375rem] font-bold">
                Edições<span className="sr-only"> (quantidade)</span>
              </th>
              <th scope="col" className="pb-1.5 text-right text-[0.9375rem] font-bold">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.cartItemId}>
                <td className="w-full max-w-0">
                  <div className="flex items-center gap-3">
                    <NftImage
                      image={line.image}
                      sizes="65px"
                      decorative
                      className="size-12 shrink-0 rounded-md sm:size-[4.0625rem]"
                    />
                    <div className="min-w-0">
                      <p className="font-bold break-words sm:truncate">{line.name}</p>
                      <p className="text-sm text-muted-foreground">ID do token: {line.tokenId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 text-center text-sm whitespace-nowrap text-muted-foreground">
                  (x {line.quantity})
                </td>
                <td className="text-right font-bold whitespace-nowrap text-highlight sm:text-lg">
                  {formatEth(line.lineTotalEth)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="border-divider mt-1 flex flex-col gap-1.5 border-b pb-3 text-[0.9375rem]">
          {Number(order.discountEth) > 0 && (
            <>
              <Row label="Subtotal" value={formatEth(order.subtotalEth)} />
              <Row
                label={order.coupon ? `Desconto (${order.coupon.code})` : 'Desconto'}
                value={`(-) ${formatEth(order.discountEth, { unit: false })}`}
              />
            </>
          )}
          <Row label="Taxa de rede" value={formatEth(order.networkFeeEth)} />
          <div className="flex items-baseline justify-between gap-4 font-bold">
            <dt>Total</dt>
            <dd className="text-lg text-highlight">{formatEth(order.totalEth)}</dd>
          </div>
        </dl>

        <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground">
          Transação confirmada na {NETWORK_LABELS[order.network]}. A propriedade foi transferida
          para sua carteira conectada e registrada na rede.
          {delivered && (
            <>
              {' '}
              Entregue em <strong className="font-bold break-all">{delivered}</strong>.
            </>
          )}
        </p>

        <div className="mt-5 flex flex-col items-center gap-2">
          <a
            href={order.transaction?.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-11 place-items-center rounded-md bg-primary px-6 font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ver no {explorer}
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
          <p className="text-xs text-muted-foreground">
            Referência simulada: o link de exploração é fictício.
          </p>
        </div>
      </section>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

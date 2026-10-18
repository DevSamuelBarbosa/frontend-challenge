import { Link } from '@tanstack/react-router'
import { Controller } from 'react-hook-form'
import { networkSchema } from '@/api/contracts'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { shortAddress } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PROVIDER_LABELS } from '../form-schema'
import type { Checkout } from '../use-checkout'

/**
 * Carteiras cadastradas, como cartões de seleção, com o estado da conexão simulada:
 * conectar, recusa da carteira e desconectar.
 */
export function WalletPicker({ checkout, title }: { checkout: Checkout; title: string }) {
  const { wallets, locked, walletId, isConnected, isConnecting, walletError } = checkout
  const headingId = `${title}-heading`.replace(/\s/g, '-')

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={headingId} className="text-lg font-bold">
          {title}
        </h2>
        <Link to="/wallets" className="text-sm text-highlight hover:underline">
          Gerenciar carteiras
        </Link>
      </div>

      {wallets.isPending ? (
        <div
          aria-busy="true"
          aria-label="Carregando carteiras"
          className="mt-4 flex flex-col gap-3"
        >
          <Skeleton className="h-[4.5rem] w-full" />
          <Skeleton className="h-[4.5rem] w-full" />
        </div>
      ) : wallets.isError ? (
        <div role="alert" className="mt-4 text-sm">
          <p>Não foi possível carregar suas carteiras.</p>
          <button
            type="button"
            onClick={() => void wallets.refetch()}
            className="mt-2 font-bold text-highlight underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </div>
      ) : wallets.data.length === 0 ? (
        <div className="mt-4 border border-input p-4 text-sm">
          <p>Você ainda não cadastrou nenhuma carteira.</p>
          <Link to="/wallets" className="mt-2 inline-block font-bold text-highlight underline">
            Cadastrar carteira
          </Link>
        </div>
      ) : (
        <Controller
          control={checkout.form.control}
          name="walletId"
          render={({ field }) => (
            <RadioGroup
              aria-label="Carteira"
              value={field.value}
              disabled={locked}
              onValueChange={(id) => {
                const wallet = wallets.data.find((w) => w.id === id)
                if (wallet) checkout.selectWallet(wallet)
              }}
              className="mt-4 gap-3"
            >
              {wallets.data.map((wallet) => {
                const selected = wallet.id === field.value
                return (
                  <label
                    key={wallet.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 transition-colors max-md:rounded-2xl max-md:bg-card md:border',
                      selected
                        ? 'outline outline-1 outline-foreground md:border-foreground md:outline-none'
                        : 'md:border-input md:hover:border-primary',
                      locked && 'opacity-60',
                    )}
                  >
                    <RadioGroupItem value={wallet.id} className="mt-0.5" />
                    <span className="min-w-0">
                      <span className="block font-bold">
                        {wallet.label}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {PROVIDER_LABELS[wallet.provider]}
                          {wallet.role === 'primary' ? ' · principal' : ' · secundária'}
                        </span>
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        <abbr title={wallet.address} className="no-underline">
                          {shortAddress(wallet.address)}
                        </abbr>{' '}
                        · {wallet.networks.map((n) => NETWORK_LABELS[n]).join(', ')}
                      </span>
                    </span>
                  </label>
                )
              })}
            </RadioGroup>
          )}
        />
      )}

      {walletId && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p role="status" className={isConnected ? 'text-highlight' : 'text-muted-foreground'}>
            {isConnecting
              ? 'Conectando carteira…'
              : isConnected
                ? `Carteira conectada na ${NETWORK_LABELS[checkout.network]}`
                : 'Carteira desconectada'}
          </p>
          {isConnected ? (
            <button
              type="button"
              onClick={() => void checkout.disconnect()}
              disabled={locked}
              className="font-bold text-highlight underline underline-offset-2 disabled:opacity-50"
            >
              Desconectar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void checkout.connect()}
              disabled={locked || isConnecting}
              className="font-bold text-highlight underline underline-offset-2 disabled:opacity-50"
            >
              Conectar carteira
            </button>
          )}
        </div>
      )}

      {walletError && (
        <p role="alert" className="mt-3 text-sm text-required">
          {walletError.message}{' '}
          {walletError.details.reason === 'wallet_rejected' && (
            <button
              type="button"
              onClick={() => void checkout.connect()}
              className="font-bold underline underline-offset-2"
            >
              Tentar novamente
            </button>
          )}
        </p>
      )}
    </section>
  )
}

/** Escolha da rede entre as que a carteira selecionada suporta (celular) */
export function NetworkPicker({ checkout }: { checkout: Checkout }) {
  const { form, locked, selectedWallet } = checkout
  const options = networkSchema.options.filter(
    (n) => !selectedWallet || selectedWallet.networks.includes(n),
  )
  return (
    <section aria-labelledby="network-heading">
      <h2 id="network-heading" className="text-lg font-bold">
        Carteira e rede
      </h2>
      <Controller
        control={form.control}
        name="network"
        render={({ field }) => (
          <RadioGroup
            aria-label="Rede"
            value={field.value}
            onValueChange={field.onChange}
            disabled={locked}
            className="mt-4 gap-3"
          >
            {options.map((network) => (
              <label
                key={network}
                className={cn(
                  'flex items-center gap-3 rounded-2xl bg-card px-4 py-3',
                  field.value === network && 'outline outline-1 outline-foreground',
                )}
              >
                <RadioGroupItem value={network} />
                {NETWORK_LABELS[network]}
              </label>
            ))}
          </RadioGroup>
        )}
      />
    </section>
  )
}

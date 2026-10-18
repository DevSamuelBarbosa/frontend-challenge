import { Controller } from 'react-hook-form'
import { FormField } from '@/components/form-field'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { networkSchema } from '@/api/contracts'
import { PROVIDER_LABELS } from '../form-schema'
import type { Checkout } from '../use-checkout'
import { cn } from '@/lib/utils'

const NOTE_MAX = 280

/**
 * Seção "Perfil do colecionador". No desktop reproduz o formulário do design, inclusive
 * rede, endereço e tipo de carteira; no celular esses três campos viram a escolha de
 * carteira e rede da própria tela, e o formulário traz só os dados do colecionador.
 */
export function CollectorForm({ checkout }: { checkout: Checkout }) {
  const { form, locked, selectedWallet, wallets, deliverToOther } = checkout
  const {
    register,
    control,
    formState: { errors },
  } = form
  const collectorErrors = errors.collector
  const desktopOnly = 'max-md:hidden'

  return (
    <section aria-labelledby="collector-title">
      <h2 id="collector-title" className="text-lg font-bold">
        Perfil do colecionador
      </h2>

      <div className="mt-4 grid gap-x-8 gap-y-5 md:grid-cols-2">
        <FormField label="Nome de exibição" required error={collectorErrors?.displayName?.message}>
          {(c) => (
            <Input
              {...c}
              autoComplete="name"
              disabled={locked}
              {...register('collector.displayName')}
            />
          )}
        </FormField>

        <FormField label="Nome de usuário" required error={collectorErrors?.username?.message}>
          {(c) => (
            <Input
              {...c}
              autoComplete="username"
              autoCapitalize="none"
              disabled={locked}
              {...register('collector.username')}
            />
          )}
        </FormField>

        <FormField label="Rede" required error={errors.network?.message} className={desktopOnly}>
          {(c) => (
            <Controller
              control={control}
              name="network"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={locked}
                >
                  <SelectTrigger {...c} className="w-full" onBlur={field.onBlur}>
                    <SelectValue placeholder="Selecione uma rede" />
                  </SelectTrigger>
                  <SelectContent>
                    {networkSchema.options
                      .filter((n) => !selectedWallet || selectedWallet.networks.includes(n))
                      .map((n) => (
                        <SelectItem key={n} value={n}>
                          {NETWORK_LABELS[n]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </FormField>

        <FormField label="Nome do perfil" required error={collectorErrors?.profileName?.message}>
          {(c) => <Input {...c} disabled={locked} {...register('collector.profileName')} />}
        </FormField>

        <FormField
          label="Endereço da carteira"
          required
          hint="Vem da carteira cadastrada escolhida."
          className={desktopOnly}
        >
          {(c) => (
            <Input
              {...c}
              readOnly
              value={selectedWallet?.address ?? ''}
              placeholder="Endereço 0x da carteira"
            />
          )}
        </FormField>

        <FormField
          label="ENS ou carteira secundária (opcional)"
          error={collectorErrors?.secondaryWallet?.message}
          className={cn(!deliverToOther && 'max-md:hidden')}
        >
          {(c) => (
            <Input
              {...c}
              disabled={locked || !deliverToOther}
              placeholder="ENS ou carteira secundária (opcional)"
              autoComplete="off"
              {...register('collector.secondaryWallet')}
            />
          )}
        </FormField>

        <FormField
          label="Tipo de carteira"
          required
          error={errors.walletId?.message}
          className={desktopOnly}
        >
          {(c) => (
            <Controller
              control={control}
              name="walletId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(id) => {
                    const wallet = wallets.data?.find((w) => w.id === id)
                    if (wallet) checkout.selectWallet(wallet)
                  }}
                  disabled={locked || !wallets.data?.length}
                >
                  <SelectTrigger {...c} className="w-full" onBlur={field.onBlur}>
                    <SelectValue placeholder="Selecione uma carteira" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.data?.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.label} ({PROVIDER_LABELS[w.provider]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </FormField>

        <FormField
          label="Código de indicação"
          required
          error={collectorErrors?.referralCode?.message}
          hint="Ex.: KURIO2026"
        >
          {(c) => (
            <Input
              {...c}
              autoComplete="off"
              autoCapitalize="characters"
              disabled={locked}
              {...register('collector.referralCode')}
            />
          )}
        </FormField>

        <FormField label="E-mail" required error={collectorErrors?.email?.message}>
          {(c) => (
            <Input
              {...c}
              type="email"
              autoComplete="email"
              disabled={locked}
              {...register('collector.email')}
            />
          )}
        </FormField>

        <EnsField checkout={checkout} error={collectorErrors?.ensName?.message} />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Controller
          control={control}
          name="deliverToOther"
          render={({ field }) => (
            <Checkbox
              id="deliver-to-other"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              disabled={locked}
            />
          )}
        />
        <label htmlFor="deliver-to-other" className="text-[0.9375rem]">
          Usar outra carteira?
          <span className="sr-only">
            {' '}
            Os NFTs serão enviados para a carteira ou o ENS informado.
          </span>
        </label>
      </div>

      <NoteField checkout={checkout} />
    </section>
  )
}

/** Nome ENS: o sufixo `.eth` é fixo; o campo guarda o nome completo, como a API espera */
function EnsField({ checkout, error }: { checkout: Checkout; error: string | undefined }) {
  const { form, locked } = checkout
  return (
    <FormField label="Nome ENS" required error={error}>
      {(c) => (
        <Controller
          control={form.control}
          name="collector.ensName"
          render={({ field }) => (
            <div className="flex gap-2">
              <Select value=".eth" disabled={locked}>
                <SelectTrigger aria-label="Sufixo do nome ENS" className="w-24 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=".eth">.eth</SelectItem>
                </SelectContent>
              </Select>
              <Input
                {...c}
                ref={field.ref}
                name={field.name}
                value={(field.value ?? '').replace(/\.eth$/i, '')}
                onChange={(e) => {
                  const base = e.target.value.trim().replace(/\.eth$/i, '')
                  field.onChange(base ? `${base}.eth` : '')
                }}
                onBlur={field.onBlur}
                disabled={locked}
                autoComplete="off"
                autoCapitalize="none"
                placeholder="seunome"
              />
            </div>
          )}
        />
      )}
    </FormField>
  )
}

function NoteField({ checkout }: { checkout: Checkout }) {
  const { form, locked } = checkout
  return (
    <div className="mt-6 md:max-w-[calc(50%-1rem)]">
      <FormField
        label="Observação do colecionador (opcional)"
        error={form.formState.errors.collector?.note?.message}
        hint={`Até ${NOTE_MAX} caracteres.`}
      >
        {(c) => (
          <Textarea
            {...c}
            maxLength={NOTE_MAX + 20}
            disabled={locked}
            {...form.register('collector.note')}
          />
        )}
      </FormField>
    </div>
  )
}

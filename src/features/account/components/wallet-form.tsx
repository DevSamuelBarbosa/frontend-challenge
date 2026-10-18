import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, type FieldPath, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  type CreateWalletRequest,
  createWalletRequestSchema,
  type Network,
  networkSchema,
  type Profile,
  walletProviderSchema,
  type Wallet,
  type WalletRole,
} from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { EnsNameInput } from '@/components/ens-name-input'
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
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { PROVIDER_LABELS } from '@/features/checkout/form-schema'
import { useSingleFlight } from '@/hooks/use-single-flight'
import { createWalletMutationOptions, updateWalletMutationOptions } from '@/queries/wallets'

/** Sem `role`: quem escolhe a função é a seção da tela */
const walletFormSchema = createWalletRequestSchema.omit({ role: true })
type WalletFormInput = Omit<CreateWalletRequest, 'role'>

const FIELD_ORDER: FieldPath<WalletFormInput>[] = [
  'label',
  'networks',
  'profileName',
  'address',
  'secondaryTarget',
  'provider',
  'referralCode',
]

interface WalletFormProps {
  role: WalletRole
  /** Carteira a editar. Sem ela, o formulário cadastra uma nova. */
  wallet?: Wallet
  /** Dados do colecionador, mostrados só para leitura na carteira principal */
  profile: Profile
  /** Valor sugerido ao cadastrar: o nome do perfil e o código de indicação mais usados */
  defaults?: Partial<WalletFormInput>
  onSaved?: () => void
}

const readOnly = 'bg-card/40'

export function WalletForm({ role, wallet, profile, defaults, onSaved }: WalletFormProps) {
  const queryClient = useQueryClient()
  const create = useMutation(createWalletMutationOptions(queryClient, profile.id))
  const update = useMutation(updateWalletMutationOptions(queryClient, profile.id))
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<WalletFormInput>({
    resolver: zodResolver(walletFormSchema),
    defaultValues: {
      label: wallet?.label ?? defaults?.label ?? '',
      provider: wallet?.provider ?? defaults?.provider,
      address: wallet?.address ?? '',
      networks: wallet?.networks ?? [],
      profileName: wallet?.profileName ?? defaults?.profileName ?? '',
      referralCode: wallet?.referralCode ?? defaults?.referralCode ?? '',
      secondaryTarget: wallet?.secondaryTarget ?? '',
    },
    // Erros só depois da primeira tentativa de envio (ver o comentário em auth-form.tsx)
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { errors, isSubmitting } = form.formState

  const save = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const saved = wallet
        ? await update.mutateAsync({ walletId: wallet.id, changes: values })
        : await create.mutateAsync({ ...values, role })
      form.reset({ ...values, networks: saved.networks })
      toast.success(wallet ? 'Carteira atualizada' : 'Carteira cadastrada')
      onSaved?.()
    } catch (error) {
      if (isApiError(error)) {
        const names = FIELD_ORDER.filter((name) => name in error.fields)
        for (const name of names) form.setError(name, { message: error.fields[name] })
        if (names.length > 0) return form.setFocus(names[0])
        const transient = ['network_error', 'timeout', 'server_error'].includes(error.code)
        return setFormError(
          transient ? `${error.message} Seus dados foram mantidos.` : error.message,
        )
      }
      setFormError('Não foi possível salvar a carteira. Tente novamente.')
    }
  })
  const onSubmit = useSingleFlight(save)

  const readOnlyHint = 'Edite em Dados do perfil'
  const isPrimary = role === 'primary'

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label={isPrimary ? 'Carteira principal' : 'Carteira secundária'}
      className="flex flex-col"
    >
      <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
        {isPrimary && (
          <FormField label="Nome de exibição" required hint={readOnlyHint}>
            {(c) => <Input {...c} value={profile.name} readOnly className={readOnly} />}
          </FormField>
        )}
        <FormField label="Apelido da carteira" required error={errors.label?.message}>
          {(c) => <Input {...c} {...form.register('label')} maxLength={40} autoComplete="off" />}
        </FormField>

        <FormField label="Rede" required error={errors.networks?.message}>
          {(c) => (
            <Controller
              control={form.control}
              name="networks"
              render={({ field }) => (
                <div
                  role="group"
                  aria-label="Rede"
                  id={c.id}
                  aria-invalid={c['aria-invalid']}
                  aria-describedby={c['aria-describedby']}
                  className="flex h-10 items-center gap-5"
                >
                  {networkSchema.options.map((network: Network) => {
                    const checked = field.value.includes(network)
                    return (
                      <label key={network} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) =>
                            field.onChange(
                              next
                                ? [...field.value, network]
                                : field.value.filter((n) => n !== network),
                            )
                          }
                        />
                        {NETWORK_LABELS[network]}
                      </label>
                    )
                  })}
                </div>
              )}
            />
          )}
        </FormField>
        <FormField label="Nome do perfil" required error={errors.profileName?.message}>
          {(c) => <Input {...c} {...form.register('profileName')} autoComplete="off" />}
        </FormField>

        <FormField label="Endereço da carteira" required error={errors.address?.message}>
          {(c) => (
            <Input
              {...c}
              {...form.register('address')}
              placeholder="Endereço 0x da carteira"
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </FormField>
        <FormField
          label="ENS ou carteira secundária (opcional)"
          hideLabel
          error={errors.secondaryTarget?.message}
          className="md:self-end"
        >
          {(c) => (
            <Input
              {...c}
              {...form.register('secondaryTarget')}
              placeholder="ENS ou carteira secundária (opcional)"
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </FormField>

        <FormField label="Tipo de carteira" required error={errors.provider?.message}>
          {(c) => (
            <Controller
              control={form.control}
              name="provider"
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger
                    id={c.id}
                    aria-invalid={c['aria-invalid']}
                    aria-describedby={c['aria-describedby']}
                    aria-required
                    className="w-full"
                  >
                    <SelectValue placeholder="Selecione uma carteira" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {walletProviderSchema.options.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {PROVIDER_LABELS[provider]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </FormField>
        <FormField label="Código de indicação" required error={errors.referralCode?.message}>
          {(c) => <Input {...c} {...form.register('referralCode')} autoComplete="off" />}
        </FormField>

        {isPrimary && (
          <>
            <FormField label="E-mail" required hint={readOnlyHint}>
              {(c) => <Input {...c} value={profile.email} readOnly className={readOnly} />}
            </FormField>
            <FormField label="Nome ENS" required hint={readOnlyHint}>
              {(c) => (
                <EnsNameInput
                  id={c.id}
                  value={profile.ensName}
                  onChange={() => undefined}
                  disabled
                  required
                />
              )}
            </FormField>
          </>
        )}
      </div>

      {formError && (
        <p role="alert" className="mt-6 border border-required px-3 py-2 text-sm text-required">
          {formError}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-8 h-10 self-start rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 max-md:w-full"
      >
        {isSubmitting ? 'Salvando…' : 'Salvar carteira'}
      </button>
    </form>
  )
}

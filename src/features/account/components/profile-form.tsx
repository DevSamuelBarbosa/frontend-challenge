import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { type FieldPath, Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { Profile, Wallet } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { EnsNameInput } from '@/components/ens-name-input'
import { FormField } from '@/components/form-field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { useSingleFlight } from '@/hooks/use-single-flight'
import { changePasswordMutationOptions, updateProfileMutationOptions } from '@/queries/profile'
import { updateWalletMutationOptions } from '@/queries/wallets'
import { type ProfileFormInput, profileFormSchema } from '../schemas'
import { AvatarField } from './avatar-field'

const EMPTY_PASSWORDS = { currentPassword: '', newPassword: '', confirmPassword: '' }

const FIELD_ORDER: FieldPath<ProfileFormInput>[] = [
  'name',
  'username',
  'email',
  'ensName',
  'walletLabel',
  'currentPassword',
  'newPassword',
  'confirmPassword',
]

/** Mensagens da API por campo do formulário (a API não conhece o apelido da carteira) */
function applyFieldErrors(
  error: unknown,
  setError: (name: FieldPath<ProfileFormInput>, error: { message: string }) => void,
) {
  if (!isApiError(error)) return null
  const names = Object.keys(error.fields).filter((name): name is FieldPath<ProfileFormInput> =>
    FIELD_ORDER.includes(name as FieldPath<ProfileFormInput>),
  )
  for (const name of names) setError(name, { message: error.fields[name] })
  return FIELD_ORDER.find((name) => names.includes(name)) ?? null
}

interface ProfileFormProps {
  profile: Profile
  /** Carteira principal, cujo apelido é editado aqui */
  primaryWallet: Wallet | undefined
}

export function ProfileForm({ profile, primaryWallet }: ProfileFormProps) {
  const queryClient = useQueryClient()
  const updateProfile = useMutation(updateProfileMutationOptions(queryClient, profile.id))
  const updateWallet = useMutation(updateWalletMutationOptions(queryClient, profile.id))
  const changePassword = useMutation(changePasswordMutationOptions())
  const [formError, setFormError] = useState<string | null>(null)

  const schema = useMemo(() => profileFormSchema(Boolean(primaryWallet)), [primaryWallet])
  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: profile.name,
      username: profile.username,
      email: profile.email,
      ensName: profile.ensName,
      walletLabel: primaryWallet?.label ?? '',
      ...EMPTY_PASSWORDS,
    },
    // Erros só depois da primeira tentativa de envio (ver o comentário em auth-form.tsx)
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { errors, isSubmitting } = form.formState

  const save = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const saved = await updateProfile.mutateAsync({
        name: values.name,
        username: values.username,
        email: values.email,
        ensName: values.ensName,
      })
      if (primaryWallet && values.walletLabel !== primaryWallet.label) {
        await updateWallet.mutateAsync({
          walletId: primaryWallet.id,
          changes: { label: values.walletLabel },
        })
      }
      // O perfil já foi salvo: se a senha falhar, o que foi digitado continua na tela
      form.reset({ ...values, ensName: saved.ensName }, { keepErrors: true })
      if (values.currentPassword) {
        await changePassword.mutateAsync({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        })
        form.reset({ ...values, ensName: saved.ensName, ...EMPTY_PASSWORDS })
        toast.success('Perfil e senha atualizados')
      } else {
        toast.success('Perfil atualizado')
      }
    } catch (error) {
      const first = applyFieldErrors(error, form.setError)
      if (first) return form.setFocus(first)
      const transient =
        isApiError(error) && ['network_error', 'timeout', 'server_error'].includes(error.code)
      const message = isApiError(error)
        ? error.message
        : 'Não foi possível salvar. Tente novamente.'
      setFormError(transient ? `${message} Seus dados foram mantidos.` : message)
    }
  })
  // Cliques seguidos em "Salvar" não enviam mais de uma vez
  const onSubmit = useSingleFlight(save)

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Dados do perfil" className="flex flex-col">
      <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
        <FormField label="Nome de exibição" required error={errors.name?.message}>
          {(c) => <Input {...c} {...form.register('name')} autoComplete="name" />}
        </FormField>
        <FormField label="Nome de usuário" required error={errors.username?.message}>
          {(c) => (
            <Input
              {...c}
              {...form.register('username')}
              autoComplete="username"
              autoCapitalize="none"
            />
          )}
        </FormField>
        <FormField label="E-mail" required error={errors.email?.message}>
          {(c) => <Input {...c} {...form.register('email')} type="email" autoComplete="email" />}
        </FormField>
        <FormField label="Nome ENS" required error={errors.ensName?.message}>
          {(c) => (
            <Controller
              control={form.control}
              name="ensName"
              render={({ field }) => (
                <EnsNameInput
                  id={c.id}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={c['aria-invalid']}
                  describedBy={c['aria-describedby']}
                  required
                />
              )}
            />
          )}
        </FormField>
        <FormField
          label="Apelido da carteira"
          required={Boolean(primaryWallet)}
          error={errors.walletLabel?.message}
          hint={primaryWallet ? undefined : 'Cadastre sua carteira principal em Carteiras.'}
        >
          {(c) => (
            <Input
              {...c}
              {...form.register('walletLabel')}
              disabled={!primaryWallet}
              maxLength={40}
            />
          )}
        </FormField>
        <AvatarField profile={profile} />
      </div>

      <h2 className="mt-10 text-lg font-bold">Alterar senha</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Preencha só se quiser trocar a senha. As outras sessões serão encerradas.
      </p>
      <div className="mt-5 grid gap-6 md:max-w-[calc(50%-0.875rem)]">
        <FormField label="Senha atual" error={errors.currentPassword?.message}>
          {(c) => (
            <PasswordInput
              {...c}
              {...form.register('currentPassword')}
              autoComplete="current-password"
            />
          )}
        </FormField>
        <FormField label="Nova senha" error={errors.newPassword?.message}>
          {(c) => (
            <PasswordInput {...c} {...form.register('newPassword')} autoComplete="new-password" />
          )}
        </FormField>
        <FormField label="Confirmar nova senha" error={errors.confirmPassword?.message}>
          {(c) => (
            <PasswordInput
              {...c}
              {...form.register('confirmPassword')}
              autoComplete="new-password"
            />
          )}
        </FormField>
      </div>

      {formError && (
        <p role="alert" className="mt-6 border border-required px-3 py-2 text-sm text-required">
          {formError}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-8 h-10 self-start rounded-md bg-primary px-8 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 max-md:w-full"
      >
        {isSubmitting ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  )
}

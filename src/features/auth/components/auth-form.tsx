import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useSingleFlight } from '@/hooks/use-single-flight'
import { type FieldPath, type FieldValues, type UseFormReturn, useForm } from 'react-hook-form'
import { isApiError } from '@/api/errors'
import { FormField } from '@/components/form-field'
import { FacebookColorIcon, GoogleIcon } from '@/components/icons/brand-icons'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { UnavailableButton, UnavailableLink } from '@/components/unavailable'
import { cn } from '@/lib/utils'
import { useLogin, useRegister } from '@/queries/session'
import {
  loginFormSchema,
  type LoginFormValues,
  registerFormSchema,
  type RegisterFormValues,
} from '../schemas'

export type AuthMode = 'login' | 'register'
export type Variant = 'modal' | 'page'

interface AuthFormProps {
  /** Para onde voltar depois de entrar (o fluxo que o usuário estava fazendo) */
  redirect: string | undefined
  /** `page`: tela cheia do celular, com campos arredondados */
  variant: Variant
}

/**
 * Envio compartilhado: executa a ação, volta ao fluxo anterior e trata os erros. Erros de
 * validação e conflitos (e-mail ou usuário já usados) voltam para os campos; os demais
 * viram uma mensagem do formulário, com os dados mantidos para tentar de novo.
 */
function useAuthSubmit<T extends FieldValues>(
  form: UseFormReturn<T>,
  redirect: string | undefined,
  /** Campos na ordem da tela: o foco vai para o primeiro com erro, não para o primeiro da resposta */
  fieldOrder: FieldPath<T>[],
  run: (values: T) => Promise<unknown>,
) {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await run(values)
      await navigate({ href: redirect ?? '/', replace: true })
    } catch (error) {
      if (!isApiError(error)) return setFormError('Não foi possível concluir. Tente novamente.')
      const fields = Object.entries(error.fields)
      for (const [path, message] of fields) form.setError(path as FieldPath<T>, { message })
      if (fields.length > 0) {
        const withError = new Set(fields.map(([path]) => path))
        const first =
          fieldOrder.find((name) => withError.has(name)) ?? (fields[0][0] as FieldPath<T>)
        return form.setFocus(first)
      }
      const transient = ['network_error', 'timeout', 'server_error'].includes(error.code)
      setFormError(transient ? `${error.message} Seus dados foram mantidos.` : error.message)
    }
  })
  // Cliques seguidos não enviam mais de uma vez
  const onSubmit = useSingleFlight(submit)
  return { onSubmit, formError, pending: form.formState.isSubmitting }
}

const fieldClass = (variant: Variant) => cn(variant === 'page' && 'h-12 rounded-xl')

function FormError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="border border-required px-3 py-2 text-sm text-required">
      {message}
    </p>
  ) : null
}

function SubmitButton({
  variant,
  pending,
  idle,
  busy,
}: {
  variant: Variant
  pending: boolean
  idle: string
  busy: string
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'mt-2 font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60',
        'bg-primary',
        variant === 'page' ? 'mt-5 h-[3.75rem] rounded-xl' : 'h-11 rounded-md',
      )}
    >
      {pending ? busy : idle}
    </button>
  )
}

export function LoginForm({ redirect, variant }: AuthFormProps) {
  const login = useLogin()
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
    // Erros só depois da primeira tentativa de envio: validar ao sair do campo faria a mensagem
    // aparecer e deslocar o layout no meio de um clique em outro elemento
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { onSubmit, formError, pending } = useAuthSubmit(
    form,
    redirect,
    ['email', 'password'],
    (values) => login.mutateAsync(values),
  )
  const { errors } = form.formState

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label="Entrar na conta"
      className="flex flex-col gap-3"
    >
      <FormField label="E-mail" hideLabel error={errors.email?.message}>
        {(c) => (
          <Input
            {...c}
            {...form.register('email')}
            type="email"
            placeholder="contato@email.com"
            autoComplete="username"
            className={fieldClass(variant)}
          />
        )}
      </FormField>

      <FormField label="Senha" hideLabel error={errors.password?.message}>
        {(c) => (
          <PasswordInput
            {...c}
            {...form.register('password')}
            placeholder="Senha"
            autoComplete="current-password"
            className={fieldClass(variant)}
          />
        )}
      </FormField>

      <p className="-mt-1 text-right text-sm">
        <UnavailableLink className="text-highlight">Esqueceu a senha?</UnavailableLink>
      </p>

      <FormError message={formError} />
      <SubmitButton variant={variant} pending={pending} idle="Entrar" busy="Entrando…" />
    </form>
  )
}

export function RegisterForm({ redirect, variant }: AuthFormProps) {
  const register = useRegister()
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
    // Erros só depois da primeira tentativa de envio: validar ao sair do campo faria a mensagem
    // aparecer e deslocar o layout no meio de um clique em outro elemento
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { onSubmit, formError, pending } = useAuthSubmit(
    form,
    redirect,
    ['username', 'email', 'password', 'confirmPassword'],
    ({ confirmPassword, ...body }) => {
      void confirmPassword // só serve para conferir a senha no cliente
      return register.mutateAsync(body)
    },
  )
  const { errors } = form.formState

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Criar conta" className="flex flex-col gap-3">
      <FormField label="Nome de usuário" hideLabel error={errors.username?.message}>
        {(c) => (
          <Input
            {...c}
            {...form.register('username')}
            placeholder="Nome de usuário"
            autoComplete="username"
            autoCapitalize="none"
            className={fieldClass(variant)}
          />
        )}
      </FormField>

      <FormField label="E-mail" hideLabel error={errors.email?.message}>
        {(c) => (
          <Input
            {...c}
            {...form.register('email')}
            type="email"
            placeholder="Digite seu e-mail"
            autoComplete="email"
            className={fieldClass(variant)}
          />
        )}
      </FormField>

      <FormField
        label="Senha"
        hideLabel
        error={errors.password?.message}
        hint="Mínimo de 8 caracteres, com letras e números."
      >
        {(c) => (
          <PasswordInput
            {...c}
            {...form.register('password')}
            placeholder="Senha"
            autoComplete="new-password"
            className={fieldClass(variant)}
          />
        )}
      </FormField>

      <FormField label="Confirmar senha" hideLabel error={errors.confirmPassword?.message}>
        {(c) => (
          <PasswordInput
            {...c}
            {...form.register('confirmPassword')}
            placeholder="Confirmar senha"
            autoComplete="new-password"
            className={fieldClass(variant)}
          />
        )}
      </FormField>

      <FormError message={formError} />
      <SubmitButton
        variant={variant}
        pending={pending}
        idle={variant === 'page' ? 'Criar perfil' : 'Criar conta'}
        busy="Criando conta…"
      />
    </form>
  )
}

/** "Ou continue com": o login social fica indisponível nesta demonstração */
export function SocialLogin({ variant }: { variant: Variant }) {
  const button = cn(
    'flex h-10 w-full items-center justify-center gap-3 border border-input text-sm text-muted-foreground',
    variant === 'page' ? 'rounded-xl' : 'rounded-md',
  )
  return (
    <div className="flex flex-col gap-3">
      <UnavailableButton className={button}>
        <GoogleIcon className="size-5" />
        Continuar com Google
      </UnavailableButton>
      <UnavailableButton className={button}>
        <FacebookColorIcon className="size-5" />
        Continuar com Facebook
      </UnavailableButton>
    </div>
  )
}

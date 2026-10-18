import { useId, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface ControlProps {
  id: string
  'aria-invalid': boolean | undefined
  'aria-describedby': string | undefined
  'aria-required': boolean | undefined
}

interface FormFieldProps {
  label: string
  required?: boolean
  /** Mensagem de erro. Fica associada ao campo e é anunciada ao aparecer. */
  error?: string
  hint?: string
  /** Esconde o rótulo só visualmente: continua disponível para leitores de tela */
  hideLabel?: boolean
  className?: string
  /** Recebe os atributos de acessibilidade que o controle deve usar */
  children: (control: ControlProps) => ReactNode
}

/**
 * Campo de formulário: rótulo (com o asterisco de obrigatório, como no design), controle
 * e mensagem de erro ligados por `id` e `aria-describedby`.
 */
export function FormField({
  label,
  required,
  error,
  hint,
  hideLabel,
  className,
  children,
}: FormFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const describedBy = error || hint ? messageId : undefined
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>
        {label}
        {required && (
          <span aria-hidden className="text-lg leading-none text-required">
            *
          </span>
        )}
      </Label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        'aria-required': required ? true : undefined,
      })}
      {error ? (
        <p id={messageId} role="alert" className="text-sm text-required">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

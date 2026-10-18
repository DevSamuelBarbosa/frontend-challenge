import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const SUFFIX = '.eth'

interface EnsNameInputProps {
  id?: string
  /** Nome completo, como a API usa: "ana.eth". Vazio enquanto nada foi digitado. */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  invalid?: boolean
  describedBy?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Campo de nome ENS do design: o seletor do domínio (.eth) e o nome. O valor do formulário
 * é sempre o nome completo, então a validação é a mesma do pedido.
 */
export function EnsNameInput({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  describedBy,
  required,
  disabled,
  className,
}: EnsNameInputProps) {
  const name = value.endsWith(SUFFIX) ? value.slice(0, -SUFFIX.length) : value
  return (
    <div className={cn('flex gap-2', className)}>
      <Select value={SUFFIX} disabled={disabled}>
        <SelectTrigger aria-label="Domínio do endereço" className="w-[5.25rem] shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={SUFFIX}>{SUFFIX}</SelectItem>
        </SelectContent>
      </Select>
      <Input
        id={id}
        value={name}
        onChange={(event) => onChange(event.target.value ? `${event.target.value}${SUFFIX}` : '')}
        onBlur={onBlur}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        aria-required={required}
        disabled={disabled}
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  )
}

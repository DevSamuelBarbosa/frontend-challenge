import { useId } from 'react'
import type { NftEdition } from '@/api/contracts'
import { cn } from '@/lib/utils'

interface EditionPickerProps {
  editions: NftEdition[]
  value: string
  onChange: (editionId: string) => void
}

/**
 * Escolha da edição (1/1, 1/10, 1/50, aberta). São botões de rádio nativos:
 * setas do teclado, foco e leitura funcionam sem código extra. Edições esgotadas
 * ficam desabilitadas e dizem o motivo.
 */
export function EditionPicker({ editions, value, onChange }: EditionPickerProps) {
  const name = useId()
  return (
    <fieldset>
      <legend className="text-base font-bold">Edição:</legend>
      <div className="mt-3 flex flex-wrap gap-2 md:gap-3">
        {editions.map((edition) => {
          const soldOut = edition.available === 0
          return (
            <label key={edition.id} className="relative">
              <input
                type="radio"
                name={name}
                value={edition.id}
                checked={edition.id === value}
                disabled={soldOut}
                onChange={() => onChange(edition.id)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'inline-flex h-7 cursor-pointer items-center rounded-full border border-input bg-card/50 px-3 text-sm text-muted-foreground transition-colors',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:border-primary',
                  'peer-checked:border-primary peer-checked:font-bold peer-checked:text-highlight',
                  'peer-disabled:cursor-not-allowed peer-disabled:line-through peer-disabled:opacity-50',
                )}
              >
                {edition.name}
                {soldOut && <span className="sr-only"> (esgotada)</span>}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

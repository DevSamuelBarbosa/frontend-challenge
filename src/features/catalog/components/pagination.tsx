import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Páginas exibidas: todas, ou um intervalo em volta da atual com reticências */
function pageList(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  return sorted.flatMap((page, i) =>
    i > 0 && page - sorted[i - 1] > 1 ? ['gap' as const, page] : [page],
  )
}

const box =
  'grid size-[2.1875rem] place-items-center rounded-md border border-input text-base transition-colors hover:border-primary disabled:pointer-events-none disabled:opacity-40'

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Paginação do catálogo" className="flex justify-end">
      <ul className="flex items-center gap-2">
        {page > 1 && (
          <li>
            <button
              type="button"
              className={box}
              onClick={() => onChange(page - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
          </li>
        )}
        {pageList(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden className="px-1">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => onChange(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Página ${item}`}
                className={cn(
                  box,
                  item === page && 'border-primary bg-primary font-bold text-primary-foreground',
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            className={box}
            onClick={() => onChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Próxima página"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </li>
      </ul>
    </nav>
  )
}

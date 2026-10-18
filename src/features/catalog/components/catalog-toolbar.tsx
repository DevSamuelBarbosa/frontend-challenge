import { useId } from 'react'
import type { NftFeed, NftSort } from '@/api/contracts'
import { nftFeedSchema, nftSortSchema } from '@/api/contracts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { FEED_LABELS, SORT_LABELS } from '../labels'

/** Abas do catálogo (todos, novos lançamentos, em alta) */
export function FeedTabs({
  feed,
  onChange,
  className,
}: {
  feed: NftFeed
  onChange: (feed: NftFeed) => void
  className?: string
}) {
  return (
    <div role="group" aria-label="Mostrar" className={cn('flex gap-5', className)}>
      {nftFeedSchema.options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={feed === option}
          className={cn(
            'relative py-1 text-[0.9375rem] font-medium whitespace-nowrap transition-colors hover:text-highlight',
            feed === option &&
              'text-highlight after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary',
          )}
        >
          {FEED_LABELS[option]}
        </button>
      ))}
    </div>
  )
}

export function SortSelect({
  sort,
  onChange,
}: {
  sort: NftSort
  onChange: (sort: NftSort) => void
}) {
  const labelId = useId()
  return (
    <div className="flex items-center gap-1 text-[0.9375rem]">
      <span id={labelId}>Ordenar por:</span>
      <Select value={sort} onValueChange={(value) => onChange(value as NftSort)}>
        <SelectTrigger
          aria-labelledby={labelId}
          className="h-8 gap-1 border-0 bg-transparent px-1 text-[0.9375rem] shadow-none dark:bg-transparent"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {nftSortSchema.options.map((option) => (
            <SelectItem key={option} value={option}>
              {SORT_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

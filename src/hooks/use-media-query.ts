import { useSyncExternalStore } from 'react'

/** Acompanha uma media query, ex.: `useMediaQuery('(min-width: 48rem)')` */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Mesmo ponto de quebra do `md` do Tailwind */
export const useIsDesktop = () => useMediaQuery('(min-width: 48rem)')

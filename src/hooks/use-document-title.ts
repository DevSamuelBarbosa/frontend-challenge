import { useEffect } from 'react'

const SITE_NAME = 'Kurio'

/** Define o título da aba para a tela atual e restaura o anterior ao sair */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = `${title} | ${SITE_NAME}`
    return () => {
      document.title = previous
    }
  }, [title])
}

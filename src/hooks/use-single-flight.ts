import { useCallback, useRef } from 'react'

const isEvent = (value: unknown): value is { preventDefault: () => void } =>
  typeof value === 'object' &&
  value !== null &&
  'preventDefault' in value &&
  typeof value.preventDefault === 'function'

/**
 * Impede execuções simultâneas de uma ação assíncrona. Cliques seguidos chegam antes de a
 * tela re-renderizar o botão como desabilitado, e sem a trava cada um enviaria o formulário.
 * Enquanto uma execução não termina, as chamadas seguintes são ignoradas.
 *
 * Quando a ação é um manipulador de `submit`, a chamada ignorada ainda cancela o envio
 * padrão do navegador: sem isso o `<form>` seria enviado por GET, com os campos (inclusive
 * a senha) na barra de endereço.
 */
export function useSingleFlight<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
) {
  const busy = useRef(false)
  return useCallback(
    async (...args: Args) => {
      if (busy.current) {
        if (isEvent(args[0])) args[0].preventDefault()
        return undefined
      }
      busy.current = true
      try {
        return await action(...args)
      } finally {
        busy.current = false
      }
    },
    [action],
  )
}

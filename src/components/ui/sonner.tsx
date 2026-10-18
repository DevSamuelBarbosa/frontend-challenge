import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * Notificações das ações (carrinho, favoritos, pedidos). O sonner anuncia as
 * mensagens em uma região `aria-live`, então o feedback também chega a quem usa
 * leitor de tela.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      // No celular os toasts ocupam a largura toda: começam abaixo das ações do topo
      // (voltar, favoritar, busca), para não cobrir o botão que o usuário vai tocar de novo
      mobileOffset={{ top: '4.5rem' }}
      closeButton
      containerAriaLabel="Notificações"
      toastOptions={{
        classNames: {
          toast: '!bg-card !text-foreground !border !border-input !font-sans',
          description: '!text-muted-foreground',
          actionButton: '!bg-primary !text-primary-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

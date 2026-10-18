import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountLayout } from '@/features/account/components/account-layout'
import { WalletForm } from '@/features/account/components/wallet-form'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { profileQueryOptions } from '@/queries/profile'
import { walletsQueryOptions } from '@/queries/wallets'

export const Route = createFileRoute('/_authenticated/wallets')({
  component: WalletsPage,
})

function WalletsPage() {
  const { session } = Route.useRouteContext()
  const userId = session.user.id
  const profile = useQuery(profileQueryOptions(userId))
  const wallets = useQuery(walletsQueryOptions(userId))
  // Escolher "igual à principal" ou abrir o cadastro são só preferências da tela
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const [adding, setAdding] = useState(false)
  useDocumentTitle('Carteiras')

  const primary = wallets.data?.find((wallet) => wallet.role === 'primary')
  const secondary = wallets.data?.find((wallet) => wallet.role === 'secondary')

  return (
    <AccountLayout section="wallets">
      {profile.isError || wallets.isError ? (
        <div role="alert" className="text-sm">
          <p>Não foi possível carregar suas carteiras.</p>
          <button
            type="button"
            onClick={() => {
              void profile.refetch()
              void wallets.refetch()
            }}
            className="mt-2 font-bold text-highlight underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </div>
      ) : !profile.data || !wallets.data ? (
        <div aria-busy="true" aria-label="Carregando carteiras" className="flex flex-col gap-6">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-[26rem] w-full" />
        </div>
      ) : (
        <>
          <section aria-labelledby="primary-heading">
            <h1 id="primary-heading" className="text-base font-bold">
              Carteira principal
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
            </p>
            <div className="mt-6">
              <WalletForm
                key={primary?.updatedAt ?? 'new'}
                role="primary"
                wallet={primary}
                profile={profile.data}
                defaults={{ profileName: profile.data.name }}
              />
            </div>
          </section>

          <section aria-labelledby="secondary-heading" className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <h2 id="secondary-heading" className="text-base font-bold">
                Carteira secundária
              </h2>
              {!secondary && (
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sameAsPrimary}
                      onChange={(event) => {
                        setSameAsPrimary(event.target.checked)
                        if (event.target.checked) setAdding(false)
                      }}
                      className="size-5 appearance-none rounded-full border-2 border-primary checked:bg-primary"
                    />
                    Igual à carteira principal
                  </label>
                  <button
                    type="button"
                    disabled={sameAsPrimary || adding || !primary}
                    onClick={() => setAdding(true)}
                    className="text-base font-bold text-highlight hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>
              )}
            </div>

            {secondary ? (
              <div className="mt-6">
                <WalletForm
                  key={secondary.updatedAt}
                  role="secondary"
                  wallet={secondary}
                  profile={profile.data}
                />
              </div>
            ) : adding ? (
              <div className="mt-6">
                <WalletForm
                  role="secondary"
                  profile={profile.data}
                  defaults={{
                    profileName: primary?.profileName,
                    referralCode: primary?.referralCode,
                  }}
                  onSaved={() => setAdding(false)}
                />
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {sameAsPrimary
                  ? 'Os NFTs serão entregues na carteira principal.'
                  : !primary
                    ? 'Salve a carteira principal para poder adicionar uma secundária.'
                    : 'Você ainda não adicionou uma carteira secundária.'}
              </p>
            )}
          </section>
        </>
      )}
    </AccountLayout>
  )
}

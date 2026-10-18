import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountLayout } from '@/features/account/components/account-layout'
import { ProfileForm } from '@/features/account/components/profile-form'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { profileQueryOptions } from '@/queries/profile'
import { walletsQueryOptions } from '@/queries/wallets'

export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { session } = Route.useRouteContext()
  const userId = session.user.id
  const profile = useQuery(profileQueryOptions(userId))
  const wallets = useQuery(walletsQueryOptions(userId))
  useDocumentTitle('Perfil do colecionador')

  const loading = profile.isPending || wallets.isPending
  const failed = profile.isError || wallets.isError
  const retry = () => {
    void profile.refetch()
    void wallets.refetch()
  }

  return (
    <AccountLayout section="profile">
      <h1 className="text-base font-bold">Perfil do colecionador</h1>
      <div className="mt-8">
        {loading && !failed ? (
          <ProfileSkeleton />
        ) : failed || !profile.data ? (
          <div role="alert" className="text-sm">
            <p>Não foi possível carregar seu perfil.</p>
            <button
              type="button"
              onClick={retry}
              className="mt-2 font-bold text-highlight underline underline-offset-2"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <ProfileForm
            profile={profile.data}
            primaryWallet={wallets.data?.find((wallet) => wallet.role === 'primary')}
          />
        )}
      </div>
    </AccountLayout>
  )
}

function ProfileSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando perfil"
      className="grid gap-x-7 gap-y-6 md:grid-cols-2"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-[4.5rem] w-full" />
      ))}
    </div>
  )
}

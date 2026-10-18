import { ImageUp } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES, type Profile } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { removeAvatarMutationOptions, uploadAvatarMutationOptions } from '@/queries/profile'

/** Troca ou remove a foto na hora, sem depender do botão "Salvar" do formulário */
export function AvatarField({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient()
  const upload = useMutation(uploadAvatarMutationOptions(queryClient, profile.id))
  const remove = useMutation(removeAvatarMutationOptions(queryClient, profile.id))
  const inputRef = useRef<HTMLInputElement>(null)
  const labelId = useId()
  const errorId = useId()
  const [error, setError] = useState<string | null>(null)
  const busy = upload.isPending || remove.isPending

  function fail(cause: unknown) {
    const fileError = isApiError(cause) ? (cause.fields.file ?? cause.message) : 'Tente novamente'
    setError(fileError)
  }

  function choose(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
      return setError('Use uma imagem PNG, JPEG ou WebP')
    }
    if (file.size > AVATAR_MAX_BYTES) return setError('A imagem deve ter no máximo 2 MB')
    upload.mutate(file, { onSuccess: () => toast.success('Avatar atualizado'), onError: fail })
  }

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <span id={labelId} className="text-base">
        Avatar
      </span>
      <div className="flex items-center gap-4">
        <span className="grid size-[3.125rem] shrink-0 place-items-center overflow-hidden rounded-full bg-card text-primary">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <ImageUp className="size-6" aria-hidden />
          )}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_MIME_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            choose(event.target.files?.[0])
            // Permite escolher o mesmo arquivo de novo depois de um erro
            event.target.value = ''
          }}
        />
        <button
          type="button"
          disabled={busy}
          aria-describedby={error ? errorId : undefined}
          onClick={() => inputRef.current?.click()}
          className="h-10 rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {upload.isPending ? 'Enviando…' : 'Alterar'}
        </button>
        <button
          type="button"
          disabled={busy || !profile.avatarUrl}
          onClick={() => {
            setError(null)
            remove.mutate(undefined, {
              onSuccess: () => toast.success('Avatar removido'),
              onError: fail,
            })
          }}
          className="text-sm hover:text-highlight disabled:cursor-not-allowed disabled:opacity-50"
        >
          Remover
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-required">
          {error}
        </p>
      )}
    </div>
  )
}

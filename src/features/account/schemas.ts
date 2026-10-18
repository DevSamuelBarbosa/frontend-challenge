import { z } from 'zod'
import { passwordSchema, updateProfileRequestSchema } from '@/api/contracts'

/**
 * Formulário de "Dados do perfil": os dados do colecionador, o apelido da carteira principal
 * e, opcionalmente, a troca de senha. As senhas só são validadas se alguma for preenchida.
 */
export function profileFormSchema(hasWallet: boolean) {
  return updateProfileRequestSchema
    .omit({ bio: true })
    .extend({
      walletLabel: z.string().trim().max(40, 'Use no máximo 40 caracteres'),
      currentPassword: z.string(),
      newPassword: z.string(),
      confirmPassword: z.string(),
    })
    .superRefine((value, ctx) => {
      const issue = (path: string, message: string) =>
        ctx.addIssue({ code: 'custom', path: [path], message })

      if (hasWallet && value.walletLabel.length < 2) {
        issue('walletLabel', 'Informe o apelido da carteira')
      }
      if (!value.currentPassword && !value.newPassword && !value.confirmPassword) return

      if (!value.currentPassword) issue('currentPassword', 'Informe sua senha atual')
      const password = passwordSchema.safeParse(value.newPassword)
      if (!password.success) issue('newPassword', password.error.issues[0].message)
      else if (value.newPassword === value.currentPassword) {
        issue('newPassword', 'A nova senha deve ser diferente da atual')
      }
      if (value.confirmPassword !== value.newPassword) {
        issue('confirmPassword', 'As senhas não coincidem')
      }
    })
}

export type ProfileFormInput = z.input<ReturnType<typeof profileFormSchema>>

import { z } from 'zod'
import { loginRequestSchema, registerRequestSchema } from '@/api/contracts'

export const loginFormSchema = loginRequestSchema
export type LoginFormValues = z.input<typeof loginFormSchema>

/** Cadastro: os campos do contrato mais a confirmação de senha, que não vai para a API */
export const registerFormSchema = registerRequestSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme a senha') })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem',
  })
export type RegisterFormValues = z.input<typeof registerFormSchema>

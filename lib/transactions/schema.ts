import { z } from 'zod'

export const TransactionCreateSchema = z.object({
  external_tx_id: z.string().min(1).max(120).optional(),
  from_account_id: z.string().uuid().optional(),
  to_account_id: z.string().uuid().optional(),
  amount: z.number().positive(),
  currency: z
    .string()
    .min(3)
    .max(3)
    .regex(/^[A-Z]{3}$/)
    .default('USD'),
  transaction_type: z.string().min(1).max(60),
  counterparty_country: z
    .string()
    .min(2)
    .max(2)
    .regex(/^[A-Z]{2}$/)
    .optional(),
  counterparty_name: z.string().min(2).max(160).optional()
})

export type TransactionCreateInput = z.infer<typeof TransactionCreateSchema>

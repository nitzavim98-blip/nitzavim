// src/lib/validations/shooting-day.ts
import { z } from 'zod'

export const createShootingDaySchema = z.object({
  date: z.string().min(1, 'תאריך הוא שדה חובה'),
  title: z.string().max(255).optional(),
  location: z.string().max(255).optional(),
  notes: z.string().optional(),
})

export const updateShootingDaySchema = z.object({
  id: z.number().int().positive(),
  date: z.string().min(1).optional(),
  title: z.string().max(255).optional(),
  location: z.string().max(255).optional(),
  notes: z.string().optional(),
})

export type CreateShootingDayInput = z.infer<typeof createShootingDaySchema>
export type UpdateShootingDayInput = z.infer<typeof updateShootingDaySchema>

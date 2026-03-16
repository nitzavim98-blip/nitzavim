// src/lib/validations/scene.ts
import { z } from 'zod'

export const createSceneSchema = z.object({
  shootingDayId: z.number().int().positive(),
  title: z.string().min(1, 'שם הסצנה הוא שדה חובה').max(255),
  description: z.string().optional(),
  requiredExtras: z.number().int().min(0).default(0),
})

export const updateSceneSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  requiredExtras: z.number().int().min(0).optional(),
})

export type CreateSceneInput = z.infer<typeof createSceneSchema>
export type UpdateSceneInput = z.infer<typeof updateSceneSchema>

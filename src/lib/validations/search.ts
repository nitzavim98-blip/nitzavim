import { z } from 'zod'

export const searchFiltersSchema = z.object({
  q: z.string().optional(),
  attributeIds: z.array(z.number().int().positive()).optional(),
  minAge: z.number().int().positive().optional(),
  maxAge: z.number().int().positive().optional(),
  gender: z.union([z.literal(0), z.literal(1)]).optional(),
  availableOnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך לא תקין')
    .optional(),
  hasCar: z.boolean().optional(),
})

export type SearchFilters = z.infer<typeof searchFiltersSchema>

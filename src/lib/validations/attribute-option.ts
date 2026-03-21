import { z } from 'zod'

export const createAttributeOptionSchema = z.object({
  label: z.string().min(1, 'שם המאפיין לא יכול להיות ריק').max(100, 'שם המאפיין ארוך מדי')
})

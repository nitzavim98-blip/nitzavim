import { z } from 'zod'

export const createExtraSchema = z.object({
  fullName: z.string().min(1, 'שם מלא הוא שדה חובה').max(255),
  phone: z.string().max(20).optional().nullable(),
  gender: z.number().int().min(0).max(1).default(1),
  age: z.number().int().positive('גיל חייב להיות מספר חיובי').optional().nullable(),
  height: z.number().int().positive('גובה חייב להיות מספר חיובי').optional().nullable(),
  weight: z.number().int().positive('משקל חייב להיות מספר חיובי').optional().nullable(),
  hasCar: z.boolean().default(false),
  reliability: z.number().int().min(0).max(2).default(2),
  notes: z.string().optional().nullable(),
})

export const updateExtraSchema = createExtraSchema.partial()

export const availabilityRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך לא תקין'),
  isAvailable: z.boolean(),
})

export type CreateExtraInput = z.infer<typeof createExtraSchema>
export type UpdateExtraInput = z.infer<typeof updateExtraSchema>
export type AvailabilityRecord = z.infer<typeof availabilityRecordSchema>

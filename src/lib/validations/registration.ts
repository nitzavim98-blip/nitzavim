import { z } from 'zod'
import { availabilityRecordSchema } from './extra'

export const publicRegistrationSchema = z.object({
  fullName: z.string().min(1, 'שם מלא הוא שדה חובה').max(255),
  phone: z.string().max(20).optional().nullable(),
  gender: z.number().int().min(0).max(1).default(1),
  age: z
    .number()
    .int()
    .positive('גיל חייב להיות מספר חיובי')
    .optional()
    .nullable(),
  height: z
    .number()
    .int()
    .positive('גובה חייב להיות מספר חיובי')
    .optional()
    .nullable(),
  weight: z
    .number()
    .int()
    .positive('משקל חייב להיות מספר חיובי')
    .optional()
    .nullable(),
  hasCar: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  token: z.string().min(1, 'טוקן חסר'),
  availability: z.array(availabilityRecordSchema).default([]),
})

export type PublicRegistrationInput = z.infer<typeof publicRegistrationSchema>

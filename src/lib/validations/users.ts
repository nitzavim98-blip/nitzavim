import { z } from 'zod'

export const updateUserRoleSchema = z.object({
  userId: z.number().int().positive(),
  newRole: z.enum(['admin', 'director', 'guest']),
})

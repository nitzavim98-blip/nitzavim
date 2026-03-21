'use client'

import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { updateUserRole } from '@/actions/auth'
import type { User } from '@/db/schema/users'
import styles from './UserManagement.module.css'

type Role = User['role']

const ROLE_LABELS: Record<Role, string> = {
  admin: 'מנהל',
  director: 'במאי',
  guest: 'צופה',
}

const ALL_ROLES: Role[] = ['admin', 'director', 'guest']

interface Props {
  userId: number
  currentRole: Role
  isSelf: boolean
}

export default function UserRoleDropdown({ userId, currentRole, isSelf }: Props) {
  const [role, setRole] = useState<Role>(currentRole)
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as Role
    if (newRole === role) return

    startTransition(async () => {
      const result = await updateUserRole(userId, newRole)
      if ('error' in result && result.error) {
        toast.error(result.error)
      } else {
        setRole(newRole)
        toast.success('תפקיד המשתמש עודכן בהצלחה')
      }
    })
  }

  return (
    <select
      className={`${styles.roleSelect} ${isSelf ? styles.roleSelectDisabled : ''}`}
      value={role}
      onChange={handleChange}
      disabled={isSelf || isPending}
      aria-label="שינוי תפקיד"
    >
      {ALL_ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </select>
  )
}

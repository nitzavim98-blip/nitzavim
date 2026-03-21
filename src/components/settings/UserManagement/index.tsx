import { AlertCircle } from 'lucide-react'
import { getUsers, getCurrentUser } from '@/actions/auth'
import UserRoleDropdown from './UserRoleDropdown'
import styles from './UserManagement.module.css'

type Role = 'admin' | 'director' | 'guest'

const ROLE_LABELS: Record<Role, string> = {
  admin: 'מנהל',
  director: 'במאי',
  guest: 'צופה',
}

const ROLE_BADGE_CLASS: Record<Role, string> = {
  admin: 'roleBadgeAdmin',
  director: 'roleBadgeDirector',
  guest: 'roleBadgeGuest',
}

export default async function UserManagement() {
  const [usersResult, currentUser] = await Promise.all([getUsers(), getCurrentUser()])

  if ('error' in usersResult) {
    return (
      <div className={styles.errorState}>
        <AlertCircle size={20} />
        <span>{usersResult.error}</span>
      </div>
    )
  }

  const usersList = usersResult.data

  if (usersList.length === 0) {
    return (
      <div className={styles.emptyState}>
        <AlertCircle size={20} />
        <span>לא נמצאו משתמשים במערכת</span>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>שם</th>
              <th className={styles.th}>אימייל</th>
              <th className={styles.th}>תפקיד נוכחי</th>
              <th className={styles.th}>שינוי תפקיד</th>
            </tr>
          </thead>
          <tbody>
            {usersList.map((user) => {
              const isSelf = currentUser?.id === user.id
              const badgeClass = ROLE_BADGE_CLASS[user.role as Role]
              return (
                <tr key={user.id} className={`${styles.tr} ${isSelf ? styles.trSelf : ''}`}>
                  <td className={styles.td}>
                    <div className={styles.nameCell}>
                      {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.image}
                          alt={user.name}
                          className={styles.avatar}
                          width={32}
                          height={32}
                        />
                      ) : (
                        <div className={styles.avatarFallback}>
                          {user.name?.charAt(0) ?? '?'}
                        </div>
                      )}
                      <span className={styles.userName}>{user.name}</span>
                      {isSelf && <span className={styles.selfTag}>(אתה)</span>}
                    </div>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.email}>{user.email}</span>
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.roleBadge} ${styles[badgeClass]}`}>
                      {ROLE_LABELS[user.role as Role]}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <UserRoleDropdown
                      userId={user.id}
                      currentRole={user.role as Role}
                      isSelf={isSelf}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

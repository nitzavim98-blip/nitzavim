import { requireAuth } from '@/actions/auth'

export default async function DashboardPage() {
  const user = await requireAuth()

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBlockEnd: '8px' }}>
        ברוך הבא, {user.name}
      </h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        לוח הבקרה יהיה זמין בשלב 8
      </p>
    </div>
  )
}

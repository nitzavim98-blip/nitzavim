import { Link2Off } from 'lucide-react'
import { validateToken } from '@/actions/tokens'
import RegistrationForm from '@/components/registration/RegistrationForm'
import styles from './registration.module.css'

interface Props {
  params: Promise<{ token: string }>
}

export default async function RegistrationPage({ params }: Props) {
  const { token } = await params
  const tokenRecord = await validateToken(token)

  if (!tokenRecord) {
    return (
      <div className={styles.invalidPage}>
        <div className={styles.invalidCard}>
          <Link2Off size={48} className={styles.invalidIcon} />
          <h1 className={styles.invalidTitle}>הקישור אינו תקף</h1>
          <p className={styles.invalidText}>
            הקישור שבו השתמשת אינו פעיל או לא קיים. פנה למפיק כדי לקבל קישור חדש.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>הרשמה כניצב/ת</h1>
          <p className={styles.subtitle}>מלא את הפרטים הבאים כדי להירשם להפקה</p>
        </div>
        <RegistrationForm token={token} />
      </div>
    </div>
  )
}

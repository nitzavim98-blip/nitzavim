import Image from 'next/image'
import { signIn } from '@/lib/auth'
import styles from './login.module.css'

export default function LoginPage() {
  return (
    <main className={styles.layout}>
      {/* Hero image side (left) */}
      <section className={styles.imageSection}>
        <Image
          src="/film_set.svg"
          alt="סט צילום"
          fill
          className={styles.heroImage}
          priority
        />
        <div className={styles.imageOverlay} />
        <div className={styles.heroText}>
          <h2 className={styles.heroHeading}>ייעל את ההפקה שלך.</h2>
          <p className={styles.heroSubtext}>נהל לוחות זמנים, סטים וניצבים.</p>
        </div>
      </section>

      {/* Form side (right) */}
      <section className={styles.formSection}>
        <div className={styles.formContainer}>
          {/* Logo only, no text */}
          <div className={styles.logoWrap}>
            <Image src="/logo.png" alt="שיבוץ+ ניצבים" width={80} height={80} className={styles.logoImg} priority />
          </div>

          <h1 className={styles.heading}>התחברות לחשבון שלי</h1>
          <p className={styles.subheading}>ברוך שובך חזרה למערכת.</p>

          {/* Google sign-in */}
          <form
            className={styles.form}
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: '/dashboard' })
            }}
          >
            <button type="submit" className={styles.googleButton}>
              <svg aria-hidden="true" className={styles.googleIcon} viewBox="0 0 24 24">
                <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
                <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.275 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
                <path d="M12.0003 24C15.2403 24 17.9653 22.935 19.9453 21.095L16.0803 18.095C15.0053 18.82 13.6203 19.25 12.0003 19.25C8.87028 19.25 6.21525 17.14 5.27028 14.295L1.28027 17.39C3.25527 21.31 7.31028 24 12.0003 24Z" fill="#34A853" />
              </svg>
              <span>התחבר עם Google</span>
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createShootingDay, updateShootingDay } from '@/actions/shooting-days'
import Button from '@/components/ui/Button'
import styles from './ShootingDayForm.module.css'

type InitialData = {
  id: number
  date: string
  title?: string | null
  location?: string | null
  notes?: string | null
}

type Props = {
  initialData?: InitialData
  onSuccess?: () => void
}

export default function ShootingDayForm({ initialData, onSuccess }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const input = {
      date: formData.get('date') as string,
      title: (formData.get('title') as string) || undefined,
      location: (formData.get('location') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
    }

    startTransition(async () => {
      const result = initialData
        ? await updateShootingDay({ ...input, id: initialData.id })
        : await createShootingDay(input)

      if ('error' in result) {
        toast.error(result.error ?? 'אירעה שגיאה')
        return
      }

      toast.success(initialData ? 'יום הצילום עודכן' : 'יום הצילום נוצר')

      if (onSuccess) {
        onSuccess()
      } else if (!initialData) {
        router.push(`/shooting-days/${result.data.id}`)
      } else {
        router.push(`/shooting-days/${initialData.id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="sd-date" className={styles.label}>
          תאריך *
        </label>
        <input
          type="date"
          id="sd-date"
          name="date"
          required
          defaultValue={initialData?.date}
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="sd-title" className={styles.label}>
          כותרת
        </label>
        <input
          type="text"
          id="sd-title"
          name="title"
          defaultValue={initialData?.title ?? ''}
          placeholder="כותרת יום הצילום (אופציונלי)"
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="sd-location" className={styles.label}>
          מיקום
        </label>
        <input
          type="text"
          id="sd-location"
          name="location"
          defaultValue={initialData?.location ?? ''}
          placeholder="מיקום הצילום (אופציונלי)"
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="sd-notes" className={styles.label}>
          הערות
        </label>
        <textarea
          id="sd-notes"
          name="notes"
          defaultValue={initialData?.notes ?? ''}
          placeholder="הערות לצוות..."
          rows={4}
          className={styles.textarea}
        />
      </div>

      <div className={styles.actions}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => (onSuccess ? onSuccess() : router.back())}
          disabled={isPending}
        >
          ביטול
        </Button>
        <Button type="submit" variant="primary" loading={isPending}>
          {initialData ? 'שמור שינויים' : 'צור יום צילום'}
        </Button>
      </div>
    </form>
  )
}

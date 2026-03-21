'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { Pencil } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ShootingDayForm from '@/components/shooting-days/ShootingDayForm'
import type { ShootingDay } from '@/db/schema/shooting-days'
import styles from './ShootingDayHeader.module.css'

type Props = {
  day: ShootingDay
}

export default function ShootingDayHeader({ day }: Props) {
  const [isEditing, setIsEditing] = useState(false)

  const parsedDate = new Date(day.date + 'T00:00:00')
  const formattedDate = format(parsedDate, 'EEEE, d בMMMM yyyy', { locale: he })

  return (
    <>
      <div className={styles.header}>
        <div className={styles.topRow}>
          <h1 className={styles.date}>{formattedDate}</h1>

          {day.isArchived ? (
            <span className={styles.archivedBadge}>ארכיון</span>
          ) : (
            <div className={styles.headerActions}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                aria-label="ערוך יום צילום"
              >
                <Pencil size={16} />
                עריכה
              </Button>
            </div>
          )}
        </div>

        {day.title && <h2 className={styles.title}>{day.title}</h2>}
        {day.location && (
          <p className={styles.location}>📍 {day.location}</p>
        )}
        {day.notes && <p className={styles.notes}>{day.notes}</p>}
      </div>

      {/* Edit modal */}
      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="עריכת יום צילום">
        <ShootingDayForm
          initialData={day}
          onSuccess={() => setIsEditing(false)}
        />
      </Modal>

    </>
  )
}

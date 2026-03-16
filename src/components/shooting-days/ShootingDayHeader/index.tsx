'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { Pencil, Archive, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { archiveShootingDay } from '@/actions/shooting-days'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ShootingDayForm from '@/components/shooting-days/ShootingDayForm'
import type { ShootingDay } from '@/db/schema/shooting-days'
import styles from './ShootingDayHeader.module.css'

type Props = {
  day: ShootingDay
}

export default function ShootingDayHeader({ day }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [isArchiving, startArchiveTransition] = useTransition()

  const parsedDate = new Date(day.date + 'T00:00:00')
  const formattedDate = format(parsedDate, 'EEEE, d בMMMM yyyy', { locale: he })

  function handleArchive() {
    startArchiveTransition(async () => {
      const result = await archiveShootingDay(day.id)
      if ('error' in result) {
        toast.error(result.error ?? 'אירעה שגיאה')
        return
      }
      toast.success('יום הצילום הועבר לארכיון')
      router.push('/shooting-days/archive')
    })
  }

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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmArchive(true)}
                aria-label="העבר לארכיון"
              >
                <Archive size={16} />
                ארכיון
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled
                title="ייצוא לווצאפ — יהיה זמין בשלב 6"
                aria-label="ייצוא לווצאפ"
              >
                <MessageSquare size={16} />
                ייצוא לווצאפ
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

      {/* Archive confirmation modal */}
      <Modal
        isOpen={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title="ארכיון יום צילום"
      >
        <p className={styles.confirmText}>האם להעביר את יום הצילום לארכיון?</p>
        <p className={styles.confirmSubtext}>
          לאחר העברה, יום הצילום יהיה בקריאה בלבד
        </p>
        <div className={styles.confirmActions}>
          <Button
            variant="secondary"
            onClick={() => setConfirmArchive(false)}
            disabled={isArchiving}
          >
            ביטול
          </Button>
          <Button variant="danger" onClick={handleArchive} loading={isArchiving}>
            העבר לארכיון
          </Button>
        </div>
      </Modal>
    </>
  )
}

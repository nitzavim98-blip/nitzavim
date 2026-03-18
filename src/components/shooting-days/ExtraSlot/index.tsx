'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X, UserCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { updateExtraStatus, removeExtraFromScene } from '@/actions/extra-scenes'
import type { ExtraSlotData } from '@/actions/extra-scenes'
import StatusBadge from '@/components/ui/StatusBadge'
import type { StatusValue } from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import styles from './ExtraSlot.module.css'

type Props = ExtraSlotData

export default function ExtraSlot({ assignment, extra, thumbnailUrl }: Props) {
  const router = useRouter()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [isRemoving, startRemoveTransition] = useTransition()

  async function handleStatusChange(status: StatusValue) {
    const result = await updateExtraStatus(assignment.id, status)
    if ('error' in result) {
      toast.error(result.error ?? 'אירעה שגיאה')
    } else {
      router.refresh()
    }
  }

  function handleRemove() {
    startRemoveTransition(async () => {
      const result = await removeExtraFromScene(assignment.id)
      if ('error' in result) {
        toast.error(result.error ?? 'אירעה שגיאה')
        return
      }
      toast.success('הניצב הוסר מהסצנה')
      setConfirmRemove(false)
      router.refresh()
    })
  }

  return (
    <>
      <div className={styles.slot}>
        <div className={styles.photo}>
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="" className={styles.photoImg} />
          ) : (
            <UserCircle2 size={24} color="var(--color-text-muted)" />
          )}
        </div>

        <div className={styles.info}>
          <Link href={`/extras/${extra.id}`} className={styles.name}>
            {extra.fullName}
          </Link>
          <StatusBadge
            status={assignment.status as StatusValue}
            onStatusChange={handleStatusChange}
          />
        </div>

        <button
          className={styles.removeButton}
          onClick={() => setConfirmRemove(true)}
          aria-label="הסר מהסצנה"
        >
          <X size={14} />
        </button>
      </div>

      <Modal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="הסר ניצב מהסצנה"
      >
        <p className={styles.confirmText}>
          להסיר את <strong>{extra.fullName}</strong> מהסצנה?
        </p>
        <div className={styles.confirmActions}>
          <Button
            variant="secondary"
            onClick={() => setConfirmRemove(false)}
            disabled={isRemoving}
          >
            ביטול
          </Button>
          <Button variant="danger" onClick={handleRemove} loading={isRemoving}>
            הסר
          </Button>
        </div>
      </Modal>
    </>
  )
}

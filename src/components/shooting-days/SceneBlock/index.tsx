// src/components/shooting-days/SceneBlock/index.tsx
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Pencil,
  Trash2,
  Copy,
  Search,
  UserPlus,
  Users,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { deleteScene, duplicateScene } from '@/actions/scenes'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import SceneForm from '@/components/shooting-days/SceneForm'
import ExtraSlot from '@/components/shooting-days/ExtraSlot'
import QuickAssign from '@/components/shooting-days/QuickAssign'
import type { Scene } from '@/db/schema/scenes'
import type { ExtraSlotData } from '@/actions/extra-scenes'
import styles from './SceneBlock.module.css'

type Props = {
  scene: Scene
  sceneNumber: number
  assignments?: ExtraSlotData[]
  isReadOnly?: boolean
}

export default function SceneBlock({
  scene,
  sceneNumber,
  assignments = [],
  isReadOnly,
}: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showQuickAssign, setShowQuickAssign] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isDuplicating, startDuplicateTransition] = useTransition()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id, disabled: isReadOnly })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Gap uses confirmed+arrived count per spec
  const assignedCount = assignments.filter((a) =>
    ['confirmed', 'arrived'].includes(a.assignment.status)
  ).length
  const gap = Math.max(0, scene.requiredExtras - assignedCount)
  const isFull = scene.requiredExtras > 0 && gap === 0

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteScene(scene.id)
      if ('error' in result) {
        toast.error(result.error ?? 'אירעה שגיאה')
        return
      }
      toast.success('הסצנה נמחקה')
      setConfirmDelete(false)
    })
  }

  function handleDuplicate() {
    startDuplicateTransition(async () => {
      const result = await duplicateScene(scene.id)
      if ('error' in result) {
        toast.error(result.error ?? 'אירעה שגיאה')
        return
      }
      toast.success('הסצנה שוכפלה')
      router.refresh()
    })
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`${styles.block} ${isDragging ? styles.dragging : ''}`}
      >
        {/* Header row */}
        <div className={styles.row}>
          {!isReadOnly && (
            <button
              className={styles.dragHandle}
              aria-label="גרור לשינוי סדר"
              {...attributes}
              {...listeners}
            >
              <GripVertical size={18} />
            </button>
          )}

          <div className={styles.sceneBadge}>
            <span className={styles.sceneNumber}>סצנה {sceneNumber}</span>
          </div>

          <div className={styles.content}>
            <h3 className={styles.title}>{scene.title}</h3>
            {scene.description && (
              <p className={styles.description}>{scene.description}</p>
            )}
          </div>

          <div className={styles.side}>
            {scene.requiredExtras > 0 && (
              <div
                className={`${styles.gapIndicator} ${
                  isFull ? styles.full : styles.missing
                }`}
              >
                {isFull ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>
                      {assignedCount}/{scene.requiredExtras} ניצבים
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} />
                    <span>
                      חסרים {gap}/{scene.requiredExtras} ניצבים
                    </span>
                  </>
                )}
              </div>
            )}

            {!isReadOnly && (
              <div className={styles.actions}>
                <button
                  className={styles.actionButton}
                  onClick={handleDuplicate}
                  disabled={isDuplicating}
                  aria-label="שכפל סצנה"
                  title="שכפל סצנה"
                >
                  <Copy size={16} />
                </button>
                <button
                  className={styles.actionButton}
                  onClick={() => setIsEditing(true)}
                  aria-label="ערוך סצנה"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={() => setConfirmDelete(true)}
                  aria-label="מחק סצנה"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Assigned extras grid */}
        <div className={styles.extrasArea}>
          {assignments.length > 0 ? (
            <div className={styles.extrasGrid}>
              {assignments.map((slot) => (
                <ExtraSlot key={slot.assignment.id} {...slot} />
              ))}
            </div>
          ) : (
            <div className={styles.extrasEmpty}>
              <Users size={14} className={styles.extrasEmptyIcon} />
              <span>אין ניצבים משובצים לסצנה</span>
            </div>
          )}

          {/* Action buttons area */}
          {!isReadOnly && (
            <div className={styles.assignActions}>
              <Link
                href={`/search?sceneId=${scene.id}`}
                className={styles.findButton}
              >
                <Search size={14} />
                מצא ניצבים
              </Link>
              <button
                className={styles.quickAssignButton}
                onClick={() => setShowQuickAssign((v) => !v)}
                aria-label="שיבוץ מהיר"
              >
                <UserPlus size={14} />
                שיבוץ מהיר
              </button>
            </div>
          )}
        </div>

        {/* QuickAssign inline panel */}
        {showQuickAssign && !isReadOnly && (
          <QuickAssign
            sceneId={scene.id}
            onAssigned={() => setShowQuickAssign(false)}
            onClose={() => setShowQuickAssign(false)}
          />
        )}
      </div>

      {/* Edit modal */}
      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="עריכת סצנה">
        <SceneForm
          shootingDayId={scene.shootingDayId}
          scene={scene}
          onSuccess={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="מחיקת סצנה"
      >
        <p className={styles.confirmText}>
          האם למחוק את הסצנה &ldquo;{scene.title}&rdquo;?
        </p>
        <p className={styles.confirmSubtext}>פעולה זו אינה ניתנת לביטול</p>
        <div className={styles.confirmActions}>
          <Button
            variant="secondary"
            onClick={() => setConfirmDelete(false)}
            disabled={isDeleting}
          >
            ביטול
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
            מחק
          </Button>
        </div>
      </Modal>
    </>
  )
}

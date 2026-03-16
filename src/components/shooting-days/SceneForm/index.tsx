'use client'

import { useTransition } from 'react'
import toast from 'react-hot-toast'
import { createScene, updateScene } from '@/actions/scenes'
import Button from '@/components/ui/Button'
import type { Scene } from '@/db/schema/scenes'
import styles from './SceneForm.module.css'

type Props = {
  shootingDayId: number
  scene?: Scene
  onSuccess: () => void
  onCancel: () => void
}

export default function SceneForm({ shootingDayId, scene, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const input = scene
      ? {
          id: scene.id,
          title: formData.get('title') as string,
          description: (formData.get('description') as string) || undefined,
          requiredExtras: Number(formData.get('requiredExtras')) || 0,
        }
      : {
          shootingDayId,
          title: formData.get('title') as string,
          description: (formData.get('description') as string) || undefined,
          requiredExtras: Number(formData.get('requiredExtras')) || 0,
        }

    startTransition(async () => {
      const result = scene ? await updateScene(input) : await createScene(input)

      if ('error' in result) {
        toast.error(result.error ?? 'אירעה שגיאה')
        return
      }

      toast.success(scene ? 'הסצנה עודכנה' : 'הסצנה נוצרה')
      onSuccess()
    })
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="scene-title" className={styles.label}>
          שם הסצנה *
        </label>
        <input
          type="text"
          id="scene-title"
          name="title"
          required
          defaultValue={scene?.title ?? ''}
          placeholder="שם הסצנה"
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="scene-description" className={styles.label}>
          תיאור
        </label>
        <textarea
          id="scene-description"
          name="description"
          defaultValue={scene?.description ?? ''}
          placeholder="תיאור הסצנה, לוק, מצב..."
          rows={3}
          className={styles.textarea}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="scene-required" className={styles.label}>
          מספר ניצבים נדרש
        </label>
        <input
          type="number"
          id="scene-required"
          name="requiredExtras"
          min="0"
          defaultValue={scene?.requiredExtras ?? 0}
          className={styles.input}
        />
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
          ביטול
        </Button>
        <Button type="submit" variant="primary" loading={isPending}>
          {scene ? 'שמור שינויים' : 'הוסף סצנה'}
        </Button>
      </div>
    </form>
  )
}

// src/components/shooting-days/SortableSceneList/index.tsx
'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import toast from 'react-hot-toast'
import { reorderScenes } from '@/actions/scenes'
import SceneBlock from '@/components/shooting-days/SceneBlock'
import type { Scene } from '@/db/schema/scenes'
import type { ExtraSlotData } from '@/actions/extra-scenes'
import styles from './SortableSceneList.module.css'

type Props = {
  scenes: Scene[]
  shootingDayId: number
  assignmentsBySceneId?: Record<number, ExtraSlotData[]>
  isReadOnly?: boolean
}

export default function SortableSceneList({
  scenes: initialScenes,
  shootingDayId,
  assignmentsBySceneId = {},
  isReadOnly,
}: Props) {
  const [sceneList, setSceneList] = useState(initialScenes)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sceneList.findIndex((s) => s.id === active.id)
    const newIndex = sceneList.findIndex((s) => s.id === over.id)
    const newOrder = arrayMove(sceneList, oldIndex, newIndex)

    setSceneList(newOrder) // optimistic update

    const result = await reorderScenes(shootingDayId, newOrder.map((s) => s.id))
    if ('error' in result) {
      setSceneList(initialScenes) // rollback
      toast.error('שגיאה בשמירת הסדר')
    }
  }

  if (sceneList.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>אין סצנות ליום זה. הוסף סצנה ראשונה.</p>
      </div>
    )
  }

  if (isReadOnly) {
    return (
      <div className={styles.list}>
        {sceneList.map((scene, index) => (
          <SceneBlock
            key={scene.id}
            scene={scene}
            sceneNumber={index + 1}
            assignments={assignmentsBySceneId[scene.id] ?? []}
            isReadOnly
          />
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sceneList.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.list}>
          {sceneList.map((scene, index) => (
            <SceneBlock
              key={scene.id}
              scene={scene}
              sceneNumber={index + 1}
              assignments={assignmentsBySceneId[scene.id] ?? []}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

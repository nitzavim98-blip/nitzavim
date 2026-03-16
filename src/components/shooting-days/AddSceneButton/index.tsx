'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import SceneForm from '@/components/shooting-days/SceneForm'
import styles from './AddSceneButton.module.css'

type Props = {
  shootingDayId: number
}

export default function AddSceneButton({ shootingDayId }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        <Plus size={16} />
        הוסף סצנה
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="סצנה חדשה">
        <SceneForm
          shootingDayId={shootingDayId}
          onSuccess={() => setIsOpen(false)}
          onCancel={() => setIsOpen(false)}
        />
      </Modal>
    </>
  )
}

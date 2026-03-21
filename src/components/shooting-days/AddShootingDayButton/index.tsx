'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ShootingDayForm from '@/components/shooting-days/ShootingDayForm'

type Props = {
  date: string
}

export default function AddShootingDayButton({ date }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  function handleSuccess() {
    setIsOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        <Plus size={16} />
        הוסף יום צילום
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="יום צילום חדש">
        <ShootingDayForm date={date} onSuccess={handleSuccess} />
      </Modal>
    </>
  )
}

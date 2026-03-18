'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getExtras } from '@/actions/extras'
import { assignExtra } from '@/actions/extra-scenes'
import styles from './QuickAssign.module.css'

type Props = {
  sceneId: number
  onAssigned: () => void
  onClose: () => void
}

export default function QuickAssign({ sceneId, onAssigned, onClose }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [allExtras, setAllExtras] = useState<Array<{ id: number; fullName: string; age: number | null }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAssigning, startAssignTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    setIsLoading(true)
    getExtras().then((result) => {
      setIsLoading(false)
      if ('data' in result && result.data) setAllExtras(result.data)
    })
  }, [])

  const filtered =
    query.trim().length >= 1
      ? allExtras.filter((e) =>
          e.fullName.toLowerCase().includes(query.toLowerCase())
        )
      : []

  function handleAssign(extra: { id: number; fullName: string; age: number | null }) {
    startAssignTransition(async () => {
      const result = await assignExtra(extra.id, sceneId)
      if ('error' in result) {
        toast.error(result.error ?? 'אירעה שגיאה')
        return
      }
      toast.success(`${extra.fullName} שובץ לסצנה`)
      router.refresh()
      onAssigned()
    })
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        <Search size={16} className={styles.searchIcon} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפש ניצב לפי שם..."
          className={styles.input}
          disabled={isAssigning}
        />
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="סגור חיפוש"
        >
          <X size={16} />
        </button>
      </div>

      {isLoading && <p className={styles.hint}>טוען...</p>}
      {!isLoading && query.trim() && filtered.length === 0 && (
        <p className={styles.hint}>לא נמצאו ניצבים</p>
      )}
      {filtered.length > 0 && (
        <div className={styles.results}>
          {filtered.slice(0, 6).map((extra) => (
            <button
              key={extra.id}
              className={styles.result}
              onClick={() => handleAssign(extra)}
              disabled={isAssigning}
            >
              <span className={styles.resultName}>{extra.fullName}</span>
              {extra.age != null && (
                <span className={styles.resultAge}>גיל {extra.age}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

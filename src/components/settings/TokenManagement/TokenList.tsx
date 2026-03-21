'use client'

import { useState } from 'react'
import { Copy, Plus, Link, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { createToken, deactivateToken } from '@/actions/tokens'
import type { RegistrationToken } from '@/db/schema/registration-tokens'
import styles from './TokenManagement.module.css'

interface TokenListProps {
  initialTokens: RegistrationToken[]
}

export default function TokenList({ initialTokens }: TokenListProps) {
  const [tokens, setTokens] = useState<RegistrationToken[]>(initialTokens)
  const [creating, setCreating] = useState(false)
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  function getRegistrationUrl(token: string): string {
    return `${window.location.origin}/register/${token}`
  }

  async function handleCreate() {
    setCreating(true)
    try {
      const result = await createToken()
      if ('error' in result) {
        toast.error(result.error ?? 'שגיאה ביצירת הלינק')
      } else {
        setTokens((prev) => [...prev, result.data])
        toast.success('לינק הרשמה חדש נוצר בהצלחה')
      }
    } catch {
      toast.error('שגיאה ביצירת הלינק')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeactivate(id: number) {
    setDeactivatingId(id)
    try {
      const result = await deactivateToken(id)
      if ('error' in result) {
        toast.error(result.error ?? 'שגיאה בהשהיית הלינק')
      } else {
        setTokens((prev) =>
          prev.map((t) => (t.id === id ? { ...t, isActive: false } : t))
        )
        toast.success('הלינק הושהה בהצלחה')
      }
    } catch {
      toast.error('שגיאה בהשהיית הלינק')
    } finally {
      setDeactivatingId(null)
    }
  }

  async function handleCopy(token: RegistrationToken) {
    const url = getRegistrationUrl(token.token)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(token.id)
      toast.success('הלינק הועתק ללוח')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error('שגיאה בהעתקת הלינק')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={creating}
          onClick={handleCreate}
        >
          <Plus size={16} />
          <span>צור לינק חדש</span>
        </Button>
      </div>

      {tokens.length === 0 ? (
        <div className={styles.emptyState}>
          <Link size={32} />
          <span>אין לינקי הרשמה. צור לינק חדש כדי להתחיל.</span>
        </div>
      ) : (
        <div className={styles.tokenList}>
          {tokens.map((token) => (
            <div key={token.id} className={styles.tokenCard}>
              <div className={styles.tokenHeader}>
                <div className={styles.tokenMeta}>
                  <span
                    className={`${styles.statusBadge} ${
                      token.isActive ? styles.statusActive : styles.statusInactive
                    }`}
                  >
                    {token.isActive ? (
                      <>
                        <CheckCircle size={12} />
                        <span>פעיל</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={12} />
                        <span>מושהה</span>
                      </>
                    )}
                  </span>
                  <span className={styles.createdDate}>
                    נוצר ב־{format(new Date(token.createdAt), 'dd/MM/yyyy', { locale: he })}
                  </span>
                </div>

                <div className={styles.tokenActions}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    title="העתק לינק"
                    onClick={() => handleCopy(token)}
                  >
                    <Copy size={16} />
                    <span>{copiedId === token.id ? 'הועתק!' : 'העתק'}</span>
                  </Button>

                  {token.isActive && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      loading={deactivatingId === token.id}
                      onClick={() => handleDeactivate(token.id)}
                    >
                      השהה
                    </Button>
                  )}
                </div>
              </div>

              <div className={styles.tokenUrl}>
                <Link size={14} />
                <span className={styles.urlText} dir="ltr">
                  {typeof window !== 'undefined'
                    ? getRegistrationUrl(token.token)
                    : `/register/${token.token}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

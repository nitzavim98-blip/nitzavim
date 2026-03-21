'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreVertical,
  Star,
  User,
  Car,
  PersonStanding,
  Calendar,
  Clapperboard,
  Info,
  Phone,
  MessageSquare,
  UserCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { deleteExtra, getExtraWithDetails, toggleFavorite } from '@/actions/extras'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import ExtraExpandableSection from '@/components/extras/ExtraExpandableSection'
import AttributesSection from '@/components/extras/sections/AttributesSection'
import AvailabilitySection from '@/components/extras/sections/AvailabilitySection'
import ScenesSection from '@/components/extras/sections/ScenesSection'
import MoreInfoSection from '@/components/extras/sections/MoreInfoSection'
import type { Extra } from '@/db/schema/extras'
import type { AttributeOption } from '@/db/schema/attribute-options'
import type { Availability } from '@/db/schema/availability'
import styles from './ExtraRow.module.css'

type Section = 'attributes' | 'availability' | 'scenes' | 'info'

interface ExtraDetails {
  attributes: Pick<AttributeOption, 'id' | 'label'>[]
  availability: Pick<Availability, 'date' | 'isAvailable'>[]
}

interface ExtraRowProps {
  extra: Extra
  thumbnailUrl?: string
}

export default function ExtraRow({ extra, thumbnailUrl }: ExtraRowProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isFavorite, setIsFavorite] = useState(extra.isFavorite)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeSection, setActiveSection] = useState<Section | null>(null)
  const [details, setDetails] = useState<ExtraDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleExpandClick(section: Section) {
    if (activeSection === section) {
      setActiveSection(null)
      return
    }
    setActiveSection(section)

    if (!details) {
      setLoadingDetails(true)
      const result = await getExtraWithDetails(extra.id)
      setLoadingDetails(false)
      if ('data' in result && result.data) {
        setDetails({
          attributes: result.data.attributes,
          availability: result.data.availability,
        })
      }
    }
  }

  function handleStarClick() {
    const next = !isFavorite
    setIsFavorite(next)
    startTransition(async () => {
      const result = await toggleFavorite(extra.id, next)
      if ('error' in result) {
        setIsFavorite(!next)
        toast.error(result.error ?? 'שגיאה')
      }
    })
  }

  function handleEdit() {
    setMenuOpen(false)
    router.push(`/extras/${extra.id}`)
  }

  function handleDeleteClick() {
    setMenuOpen(false)
    setShowDeleteModal(true)
  }

  async function handleConfirmDelete() {
    setDeleting(true)
    const result = await deleteExtra(extra.id)
    setDeleting(false)
    if ('error' in result) {
      toast.error(result.error ?? 'שגיאה')
    } else {
      toast.success('הניצב נמחק בהצלחה')
      setShowDeleteModal(false)
    }
  }

  const phoneLink = extra.phone ? `tel:${extra.phone}` : undefined
  const waLink = extra.phone
    ? `https://wa.me/${extra.phone.replace(/\D/g, '')}`
    : undefined

  const isOpen = activeSection !== null

  function expandBtn(section: Section, icon: React.ReactNode, label: string, muted = false) {
    const active = activeSection === section
    return (
      <button
        className={[
          styles.expandBtn,
          active ? styles.expandBtnActive : '',
          muted ? styles.expandBtnMuted : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => handleExpandClick(section)}
        aria-label={label}
        aria-expanded={active}
      >
        {icon}
        <span className={styles.expandLabel}>{label.split(' ')[0]}</span>
      </button>
    )
  }

  return (
    <>
      <div className={`${styles.card} ${isOpen ? styles.cardOpen : ''}`}>
        {/* Top row */}
        <div className={styles.row}>
          {/* Main content: top strip + expand buttons */}
          <div className={styles.rowMain}>
            <div className={styles.rowTop}>
              {/* ⋮ Three-dot menu */}
              <div className={styles.menuWrapper} ref={menuRef}>
                <button
                  className={styles.menuButton}
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="תפריט"
                  aria-expanded={menuOpen}
                >
                  <MoreVertical size={18} />
                </button>
                {menuOpen && (
                  <div className={styles.dropdown}>
                    <button className={styles.dropdownItem} onClick={handleEdit}>
                      עריכה
                    </button>
                    <button
                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                      onClick={handleDeleteClick}
                    >
                      מחיקה
                    </button>
                  </div>
                )}
              </div>

              {/* Star */}
              <button
                className={`${styles.starButton} ${isFavorite ? styles.starActive : ''}`}
                onClick={handleStarClick}
                aria-label={isFavorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
                disabled={isPending}
              >
                <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>

              {/* Gender icon */}
              <span
                className={styles.genderIcon}
                style={{ color: extra.gender === 1 ? 'var(--color-male)' : 'var(--color-female)' }}
                aria-label={extra.gender === 1 ? 'זכר' : 'נקבה'}
              >
                <User size={20} />
              </span>

              {/* Identity */}
              <div className={styles.identity}>
                <span className={styles.name}>{extra.fullName}</span>
                <div className={styles.meta}>
                  {extra.age != null && (
                    <span className={styles.age}>גיל: {extra.age}</span>
                  )}
                  {extra.hasCar && (
                    <span className={styles.carIcon} aria-label="יש רכב">
                      <Car size={16} color="var(--color-primary)" />
                    </span>
                  )}
                </div>
              </div>

              {/* Contact */}
              <div className={styles.contact}>
                {phoneLink ? (
                  <a href={phoneLink} className={styles.contactBtn} aria-label="התקשר">
                    <Phone size={20} />
                  </a>
                ) : (
                  <span className={`${styles.contactBtn} ${styles.contactDisabled}`}>
                    <Phone size={20} />
                  </span>
                )}
                {waLink ? (
                  <a
                    href={waLink}
                    className={`${styles.contactBtn} ${styles.contactWa}`}
                    aria-label="שלח הודעת וואטסאפ"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageSquare size={20} />
                  </a>
                ) : (
                  <span className={`${styles.contactBtn} ${styles.contactDisabled}`}>
                    <MessageSquare size={20} />
                  </span>
                )}
              </div>
            </div>

            {/* 4 expand buttons */}
            <div className={styles.expandButtons}>
              {expandBtn('attributes', <PersonStanding size={20} />, 'מאפיינים פיזיים')}
              {expandBtn('availability', <Calendar size={20} />, 'תאריכים נוחים')}
              {expandBtn('scenes', <Clapperboard size={20} />, 'סצנות')}
              {expandBtn('info', <Info size={20} />, 'מידע נוסף')}
            </div>
          </div>

          {/* Thumbnail */}
          <div className={styles.thumbnail} aria-hidden="true">
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnailUrl} alt="" className={styles.thumbnailImg} />
            ) : (
              <UserCircle2 size={36} color="var(--color-text-muted)" />
            )}
          </div>
        </div>

        {/* Expandable sections */}
        <ExtraExpandableSection isOpen={activeSection === 'attributes'}>
          <div className={styles.sectionInner}>
            {loadingDetails ? (
              <p className={styles.loading}>טוען...</p>
            ) : (
              <AttributesSection attributes={details?.attributes ?? []} />
            )}
          </div>
        </ExtraExpandableSection>

        <ExtraExpandableSection isOpen={activeSection === 'availability'}>
          <div className={styles.sectionInner}>
            {loadingDetails ? (
              <p className={styles.loading}>טוען...</p>
            ) : (
              <AvailabilitySection availability={details?.availability ?? []} />
            )}
          </div>
        </ExtraExpandableSection>

        <ExtraExpandableSection isOpen={activeSection === 'scenes'}>
          <div className={styles.sectionInner}>
            <ScenesSection extraId={extra.id} isExpanded={activeSection === 'scenes'} />
          </div>
        </ExtraExpandableSection>

        <ExtraExpandableSection isOpen={activeSection === 'info'}>
          <div className={styles.sectionInner}>
            <MoreInfoSection
                notes={extra.notes}
                reliability={extra.reliability}
                age={extra.age}
                hasCar={extra.hasCar}
                isFavorite={isFavorite}
                onToggleFavorite={handleStarClick}
              />
          </div>
        </ExtraExpandableSection>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="מחיקת ניצב"
      >
        <p className={styles.deleteText}>
          האם למחוק את <strong>{extra.fullName}</strong>?
        </p>
        <p className={styles.deleteSubtext}>פעולה זו אינה ניתנת לביטול</p>
        <div className={styles.deleteActions}>
          <Button variant="danger" onClick={handleConfirmDelete} loading={deleting}>
            מחיקה
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={deleting}
          >
            ביטול
          </Button>
        </div>
      </Modal>
    </>
  )
}

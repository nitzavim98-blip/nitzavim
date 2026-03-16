'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import imageCompression from 'browser-image-compression'
import { createExtra, updateExtra } from '@/actions/extras'
import { syncExtraAttributes } from '@/actions/attributes'
import { syncAvailability } from '@/actions/availability'
import { createPhoto } from '@/actions/photos'
import Button from '@/components/ui/Button'
import AttributePicker from '@/components/extras/AttributePicker'
import AvailabilityPicker from '@/components/extras/AvailabilityPicker'
import PhotoUploader, { type PhotoItem } from '@/components/extras/PhotoUploader'
import type { Extra } from '@/db/schema/extras'
import type { AttributeOption } from '@/db/schema/attribute-options'
import type { AvailabilityRecord } from '@/lib/validations/extra'
import styles from './ExtraForm.module.css'

const COMPRESSION_OPTIONS = {
  maxWidthOrHeight: 400,
  useWebWorker: true,
  fileType: 'image/webp' as const,
  initialQuality: 0.7,
}

interface ExtraFormProps {
  extra?: Extra
  allOptions: AttributeOption[]
  initialAttributeIds?: number[]
  initialAvailability?: AvailabilityRecord[]
  initialPhotos?: PhotoItem[]
}

const RELIABILITY_OPTIONS = [
  { value: 0, label: 'לא אמין' },
  { value: 1, label: 'בסדר' },
  { value: 2, label: 'אמין' },
]

export default function ExtraForm({
  extra,
  allOptions,
  initialAttributeIds = [],
  initialAvailability = [],
  initialPhotos = [],
}: ExtraFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [fullName, setFullName] = useState(extra?.fullName ?? '')
  const [phone, setPhone] = useState(extra?.phone ?? '')
  const [gender, setGender] = useState<number>(extra?.gender ?? 1)
  const [age, setAge] = useState<string>(extra?.age != null ? String(extra.age) : '')
  const [height, setHeight] = useState<string>(extra?.height != null ? String(extra.height) : '')
  const [weight, setWeight] = useState<string>(extra?.weight != null ? String(extra.weight) : '')
  const [hasCar, setHasCar] = useState(extra?.hasCar ?? false)
  const [reliability, setReliability] = useState<number>(extra?.reliability ?? 2)
  const [notes, setNotes] = useState(extra?.notes ?? '')

  const [attributeOptions, setAttributeOptions] = useState<AttributeOption[]>(allOptions)
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<number[]>(initialAttributeIds)
  const [availabilityRecords, setAvailabilityRecords] =
    useState<AvailabilityRecord[]>(initialAvailability)
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState<File[]>([])

  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleOptionCreated(option: AttributeOption) {
    setAttributeOptions((prev) => [...prev, option])
  }

  function buildPayload() {
    return {
      fullName,
      phone: phone || null,
      gender,
      age: age ? parseInt(age, 10) : null,
      height: height ? parseInt(height, 10) : null,
      weight: weight ? parseInt(weight, 10) : null,
      hasCar,
      reliability,
      notes: notes || null,
    }
  }

  async function uploadPendingPhotos(extraId: number, files: File[]) {
    for (let i = 0; i < files.length; i++) {
      try {
        const compressed = await imageCompression(files[i], COMPRESSION_OPTIONS)

        const presignRes = await fetch('/api/upload/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extraId }),
        })
        if (!presignRes.ok) continue

        const { uploadUrl, key } = await presignRes.json()
        await fetch(uploadUrl, {
          method: 'PUT',
          body: compressed,
          headers: { 'Content-Type': 'image/webp' },
        })

        await createPhoto({ extraId, r2Key: key, sortOrder: i })
      } catch {
        // Non-fatal: extra was created, skip failed photo
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    if (!fullName.trim()) {
      setErrors({ fullName: 'שם מלא הוא שדה חובה' })
      return
    }

    startTransition(async () => {
      const payload = buildPayload()
      const result = extra
        ? await updateExtra(extra.id, payload)
        : await createExtra(payload)

      if ('error' in result) {
        toast.error(result.error ?? 'שגיאה')
        return
      }

      const extraId = result.data.id

      // Sync attributes and availability in parallel; upload pending photos sequentially
      await Promise.all([
        syncExtraAttributes(extraId, selectedAttributeIds),
        syncAvailability(extraId, availabilityRecords),
      ])

      if (pendingPhotoFiles.length > 0) {
        await uploadPendingPhotos(extraId, pendingPhotoFiles)
      }

      toast.success(extra ? 'הניצב עודכן בהצלחה' : 'הניצב נוסף בהצלחה')
      router.push('/extras')
    })
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {/* Full name */}
      <div className={styles.field}>
        <label htmlFor="fullName" className={styles.label}>
          שם מלא <span className={styles.required}>*</span>
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={`${styles.input} ${errors.fullName ? styles.inputError : ''}`}
          placeholder="ישראל ישראלי"
          autoComplete="name"
        />
        {errors.fullName && (
          <span className={styles.errorMsg}>{errors.fullName}</span>
        )}
      </div>

      {/* Phone */}
      <div className={styles.field}>
        <label htmlFor="phone" className={styles.label}>טלפון</label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={styles.input}
          placeholder="050-0000000"
          autoComplete="tel"
          dir="ltr"
        />
      </div>

      {/* Gender */}
      <div className={styles.field}>
        <span className={styles.label}>מגדר</span>
        <div className={styles.genderToggle}>
          <label className={`${styles.genderOption} ${gender === 1 ? styles.genderActive : ''}`}>
            <input
              type="radio"
              name="gender"
              value={1}
              checked={gender === 1}
              onChange={() => setGender(1)}
              className={styles.hiddenRadio}
            />
            זכר
          </label>
          <label className={`${styles.genderOption} ${gender === 0 ? styles.genderActive : ''}`}>
            <input
              type="radio"
              name="gender"
              value={0}
              checked={gender === 0}
              onChange={() => setGender(0)}
              className={styles.hiddenRadio}
            />
            נקבה
          </label>
        </div>
      </div>

      {/* Age / Height / Weight row */}
      <div className={styles.row3}>
        <div className={styles.field}>
          <label htmlFor="age" className={styles.label}>גיל</label>
          <input
            id="age"
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className={styles.input}
            placeholder="25"
            min={1}
            max={120}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="height" className={styles.label}>גובה (ס&quot;מ)</label>
          <input
            id="height"
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className={styles.input}
            placeholder="170"
            min={100}
            max={250}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="weight" className={styles.label}>משקל (ק&quot;ג)</label>
          <input
            id="weight"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={styles.input}
            placeholder="70"
            min={30}
            max={250}
          />
        </div>
      </div>

      {/* Has car */}
      <div className={styles.field}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={hasCar}
            onChange={(e) => setHasCar(e.target.checked)}
            className={styles.checkbox}
          />
          יש רכב
        </label>
      </div>

      {/* Reliability */}
      <div className={styles.field}>
        <span className={styles.label}>אמינות</span>
        <div className={styles.reliabilityGroup}>
          {RELIABILITY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`${styles.reliabilityOption} ${reliability === opt.value ? styles.reliabilityActive : ''}`}
            >
              <input
                type="radio"
                name="reliability"
                value={opt.value}
                checked={reliability === opt.value}
                onChange={() => setReliability(opt.value)}
                className={styles.hiddenRadio}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className={styles.field}>
        <label htmlFor="notes" className={styles.label}>הערות</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={styles.textarea}
          placeholder="הערות חופשיות על הניצב..."
          rows={3}
        />
      </div>

      {/* Physical attributes */}
      <div className={styles.field}>
        <span className={styles.label}>מאפיינים פיזיים</span>
        <AttributePicker
          allOptions={attributeOptions}
          selectedIds={selectedAttributeIds}
          onChange={setSelectedAttributeIds}
          onOptionCreated={handleOptionCreated}
        />
      </div>

      {/* Availability */}
      <div className={styles.field}>
        <span className={styles.label}>תאריכים נוחים</span>
        <AvailabilityPicker
          records={availabilityRecords}
          onChange={setAvailabilityRecords}
        />
      </div>

      {/* Photos */}
      <div className={styles.field}>
        <span className={styles.label}>תמונות</span>
        <PhotoUploader
          extraId={extra?.id}
          initialPhotos={initialPhotos}
          onPendingFilesChange={setPendingPhotoFiles}
        />
      </div>

      {/* WhatsApp import — coming soon placeholder */}
      <div className={styles.comingSoon}>
        <Button type="button" variant="ghost" disabled size="sm">
          ייבוא מוואטסאפ — בקרוב
        </Button>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <Button type="submit" loading={isPending}>
          {extra ? 'שמור שינויים' : 'הוסף ניצב'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/extras')}
          disabled={isPending}
        >
          ביטול
        </Button>
      </div>
    </form>
  )
}

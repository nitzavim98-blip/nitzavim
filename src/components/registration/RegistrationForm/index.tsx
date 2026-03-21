'use client'

import { useState, useTransition, useRef } from 'react'
import imageCompression from 'browser-image-compression'
import { submitRegistration, addPublicPhoto } from '@/actions/registration'
import AvailabilityPicker from '@/components/extras/AvailabilityPicker'
import type { AvailabilityRecord } from '@/lib/validations/extra'
import { CheckCircle, Camera, X } from 'lucide-react'
import styles from './RegistrationForm.module.css'

const COMPRESSION_OPTIONS = {
  maxWidthOrHeight: 400,
  useWebWorker: true,
  fileType: 'image/webp' as const,
  initialQuality: 0.7,
}

interface Props {
  token: string
}

export default function RegistrationForm({ token }: Props) {
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState<number>(1)
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [hasCar, setHasCar] = useState(false)
  const [notes, setNotes] = useState('')
  const [availabilityRecords, setAvailabilityRecords] = useState<AvailabilityRecord[]>([])
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const remaining = 3 - photoFiles.length
    const newFiles = files.slice(0, remaining)

    const newUrls = newFiles.map((f) => URL.createObjectURL(f))
    setPhotoFiles((prev) => [...prev, ...newFiles])
    setPhotoPreviewUrls((prev) => [...prev, ...newUrls])
    // Reset input so same file can be re-added if removed
    e.target.value = ''
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photoPreviewUrls[index])
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadPhotos(extraId: number) {
    for (let i = 0; i < photoFiles.length; i++) {
      try {
        const compressed = await imageCompression(photoFiles[i], COMPRESSION_OPTIONS)

        const presignRes = await fetch('/api/register/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-registration-token': token,
          },
          body: JSON.stringify({ extraId }),
        })
        if (!presignRes.ok) continue

        const { uploadUrl, key } = await presignRes.json()
        await fetch(uploadUrl, {
          method: 'PUT',
          body: compressed,
          headers: { 'Content-Type': 'image/webp' },
        })

        await addPublicPhoto(extraId, key, i, token)
      } catch {
        // Non-fatal: skip failed photo
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setSubmitError(null)

    if (!fullName.trim()) {
      setErrors({ fullName: 'שם מלא הוא שדה חובה' })
      return
    }

    startTransition(async () => {
      const result = await submitRegistration({
        fullName,
        phone: phone || null,
        email: email || null,
        gender,
        age: age ? parseInt(age, 10) : null,
        height: height ? parseInt(height, 10) : null,
        weight: weight ? parseInt(weight, 10) : null,
        hasCar,
        notes: notes || null,
        token,
        availability: availabilityRecords,
      })

      if ('error' in result) {
        if (result.error === 'rate_limited') {
          setSubmitError('נסה שוב מאוחר יותר')
        } else {
          setSubmitError(result.error ?? 'אירעה שגיאה')
        }
        return
      }

      const { extraId } = result.data
      if (photoFiles.length > 0) {
        await uploadPhotos(extraId)
      }

      setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <div className={styles.success}>
        <CheckCircle size={56} className={styles.successIcon} />
        <h2 className={styles.successTitle}>תודה, הפרטים נקלטו!</h2>
        <p className={styles.successText}>הפרטים שלך נשמרו בהצלחה. נשמח לראותך בצילומים.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {/* Full name */}
      <div className={styles.field}>
        <label htmlFor="fullName" className={styles.label}>
          שם מלא <span className={styles.labelHint}>(חובה)</span>
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
        {errors.fullName && <span className={styles.errorMsg}>{errors.fullName}</span>}
      </div>

      {/* Phone */}
      <div className={styles.field}>
        <label htmlFor="phone" className={styles.label}>
          טלפון <span className={styles.labelHint}>(חובה)</span>
        </label>
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

      {/* Email */}
      <div className={styles.field}>
        <label htmlFor="email" className={styles.label}>
          אימייל <span className={styles.labelHint}>(לא חובה)</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
          placeholder="example@email.com"
          autoComplete="email"
          dir="ltr"
        />
      </div>

      {/* Gender + Has car — one row */}
      <div className={styles.rowGenderCar}>
        <div className={styles.field}>
          <span className={styles.label}>מגדר <span className={styles.labelHint}>(חובה)</span></span>
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
        <div className={styles.field}>
          <span className={styles.label}>&nbsp;</span>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={hasCar}
              onChange={(e) => setHasCar(e.target.checked)}
              className={styles.checkbox}
            />
            יש לי רכב
          </label>
        </div>
      </div>

      {/* Age / Height / Weight */}
      <div className={styles.row3}>
        <div className={styles.field}>
          <label htmlFor="age" className={styles.label}>
            גיל <span className={styles.labelHint}>(לא חובה)</span>
          </label>
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
          <label htmlFor="height" className={styles.label}>
            גובה <span className={styles.labelHint}>(לא חובה)</span>
          </label>
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
          <label htmlFor="weight" className={styles.label}>
            משקל <span className={styles.labelHint}>(לא חובה)</span>
          </label>
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

      {/* Availability */}
      <div className={styles.field}>
        <span className={styles.label}>תאריכים נוחים <span className={styles.labelHint}>(לא חובה)</span></span>
        <AvailabilityPicker
          records={availabilityRecords}
          onChange={setAvailabilityRecords}
        />
      </div>

      {/* Notes */}
      <div className={styles.field}>
        <label htmlFor="notes" className={styles.label}>
          הערות <span className={styles.labelHint}>(לא חובה)</span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={styles.textarea}
          placeholder="כל מידע נוסף שתרצה לשתף..."
          rows={3}
        />
      </div>

      {/* Photos */}
      <div className={styles.field}>
        <span className={styles.label}>תמונות (עד 3)</span>
        <div className={styles.photoGrid}>
          {photoPreviewUrls.map((url, i) => (
            <div key={url} className={styles.photoThumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`תמונה ${i + 1}`} className={styles.thumbImg} />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className={styles.removePhoto}
                aria-label="הסר תמונה"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {photoFiles.length < 3 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={styles.addPhotoBtn}
            >
              <Camera size={20} />
              <span>הוסף תמונה</span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoChange}
          className={styles.hiddenInput}
        />
      </div>

      {submitError && <p className={styles.submitError}>{submitError}</p>}

      <div className={styles.actions}>
        <button type="submit" disabled={isPending} className={styles.submitBtn}>
          {isPending ? 'שולח...' : 'שלח פרטים'}
        </button>
      </div>
    </form>
  )
}

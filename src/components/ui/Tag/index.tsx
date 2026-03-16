import styles from './Tag.module.css'

const TAG_PALETTE_COUNT = 5

interface TagProps {
  label: string
  index?: number
  className?: string
}

export default function Tag({ label, index = 0, className }: TagProps) {
  const palette = (index % TAG_PALETTE_COUNT) + 1
  return (
    <span
      className={`${styles.tag} ${styles[`tag${palette}`]} ${className ?? ''}`}
    >
      {label}
    </span>
  )
}

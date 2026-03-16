import styles from './Skeleton.module.css'

interface SkeletonProps {
  width?: string
  height?: string
  borderRadius?: string
  className?: string
}

export function Skeleton({ width, height, borderRadius, className }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className ?? ''}`}
      style={{ width, height, borderRadius }}
    />
  )
}

export function ExtraRowSkeleton() {
  return (
    <div className={styles.rowSkeleton}>
      <Skeleton width="32px" height="32px" borderRadius="6px" />
      <Skeleton width="32px" height="32px" borderRadius="50%" />
      <Skeleton width="20px" height="20px" borderRadius="50%" />
      <div className={styles.identityGroup}>
        <Skeleton width="120px" height="16px" borderRadius="4px" />
        <Skeleton width="60px" height="14px" borderRadius="4px" />
      </div>
      <div className={styles.expandGroup}>
        <Skeleton width="44px" height="44px" borderRadius="8px" />
        <Skeleton width="44px" height="44px" borderRadius="8px" />
        <Skeleton width="44px" height="44px" borderRadius="8px" />
        <Skeleton width="44px" height="44px" borderRadius="8px" />
      </div>
      <div className={styles.contactGroup}>
        <Skeleton width="40px" height="40px" borderRadius="50%" />
        <Skeleton width="40px" height="40px" borderRadius="50%" />
      </div>
      <Skeleton width="48px" height="48px" borderRadius="8px" />
    </div>
  )
}

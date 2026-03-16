import Tag from '@/components/ui/Tag'
import type { AttributeOption } from '@/db/schema/attribute-options'
import styles from './AttributesSection.module.css'

interface AttributesSectionProps {
  attributes: Pick<AttributeOption, 'id' | 'label'>[]
}

export default function AttributesSection({ attributes }: AttributesSectionProps) {
  if (attributes.length === 0) {
    return <p className={styles.empty}>אין מאפיינים פיזיים</p>
  }

  return (
    <div className={styles.tags}>
      {attributes.map((attr, idx) => (
        <Tag key={attr.id} label={attr.label} index={idx} />
      ))}
    </div>
  )
}

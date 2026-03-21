import { AlertCircle } from 'lucide-react'
import { getAttributeOptions } from '@/actions/attributes'
import AttributeOptionsList from './AttributeOptionsList'
import styles from './AttributeOptions.module.css'

export default async function AttributeOptions() {
  const result = await getAttributeOptions()

  if ('error' in result) {
    return (
      <div className={styles.errorState}>
        <AlertCircle size={20} />
        <span>{result.error}</span>
      </div>
    )
  }

  return <AttributeOptionsList initialOptions={result.data} />
}

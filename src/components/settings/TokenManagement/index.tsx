import { AlertCircle } from 'lucide-react'
import { getTokens } from '@/actions/tokens'
import TokenList from './TokenList'
import styles from './TokenManagement.module.css'

export default async function TokenManagement() {
  const result = await getTokens()

  if ('error' in result) {
    return (
      <div className={styles.errorState}>
        <AlertCircle size={20} />
        <span>{String(result.error)}</span>
      </div>
    )
  }

  return <TokenList initialTokens={result.data} />
}

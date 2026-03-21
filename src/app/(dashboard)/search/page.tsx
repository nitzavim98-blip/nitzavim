import { X } from 'lucide-react'
import Link from 'next/link'
import { getAttributeOptions } from '@/actions/attributes'
import { getScenesForPicker, getSceneContext } from '@/actions/scenes'
import { searchExtras } from '@/actions/search'
import { getCurrentUser } from '@/actions/auth'
import type { SearchFilters } from '@/lib/validations/search'
import type { SceneContextData } from '@/actions/scenes'
import type { SearchResult } from '@/actions/search'
import SearchForm from '@/components/search/SearchForm'
import SearchResults from '@/components/search/SearchResults'
import styles from './search-page.module.css'

function parseSearchParams(sp: {
  [key: string]: string | string[] | undefined
}): SearchFilters {
  const get = (key: string) =>
    typeof sp[key] === 'string' ? (sp[key] as string) : undefined

  const q = get('q') || undefined

  const rawAttributeIds = get('attributeIds')
  const attributeIds = rawAttributeIds
    ? rawAttributeIds
        .split(',')
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0)
    : undefined

  const rawMinAge = get('minAge')
  const minAge =
    rawMinAge !== undefined && !isNaN(Number(rawMinAge))
      ? Number(rawMinAge)
      : undefined

  const rawMaxAge = get('maxAge')
  const maxAge =
    rawMaxAge !== undefined && !isNaN(Number(rawMaxAge))
      ? Number(rawMaxAge)
      : undefined

  const rawGender = get('gender')
  const gender =
    rawGender === '0' ? 0 : rawGender === '1' ? 1 : undefined

  const availableOnDate = get('availableOnDate') || undefined

  const hasCar = get('hasCar') === 'true' ? true : undefined

  return { q, attributeIds, minAge, maxAge, gender, availableOnDate, hasCar }
}

function hasAnyFilter(f: SearchFilters): boolean {
  return !!(
    f.q ||
    (f.attributeIds && f.attributeIds.length > 0) ||
    f.minAge !== undefined ||
    f.maxAge !== undefined ||
    f.gender !== undefined ||
    f.availableOnDate ||
    f.hasCar !== undefined
  )
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const filters = parseSearchParams(sp)
  const rawSceneId =
    typeof sp.sceneId === 'string'
      ? Number(sp.sceneId)
      : undefined
  const sceneId =
    rawSceneId !== undefined && !isNaN(rawSceneId) ? rawSceneId : undefined

  // Parallel fetches — note: getSceneContext runs separately after if sceneId present
  const [attrResult, pickerResult, user] = await Promise.all([
    getAttributeOptions(),
    getScenesForPicker(),
    getCurrentUser(),
  ])

  const attributeOptions = 'data' in attrResult ? attrResult.data : []
  const pickerScenes = 'data' in pickerResult ? pickerResult.data : []
  const userRole = user?.role ?? 'guest'

  // Fetch scene context via server action (no direct db import in pages)
  let sceneContext: SceneContextData | undefined

  if (sceneId) {
    const ctxResult = await getSceneContext(sceneId)
    if ('data' in ctxResult) sceneContext = ctxResult.data
  }

  // Run search if any filter is active
  let results: SearchResult[] | null = null
  if (hasAnyFilter(filters)) {
    const searchResult = await searchExtras(filters)
    results = 'data' in searchResult ? (searchResult.data ?? null) : []
  }

  return (
    <div className={styles.page}>
      {sceneContext && (
        <div className={styles.contextBanner}>
          <span>
            משבץ ניצב לסצנה:{' '}
            <strong>{sceneContext.scene.title}</strong>
          </span>
          <Link
            href={`/shooting-days/${sceneContext.shootingDay.id}`}
            className={styles.contextClose}
            aria-label="בטל שיבוץ וחזור ליום הצילום"
          >
            <X size={16} />
          </Link>
        </div>
      )}

      <div className={styles.layout}>
        <SearchForm
          initialFilters={filters}
          attributeOptions={attributeOptions}
          sceneId={sceneId}
        />

        <main className={styles.content}>
          <SearchResults
            results={results}
            sceneId={sceneId}
            sceneContext={sceneContext}
            pickerScenes={pickerScenes}
            userRole={userRole}
          />
        </main>
      </div>
    </div>
  )
}

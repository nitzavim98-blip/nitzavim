import { notFound, redirect } from 'next/navigation'
import { getShootingDay } from '@/actions/shooting-days'

interface ShootingDayDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ShootingDayDetailPage({ params }: ShootingDayDetailPageProps) {
  const { id: rawId } = await params
  const id = Number(rawId)
  if (isNaN(id)) notFound()

  const result = await getShootingDay(id)
  if ('error' in result) notFound()

  redirect(`/shooting-days?date=${result.data.date}`)
}

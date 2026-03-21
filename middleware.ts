import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = ['/login', '/api/auth', '/api/register']
const registrationPattern = /^\/register\//

export default auth(function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public routes and registration paths
  const isPublic =
    publicRoutes.some((route) => pathname.startsWith(route)) ||
    registrationPattern.test(pathname)

  if (isPublic) {
    return NextResponse.next()
  }

  // @ts-expect-error - auth adds session to request
  const session = req.auth

  if (!session) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

import type { Metadata } from 'next'
import { Heebo } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const heebo = Heebo({
  subsets: ['latin', 'hebrew'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'שיבוץ+ ניצבים',
  description: 'מערכת ניהול ניצבים',
  icons: {
    icon: [
      { url: '/logo32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/logo192.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl" className={heebo.className}>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: 'Heebo, Rubik, Assistant, sans-serif',
              fontSize: '0.875rem',
              direction: 'rtl',
            },
          }}
        />
      </body>
    </html>
  )
}

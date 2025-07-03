import './globals.scss'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'
import { StoreProvider } from '@/stores'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en'>
      <body>
        <StoreProvider>{children}</StoreProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}

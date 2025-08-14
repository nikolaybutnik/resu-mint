import './globals.scss'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'
import { StoreProvider } from '@/stores'
import Toasts from '@/components/shared/Toast/Toast'
import ConfirmOverlay from '@/components/shared/Confirm/ConfirmOverlay'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en'>
      <body>
        <StoreProvider>{children}</StoreProvider>
        <Toasts />
        <ConfirmOverlay />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}

import './globals.css'
import { Inter } from 'next/font/google'
import Sidebar from './components/Sidebar'
const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Teller',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Sidebar />
        {children}
      </body>
    </html>
  )
}

import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Square Associates | Private Company Intelligence',
  description: 'Institutional-grade financial intelligence and AI valuation platform for private companies worldwide.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="min-h-screen bg-[#05070b] text-slate-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

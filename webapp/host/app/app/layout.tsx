import React, { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>TRK Host (placeholder)</title>
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}

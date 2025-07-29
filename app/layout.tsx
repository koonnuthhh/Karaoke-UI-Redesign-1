import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { siteConfig } from "../config/site-config"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: `${siteConfig.business.name} - ${siteConfig.business.tagline}`,
  description: `Book your karaoke room at ${siteConfig.business.name}. ${siteConfig.content.hero.subtitle}`,
  keywords: "karaoke, booking, rooms, entertainment, singing, party",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

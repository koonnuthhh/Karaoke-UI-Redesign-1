import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { siteConfig } from "../config/site-config"
import { MaintenanceWrapper } from "@/components/maintenance-wrapper"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: `${siteConfig.business.name} - ${siteConfig.business.tagline}`,
  description: `Book your karaoke room at ${siteConfig.business.name}.`,
  keywords: "karaoke, booking, rooms, entertainment, singing, party, music,alurfia, karaoke in shelter, karaoke in chiangrai, karaoke in thailand, alurfia",
  icons: {
    icon: "/favicon.ico", // ✅ Adjust the path and format if needed
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <MaintenanceWrapper>{children}</MaintenanceWrapper>
      </body>
    </html>
  )
}

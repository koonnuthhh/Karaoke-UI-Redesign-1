"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getAdminUser } from "@/lib/admin-service"

interface MaintenanceWrapperProps {
  children: React.ReactNode
}

export function MaintenanceWrapper({ children }: MaintenanceWrapperProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [shouldShowMaintenance, setShouldShowMaintenance] = useState(false)

  useEffect(() => {
    checkMaintenanceStatus()
  }, [pathname])

  const checkMaintenanceStatus = async () => {
    try {
      // Skip maintenance check for admin pages
      if (pathname.startsWith("/admin")) {
        setIsLoading(false)
        return
      }

      // Check environment variable first (takes priority)
      const envMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE
      
      let isMaintenanceEnabled = false

      if (envMaintenance !== undefined) {
        // Environment variable is set - use it as the source of truth
        isMaintenanceEnabled = envMaintenance === "true"
      } else {
        // Fallback to API if env var is not set
        try {
          const response = await fetch("/api/admin/settings")
          const result = await response.json()
          isMaintenanceEnabled = result.success && result.data.value === true
        } catch (error) {
          console.error("Error fetching maintenance status from API:", error)
          isMaintenanceEnabled = false
        }
      }

      // If on maintenance page
      if (pathname === "/maintenance") {
        // If maintenance is OFF, redirect to calendar
        if (!isMaintenanceEnabled) {
          router.push("/")
        }
        // If maintenance is ON, allow viewing maintenance page
        setIsLoading(false)
        return
      }

      // For all other non-admin pages
      if (isMaintenanceEnabled) {
        // Maintenance is enabled - redirect to maintenance page
        setShouldShowMaintenance(true)
        router.push("/maintenance")
      } else {
        setShouldShowMaintenance(false)
      }
    } catch (error) {
      console.error("Error checking maintenance status:", error)
      setShouldShowMaintenance(false)
    } finally {
      setIsLoading(false)
    }
  }

  // If loading, show nothing (or loading state)
  if (isLoading) {
    return null
  }

  return <>{children}</>
}

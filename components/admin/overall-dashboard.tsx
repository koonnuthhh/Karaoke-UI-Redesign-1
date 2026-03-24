"use client"

import { Users, DoorOpen, Gift, Plus, Calendar, Power, AlertCircle, Check, Loader2 } from "lucide-react"
import { getAdminUser } from "@/lib/admin-service"
import { DashboardVisualization } from "./dashboard-visualization"
import { useState, useEffect } from "react"
import type { Admin, Room, Promotion } from "@/types"

interface OverallDashboardProps {
  admins: Admin[]
  rooms: Room[]
  promotions: Promotion[]
  onNavigateToAdmins: () => void
  onNavigateToRooms: () => void
  onNavigateToCalendar: () => void
}

export function OverallDashboard({
  admins,
  rooms,
  promotions,
  onNavigateToAdmins,
  onNavigateToRooms,
  onNavigateToCalendar,
}: OverallDashboardProps) {
  const [isMaintenanceEnabled, setIsMaintenanceEnabled] = useState(false)
  const [maintenanceLoading, setMaintenanceLoading] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const currentUser = getAdminUser()
  const isModulator = currentUser?.role === "modulator"

  useEffect(() => {
    if (!isModulator) {
      loadMaintenanceStatus()
    }
  }, [isModulator])

  const loadMaintenanceStatus = async () => {
    try {
      const response = await fetch("/api/admin/settings")
      const result = await response.json()
      if (result.success) {
        setIsMaintenanceEnabled(result.data.value)
      }
    } catch (error) {
      console.error("Error loading maintenance status:", error)
    }
  }

  const handleToggleMaintenance = async () => {
    setMaintenanceLoading(true)
    setMaintenanceMessage(null)

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            is_enabled: !isMaintenanceEnabled,
            admin_id: "admin_user",
          },
        }),
      })

      const result = await response.json()

      if (result.success) {
        setIsMaintenanceEnabled(result.data.value)
        setMaintenanceMessage({
          type: "success",
          text: `Maintenance ${result.data.value ? "enabled" : "disabled"}`,
        })
        setTimeout(() => setMaintenanceMessage(null), 3000)
      } else {
        setMaintenanceMessage({
          type: "error",
          text: "Failed to update",
        })
      }
    } catch (error) {
      console.error("Error updating maintenance status:", error)
      setMaintenanceMessage({
        type: "error",
        text: "Error updating",
      })
    } finally {
      setMaintenanceLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Welcome to Admin Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm">Total Admins</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{admins.length}</p>
            </div>
            <Users className="w-8 sm:w-12 h-8 sm:h-12 text-blue-500 opacity-20 flex-shrink-0" />
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm">Total Rooms</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{rooms.length}</p>
            </div>
            <DoorOpen className="w-8 sm:w-12 h-8 sm:h-12 text-green-500 opacity-20 flex-shrink-0" />
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm">Total Promotions</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{promotions.length}</p>
            </div>
            <Gift className="w-8 sm:w-12 h-8 sm:h-12 text-purple-500 opacity-20 flex-shrink-0" />
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div>
            <p className="text-gray-600 text-xs sm:text-sm">Quick Actions</p>
            {getAdminUser()?.role === "admin" ? (
              <div className="flex gap-1 sm:gap-2 mt-3 sm:mt-4 flex-wrap">
                <button
                  onClick={onNavigateToAdmins}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition"
                >
                  + Admin
                </button>
                <button
                  onClick={onNavigateToRooms}
                  className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition"
                >
                  + Room
                </button>
                <button
                  onClick={onNavigateToCalendar}
                  className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600 transition"
                >
                  📅 Calendar
                </button>
                <button
                  onClick={handleToggleMaintenance}
                  disabled={maintenanceLoading}
                  className={`text-xs text-white px-2 py-1 rounded transition flex items-center gap-1 ${
                    isMaintenanceEnabled
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  } disabled:opacity-50`}
                  title={isMaintenanceEnabled ? "Disable maintenance" : "Enable maintenance"}
                >
                  {maintenanceLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Power className="w-3 h-3" />
                  )}
                  {isMaintenanceEnabled ? "Maintenance ON" : "Maintenance OFF"}
                </button>
              </div>
            ) : (
              <div className="flex gap-1 sm:gap-2 mt-3 sm:mt-4">
                <button
                  onClick={onNavigateToCalendar}
                  className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600 transition"
                >
                  📅 Calendar
                </button>
              </div>
            )}
            {maintenanceMessage && (
              <p className={`text-xs mt-2 ${maintenanceMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {maintenanceMessage.text}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Analytics & Visualizations - Admin Only */}
      {getAdminUser()?.role === "admin" && <DashboardVisualization />}
    </div>
  )
}

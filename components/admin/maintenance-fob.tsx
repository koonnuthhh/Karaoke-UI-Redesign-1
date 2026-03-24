"use client"

import { useState, useEffect } from "react"
import { Power, AlertCircle, Check, Loader2 } from "lucide-react"
import { siteConfig } from "@/config/site-config"
import { getAdminUser } from "@/lib/admin-service"

export function MaintenanceFab() {
  const [isMaintenanceEnabled, setIsMaintenanceEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isModulator, setIsModulator] = useState(false)

  useEffect(() => {
    // Check if current user is a modulator
    const currentUser = getAdminUser()
    const isUserModulator = currentUser?.role === "modulator"
    setIsModulator(isUserModulator || false)

    // Only load maintenance status if not a modulator
    if (!isUserModulator) {
      loadMaintenanceStatus()
    }
  }, [])

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
    setLoading(true)
    setMessage(null)

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
        setMessage({
          type: "success",
          text: `Maintenance mode has been ${
            result.data.value ? "ENABLED" : "DISABLED"
          }`,
        })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({
          type: "error",
          text: "Failed to update maintenance status",
        })
      }
    } catch (error) {
      console.error("Error updating maintenance status:", error)
      setMessage({
        type: "error",
        text: "Error updating maintenance status",
      })
    } finally {
      setLoading(false)
    }
  }

  // Don't render FAB for modulators
  if (isModulator) {
    return null
  }

  return (
    <div className="relative">
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 rounded-full p-4 text-white shadow-lg hover:shadow-xl transition-all z-40"
        style={{
          backgroundColor: isMaintenanceEnabled ? "#dc3545" : "#28a745",
        }}
        title="Maintenance Settings"
      >
        <Power className="w-6 h-6" />
      </button>

      {/* Popup Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 p-6 z-40">
          <div className="mb-4 h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-lg font-bold"
                style={{ color: siteConfig.theme.maintext }}
              >
                Maintenance Mode
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Status Display */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: isMaintenanceEnabled ? "#dc3545" : "#28a745",
                  }}
                ></div>
                <span
                  className="font-semibold"
                  style={{
                    color: isMaintenanceEnabled ? "#dc3545" : "#28a745",
                  }}
                >
                  {isMaintenanceEnabled ? "🔴 ACTIVE" : "🟢 INACTIVE"}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {isMaintenanceEnabled
                  ? "Website is currently under maintenance. Users will see the maintenance page."
                  : "Website is operational. All users have normal access."}
              </p>
            </div>

            {/* Warning Message */}
            {isMaintenanceEnabled && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Customers will not be able to book or access the website while maintenance is active.
                  Admins can still access the panel.
                </p>
              </div>
            )}

            {/* Toggle Button */}
            <button
              onClick={handleToggleMaintenance}
              disabled={loading}
              className="w-full px-4 py-2 text-white rounded-md transition-all font-semibold flex items-center justify-center gap-2"
              style={{
                backgroundColor: isMaintenanceEnabled ? "#28a745" : "#dc3545",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Power className="w-4 h-4" />
                  {isMaintenanceEnabled
                    ? "Disable Maintenance"
                    : "Enable Maintenance"}
                </>
              )}
            </button>

            {/* Message Display */}
            {message && (
              <div
                className={`mt-3 p-3 rounded-md flex gap-2 ${
                  message.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {message.type === "success" ? (
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <span className="text-sm">{message.text}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <button
          className="fixed inset-0 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

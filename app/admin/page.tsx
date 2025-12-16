"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Users, DoorOpen, Gift, LogOut, AlertCircle } from "lucide-react"
import { useAdminAuth } from "hooks/use-admin-auth"
import { OverallDashboard } from "@/components/admin/overall-dashboard"
import { AdminsTab } from "@/components/admin/admins-tab"
import { RoomsTab } from "@/components/admin/rooms-tab"
import { PromotionsTab } from "@/components/admin/promotions-tab"
import type { Admin, Room, Promotion } from "@/types"

type TabType = "login" | "dashboard" | "admins" | "rooms" | "promotions"

export default function AdminPanel() {
  const router = useRouter()
  const { adminCredential, isLoading: authLoading, isAuthenticated, login, logout } = useAdminAuth()
  const [activeTab, setActiveTab] = useState<TabType>("login")
  const [credentials, setCredentials] = useState({ username: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Data states
  const [admins, setAdmins] = useState<Admin[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && adminCredential) {
      setActiveTab("dashboard")
      fetchAllData()
    } else if (!authLoading) {
      setActiveTab("login")
    }
  }, [isAuthenticated, adminCredential, authLoading])

  const fetchAllData = async () => {
    setDataLoading(true)
    try {
      const headers = {
        "Content-Type": "application/json"
      }

      const [roomsRes, promotionsRes] = await Promise.all([
        fetch("/api/admin/rooms", { headers }),
        fetch("/api/admin/promotions", { headers })
      ])

      // Fetch admins with separate endpoint that gets all admins
      const adminsRes = await fetch("/api/admin/list", { headers })

      if (adminsRes.ok) {
        const adminData = await adminsRes.json()
        setAdmins(Array.isArray(adminData) ? adminData : adminData.data || [])
      }
      if (roomsRes.ok) {
        const roomData = await roomsRes.json()
        setRooms(Array.isArray(roomData) ? roomData : roomData.data || [])
      }
      if (promotionsRes.ok) {
        const promoData = await promotionsRes.json()
        setPromotions(Array.isArray(promoData) ? promoData : promoData.data || [])
      }
    } catch (err) {
      console.error("Failed to fetch data:", err)
    } finally {
      setDataLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/admin", {
        method: "GET",
        headers: {
          username: credentials.username,
          password: credentials.password
        }
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || "Login failed")
      }

      const data = await res.json()
      if (data.success && data.credential) {
        login(data.credential)
        setCredentials({ username: "", password: "" })
      } else {
        throw new Error(data.message || "Invalid credentials")
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    setActiveTab("login")
  }

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Login screen
  if (!isAuthenticated || !adminCredential) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-96">
          <div className="text-center mb-6">
            <Calendar className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard Login</h1>
            <p className="text-gray-600 mt-2">Access admin panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Main admin dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 font-semibold text-white rounded-md transition-colors"
                style={{ backgroundColor: "#8b5cf6" }}
              >
                Time Table
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 font-semibold text-white rounded-md transition-colors flex items-center gap-2"
                style={{ backgroundColor: "#dc2626" }}
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {[
              { id: "dashboard", label: "Dashboard" },
              { id: "admins", label: "Admins", icon: <Users className="w-4 h-4" /> },
              { id: "rooms", label: "Rooms", icon: <DoorOpen className="w-4 h-4" /> },
              { id: "promotions", label: "Promotions", icon: <Gift className="w-4 h-4" /> }
            ].map((tab: any) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <OverallDashboard
            admins={admins}
            rooms={rooms}
            promotions={promotions}
            onNavigateToAdmins={() => setActiveTab("admins")}
            onNavigateToRooms={() => setActiveTab("rooms")}
          />
        )}

        {/* Admins Tab */}
        {activeTab === "admins" && (
          <AdminsTab
            admins={admins}
            dataLoading={dataLoading}
            adminCredential={adminCredential}
            onRefresh={fetchAllData}
          />
        )}

        {/* Rooms Tab */}
        {activeTab === "rooms" && (
          <RoomsTab
            rooms={rooms}
            dataLoading={dataLoading}
            adminCredential={adminCredential}
            onRefresh={fetchAllData}
          />
        )}

        {/* Promotions Tab */}
        {activeTab === "promotions" && (
          <PromotionsTab
            promotions={promotions}
            dataLoading={dataLoading}
            adminCredential={adminCredential}
            onRefresh={fetchAllData}
          />
        )}
      </main>
    </div>
  )
}

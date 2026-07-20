"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Users, DoorOpen, Gift, BookOpen } from "lucide-react"
import { useAdminAuth } from "hooks/use-admin-auth"
import { AdminLogin } from "@/components/AdminLogin"
import { AdminHeader } from "@/components/AdminHeader"
import { OverallDashboard } from "@/components/admin/overall-dashboard"
import { AdminsTab } from "@/components/admin/admins-tab"
import { RoomsTab } from "@/components/admin/rooms-tab"
import { PromotionsTab } from "@/components/admin/promotions-tab"
import { BookingsTab } from "@/components/admin/bookings-tab"
import type { Admin, Room, Promotion } from "@/types"

type TabType = "dashboard" | "admins" | "rooms" | "promotions" | "bookings"

export default function AdminPanel() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, logout, login } = useAdminAuth()
  const [activeTab, setActiveTab] = useState<TabType>("dashboard")

  const [admins, setAdmins] = useState<Admin[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData()
    }
  }, [isAuthenticated])

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

  const handleLogout = () => {
    logout()
  }

  const handleLoginSuccess = () => {
    setActiveTab("dashboard")
  }

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} login={login} />
  }

  // Main admin dashboard
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader onLogout={handleLogout} />

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex gap-4 sm:gap-8 min-w-min">
            {[
              { id: "dashboard", label: "Dashboard" },
              { id: "admins", label: "Admins", icon: <Users className="w-4 h-4" /> },
              { id: "rooms", label: "Rooms", icon: <DoorOpen className="w-4 h-4" /> },
              { id: "bookings", label: "Bookings", icon: <BookOpen className="w-4 h-4" /> },
              // href-based tab navigates to a route instead of switching the active tab
              { id: "schedule", label: "Schedule", icon: <Calendar className="w-4 h-4" />, href: "/" },
              { id: "promotions", label: "Promotions", icon: <Gift className="w-4 h-4" /> }
            ].map((tab: any) => (
              <button
                key={tab.id}
                onClick={() => (tab.href ? router.push(tab.href) : setActiveTab(tab.id as TabType))}
                className={`py-4 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition whitespace-nowrap ${
                  !tab.href && activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.icon} <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {activeTab === "dashboard" && (
          <OverallDashboard
            admins={admins}
            rooms={rooms}
            promotions={promotions}
            onNavigateToAdmins={() => setActiveTab("admins")}
            onNavigateToRooms={() => setActiveTab("rooms")}
            onNavigateToCalendar={() => router.push("/")}
          />
        )}

        {activeTab === "admins" && (
          <AdminsTab
            admins={admins}
            dataLoading={dataLoading}
            adminCredential="current"
            onRefresh={fetchAllData}
          />
        )}

        {activeTab === "rooms" && (
          <RoomsTab
            rooms={rooms}
            dataLoading={dataLoading}
            adminCredential="current"
            onRefresh={fetchAllData}
          />
        )}

        {activeTab === "promotions" && (
          <PromotionsTab
            promotions={promotions}
            dataLoading={dataLoading}
            adminCredential="current"
            rooms={rooms}
            onRefresh={fetchAllData}
          />
        )}

        {activeTab === "bookings" && (
          <BookingsTab
            dataLoading={dataLoading}
            onRefresh={fetchAllData}
            rooms={rooms}
          />
        )}
      </main>
    </div>
  )}
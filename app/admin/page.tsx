"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Users, Settings, DollarSign, TrendingUp } from "lucide-react"
import { siteConfig } from "../../config/site-config"
import type { AdminStats, AdminBooking } from "../../types"
import { LoadingSpinner } from "../../components/ui/loading-spinner"

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [credentials, setCredentials] = useState({ username: "", password: "" })
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<AdminBooking[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (credentials.username === siteConfig.admin.username && credentials.password === siteConfig.admin.password) {
      setIsAuthenticated(true)
      loadDashboardData()
    } else {
      alert("Invalid credentials")
    }
  }

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Mock data - replace with actual API calls
      const mockStats: AdminStats = {
        totalBookings: 156,
        totalRevenue: 12450,
        occupancyRate: 78,
        popularRooms: [
          { roomName: "VIP Suite", bookings: 45 },
          { roomName: "Party Room", bookings: 38 },
          { roomName: "Intimate Studio", bookings: 32 },
        ],
      }

      const mockBookings: AdminBooking[] = [
        {
          id: "1",
          roomId: "room-1",
          roomName: "Intimate Studio",
          customerName: "John Doe",
          customerEmail: "john@example.com",
          customerPhone: "+1234567890",
          date: "2024-01-15",
          startTime: "19:00",
          endTime: "21:00",
          duration: 120,
          totalPrice: 50,
          status: "confirmed",
          createdAt: "2024-01-10T10:00:00Z",
        },
        {
          id: "2",
          roomId: "room-2",
          roomName: "Party Room",
          customerName: "Jane Smith",
          customerEmail: "jane@example.com",
          customerPhone: "+1234567891",
          date: "2024-01-15",
          startTime: "20:00",
          endTime: "22:30",
          duration: 150,
          totalPrice: 112.5,
          status: "pending",
          createdAt: "2024-01-10T11:00:00Z",
        },
      ]

      setStats(mockStats)
      setRecentBookings(mockBookings)
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-96">
          <h1 className="text-2xl font-bold text-center mb-6">Admin Login</h1>
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
            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">{siteConfig.content.admin.title}</h1>
            <div className="flex gap-4">
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                View Site
              </button>
              <button
                onClick={() => setIsAuthenticated(false)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <Calendar className="w-8 h-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <DollarSign className="w-8 h-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.occupancyRate}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <Users className="w-8 h-8 text-orange-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Rooms</p>
                      <p className="text-2xl font-bold text-gray-900">{siteConfig.rooms.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <button
                onClick={() => router.push("/admin/bookings")}
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
              >
                <Calendar className="w-8 h-8 text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Bookings</h3>
                <p className="text-gray-600">View, edit, and cancel bookings</p>
              </button>

              <button
                onClick={() => router.push("/admin/rooms")}
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
              >
                <Users className="w-8 h-8 text-purple-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Rooms</h3>
                <p className="text-gray-600">Configure rooms and pricing</p>
              </button>

              <button
                onClick={() => router.push("/admin/settings")}
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
              >
                <Settings className="w-8 h-8 text-green-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">System Settings</h3>
                <p className="text-gray-600">Configure business settings</p>
              </button>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{booking.customerName}</div>
                            <div className="text-sm text-gray-500">{booking.customerEmail}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{booking.roomName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{new Date(booking.date).toLocaleDateString()}</div>
                          <div className="text-sm text-gray-500">
                            {booking.startTime} - {booking.endTime}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{booking.duration} min</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${booking.totalPrice}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              booking.status === "confirmed"
                                ? "bg-green-100 text-green-800"
                                : booking.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

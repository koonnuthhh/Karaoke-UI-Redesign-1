"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search, Trash2 } from "lucide-react"
import { siteConfig } from "../../../config/site-config"
import type { AdminBooking } from "../../../types"
import { LoadingSpinner } from "../../../components/ui/loading-spinner"
import { formatDuration } from "../../../lib/time-utils"

export default function AdminBookings() {
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<AdminBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const router = useRouter()

  useEffect(() => {
    loadBookings()
  }, [])

  useEffect(() => {
    filterBookings()
  }, [bookings, searchTerm, statusFilter])

  const loadBookings = async () => {
    setIsLoading(true)
    try {
      // Mock data - replace with actual API call
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
          specialRequests: "Birthday celebration",
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
        {
          id: "3",
          roomId: "room-3",
          roomName: "VIP Suite",
          customerName: "Bob Johnson",
          customerEmail: "bob@example.com",
          customerPhone: "+1234567892",
          date: "2024-01-16",
          startTime: "18:00",
          endTime: "20:00",
          duration: 120,
          totalPrice: 150,
          status: "cancelled",
          createdAt: "2024-01-11T09:00:00Z",
        },
      ]

      setBookings(mockBookings)
    } catch (error) {
      console.error("Failed to load bookings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterBookings = () => {
    let filtered = bookings

    if (searchTerm) {
      filtered = filtered.filter(
        (booking) =>
          booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.roomName.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((booking) => booking.status === statusFilter)
    }

    setFilteredBookings(filtered)
  }

  const handleStatusChange = async (bookingId: string, newStatus: AdminBooking["status"]) => {
    try {
      // In production, make API call to update booking status
      setBookings((prev) =>
        prev.map((booking) => (booking.id === bookingId ? { ...booking, status: newStatus } : booking)),
      )
      alert(`Booking ${newStatus} successfully`)
    } catch (error) {
      console.error("Failed to update booking:", error)
      alert("Failed to update booking")
    }
  }

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to delete this booking?")) return

    try {
      // In production, make API call to delete booking
      setBookings((prev) => prev.filter((booking) => booking.id !== bookingId))
      alert("Booking deleted successfully")
    } catch (error) {
      console.error("Failed to delete booking:", error)
      alert("Failed to delete booking")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/admin")}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{siteConfig.content.admin.bookingsTitle}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by customer name, email, or room..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{booking.customerName}</div>
                          <div className="text-sm text-gray-500">{booking.customerEmail}</div>
                          <div className="text-sm text-gray-500">{booking.customerPhone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{booking.roomName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{new Date(booking.date).toLocaleDateString()}</div>
                        <div className="text-sm text-gray-500">
                          {booking.startTime} - {booking.endTime}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(booking.duration)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${booking.totalPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={booking.status}
                          onChange={(e) => handleStatusChange(booking.id, e.target.value as AdminBooking["status"])}
                          className={`text-xs font-semibold rounded-full px-2 py-1 border-0 ${
                            booking.status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : booking.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="pending">Pending</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredBookings.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No bookings found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

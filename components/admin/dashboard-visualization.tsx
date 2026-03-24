"use client"

import { useState, useEffect } from "react"
import { Calendar, TrendingUp } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface BookingData {
  username: string
  phone: string
  booking_id: string
  room_id: string
  room_name?: string
  start_time: string
  end_time: string
  date: string
  status: string
  promotion_id: string | null
  price: number | string
  created_at: string
}

interface DashboardStats {
  totalBookings: number
  totalRevenue: number
  confirmedBookings: number
  pendingBookings: number
  cancelledBookings: number
  avgBookingValue: number
}

type DateRange = "today" | "thisMonth" | "lastMonth" | "last3Months" | "custom"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export function DashboardVisualization() {
  const [bookings, setBookings] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>("thisMonth")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    totalRevenue: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    avgBookingValue: 0,
  })

  useEffect(() => {
    fetchBookingData(dateRange)
  }, [dateRange, customStartDate, customEndDate])

  const getDateRange = (range: DateRange) => {
    if (range === "custom" && customStartDate && customEndDate) {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      }
    }

    const endDate = new Date()
    const startDate = new Date()

    switch (range) {
      case "today":
        // Start and end are both today
        break
      case "thisMonth":
        startDate.setDate(1)
        break
      case "lastMonth":
        startDate.setMonth(startDate.getMonth() - 1)
        startDate.setDate(1)
        endDate.setDate(0) // Last day of previous month
        break
      case "last3Months":
        startDate.setMonth(startDate.getMonth() - 3)
        break
      default:
        startDate.setDate(startDate.getDate() - 30)
    }

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    }
  }

  const fetchBookingData = async (range: DateRange) => {
    setLoading(true)
    try {
      const { startDate, endDate } = getDateRange(range)
      const response = await fetch(`/api/bookings/range?startDate=${startDate}&endDate=${endDate}`)

      if (response.ok) {
        const result = await response.json()
        const data = result.data || []
        setBookings(data)
        calculateStats(data)
      } else {
        console.error("Failed to fetch bookings. Status:", response.status)
      }
    } catch (error) {
      console.error("Failed to fetch booking data:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data: BookingData[]) => {
    const bookedData = data.filter((b) => b.status?.toLowerCase() === "booked")
    const total = bookedData.length
    const confirmed = bookedData.filter((b) => b.status?.toLowerCase() === "confirmed").length
    const pending = bookedData.filter((b) => b.status?.toLowerCase() === "pending").length
    const cancelled = bookedData.filter((b) => b.status?.toLowerCase() === "cancelled").length
    const revenue = bookedData.reduce((sum, b) => {
      const price = typeof b.price === "string" ? parseFloat(b.price) : (b.price || 0)
      return sum + price
    }, 0)

    console.log("Stats calculated. Total:", total, "Revenue:", revenue)
    setStats({
      totalBookings: total,
      totalRevenue: revenue,
      confirmedBookings: confirmed,
      pendingBookings: pending,
      cancelledBookings: cancelled,
      avgBookingValue: total > 0 ? Math.round(revenue / total) : 0,
    })
  }

  const getRevenueByDate = () => {
    const revenueMap = new Map<string, number>()
    const bookedBookings = bookings.filter((b) => b.status?.toLowerCase() === "booked")

    bookedBookings.forEach((booking) => {
      const date = booking.date
      const price = typeof booking.price === "string" ? parseFloat(booking.price) : (booking.price || 0)
      const current = revenueMap.get(date) || 0
      revenueMap.set(date, current + price)
    })

    return Array.from(revenueMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, revenue]) => ({
        date: new Date(date).toLocaleDateString("th-TH", { month: "short", day: "numeric" }),
        revenue: revenue,
      }))
  }

  const getBookingsByStatus = () => {
    return [
      {
        name: "Confirmed",
        value: stats.confirmedBookings,
      },
      {
        name: "Pending",
        value: stats.pendingBookings,
      },
      {
        name: "Cancelled",
        value: stats.cancelledBookings,
      },
    ].filter((item) => item.value > 0)
  }

  const getPopularRooms = () => {
    const roomBookingMap = new Map<string, { name: string; count: number }>()
    const bookedBookings = bookings.filter((b) => b.status?.toLowerCase() === "booked")

    bookedBookings.forEach((booking) => {
      const roomId = booking.room_id
      const roomName = booking.room_name || "Unknown Room"
      const current = roomBookingMap.get(roomId) || { name: roomName, count: 0 }
      roomBookingMap.set(roomId, { name: roomName, count: current.count + 1 })
    })

    return Array.from(roomBookingMap.entries())
      .map(([_, data]) => data)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((data) => ({
        room: data.name,
        bookings: data.count,
      }))
  }

  const getBookingTrend = () => {
    const trendMap = new Map<string, number>()
    const bookedBookings = bookings.filter((b) => b.status?.toLowerCase() === "booked")

    bookedBookings.forEach((booking) => {
      const date = booking.date
      const current = trendMap.get(date) || 0
      trendMap.set(date, current + 1)
    })

    return Array.from(trendMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("th-TH", { month: "short", day: "numeric" }),
        bookings: count,
      }))
  }

  const StatCard = ({ label, value, icon, color }: any) => (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${color}`}>{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`opacity-20 ${icon}`}>{icon}</div>
      </div>
    </div>
  )

  if (loading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  const revenueData = getRevenueByDate()
  const statusData = getBookingsByStatus()
  const popularRooms = getPopularRooms()
  const bookingTrend = getBookingTrend()

  return (
    <div>
      <div className="flex flex-col gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        </div>

        {/* Quick Date Range Options */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { id: "today", label: "Today" },
              { id: "thisMonth", label: "This Month" },
              { id: "lastMonth", label: "Last Month" },
              { id: "last3Months", label: "Last 3 Months" },
            ].map((range) => (
              <button
                key={range.id}
                onClick={() => {
                  setDateRange(range.id as DateRange)
                  setCustomStartDate("")
                  setCustomEndDate("")
                }}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition whitespace-nowrap flex-shrink-0 ${
                  dateRange === range.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Selector */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="use-custom-range"
                checked={dateRange === "custom"}
                onChange={(e) => {
                  if (e.target.checked) {
                    setDateRange("custom")
                  } else {
                    setDateRange("thisMonth")
                    setCustomStartDate("")
                    setCustomEndDate("")
                  }
                }}
                className="w-4 h-4"
              />
              <label htmlFor="use-custom-range" className="text-sm font-medium text-gray-700">
                Custom Date Range
              </label>
            </div>

            {dateRange === "custom" && (
              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Start</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-1 sm:px-3 py-0.5 sm:py-2 border border-gray-300 rounded text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">End</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-1 sm:px-3 py-0.5 sm:py-2 border border-gray-300 rounded text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Total Revenue"
          value={`฿${stats.totalRevenue.toLocaleString()}`}
          icon={<TrendingUp className="w-12 h-12 text-blue-500" />}
          color="text-blue-600"
        />
        <StatCard
          label="Total Bookings"
          value={stats.totalBookings}
          icon={<Calendar className="w-12 h-12 text-green-500" />}
          color="text-green-600"
        />
        <StatCard
          label="Avg Booking Value"
          value={`฿${stats.avgBookingValue.toLocaleString()}`}
          icon={<TrendingUp className="w-12 h-12 text-purple-500" />}
          color="text-purple-600"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Revenue Over Time</h3>
          <p className="text-sm text-gray-600 mb-4">Daily revenue trend showing total earnings from confirmed bookings across the selected period.</p>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `฿${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No revenue data available
            </div>
          )}
        </div>

        {/* Booking Status Chart */}
        {/* <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Booking Status Distribution</h3>
          <p className="text-sm text-gray-600 mb-4">Breakdown of all bookings by status (Confirmed, Pending, Cancelled). Shows the proportion of completed bookings versus pending or cancelled ones.</p>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No booking data available
            </div>
          )}
        </div> */}

        {/* Popular Rooms Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Most Popular Rooms</h3>
          <p className="text-sm text-gray-600 mb-4">Rooms ranked by number of bookings.</p>
          {popularRooms.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={popularRooms}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="room" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No room data available
            </div>
          )}
        </div>

        {/* Booking Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Booking Trend</h3>
          <p className="text-sm text-gray-600 mb-4">Booking volume trend showing how many successful bookings for each day.</p>
          {bookingTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={bookingTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="bookings" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No trend data available
            </div>
          )}
        </div>
      </div>

      {/* Booking Statistics */}
        {/* <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <p className="text-sm text-gray-600">Confirmed Bookings</p>
            <p className="text-2xl font-bold text-green-600 mt-2">{stats.confirmedBookings}</p>
          </div>
          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <p className="text-sm text-gray-600">Pending Bookings</p>
            <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.pendingBookings}</p>
          </div>
          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <p className="text-sm text-gray-600">Cancelled Bookings</p>
            <p className="text-2xl font-bold text-red-600 mt-2">{stats.cancelledBookings}</p>
          </div>
        </div> */}
    </div>
  )
}

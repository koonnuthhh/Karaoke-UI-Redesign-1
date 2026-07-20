"use client"

import { useState, useEffect } from "react"
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Eye, Pencil, X, AlertCircle } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PromoInput } from "@/components/promo-input"
import { calculatePrice } from "@/lib/time-utils"
import { getAdminUser } from "@/lib/admin-service"
import { TimeSelect } from "@/components/ui/time-select"
import type { TimeSlot, Room } from "@/types"

interface BookingsTabProps {
  dataLoading: boolean
  onRefresh: () => void
  rooms?: Room[]
}

// Treats times before 06:00 as belonging to "the next day" so overnight
// hours (e.g. open 12:00, close 01:00) compare/add correctly.
function toComparableDate(time: string): Date {
  return time < "06:00" ? new Date(`2000-01-02T${time}`) : new Date(`2000-01-01T${time}`)
}

function addMinutesToTime(time: string, minutes: number): string {
  const date = toComparableDate(time)
  date.setMinutes(date.getMinutes() + minutes)
  const hh = date.getHours().toString().padStart(2, "0")
  const mm = date.getMinutes().toString().padStart(2, "0")
  return `${hh}:${mm}`
}

interface EditFormState {
  roomId: string
  customerName: string
  startTime: string
  duration: number
}

interface DiscountState {
  original_price: number
  discount_amount: number
  final_price: number
}

export function BookingsTab({ dataLoading, onRefresh, rooms = [] }: BookingsTabProps) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [bookings, setBookings] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<TimeSlot | null>(null)
  const [cancelTarget, setCancelTarget] = useState<TimeSlot | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState("")
  const [editTarget, setEditTarget] = useState<TimeSlot | null>(null)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState("")
  const [customPrice, setCustomPrice] = useState<number | null>(null)
  const [discount, setDiscount] = useState<DiscountState | null>(null)
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null)
  const [appliedPromotionId, setAppliedPromotionId] = useState<string | null>(null)
  const currentUser = getAdminUser()

  useEffect(() => {
    fetchBookings(selectedDate)
  }, [selectedDate])

  // Live price calculation for the booking currently being edited, same
  // formula (`calculatePrice`) and promo-reapply pattern as AdminBookingModal
  // uses when creating a booking.
  const editRoom = editForm ? rooms.find((r) => r.room_id === editForm.roomId) : undefined
  const editEndTime = editForm ? addMinutesToTime(editForm.startTime, editForm.duration) : ""
  const editCalculatedPrice = editForm && editRoom ? calculatePrice(editRoom.price_per_half_hour, editForm.duration) : 0
  const editPriceBeforeDiscount = customPrice !== null && customPrice >= 0 ? customPrice : editCalculatedPrice
  const editFinalPrice = discount ? discount.final_price : editPriceBeforeDiscount

  // Automatically recalculate the applied promo's discount when the price,
  // room, or time being edited changes.
  useEffect(() => {
    if (!editForm || !appliedPromoCode) return
    const priceToUse = customPrice !== null && customPrice >= 0 ? customPrice : editCalculatedPrice
    const reapplyPromo = async () => {
      try {
        const response = await fetch("/api/user/promotions/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              code: appliedPromoCode,
              total_price: priceToUse,
              roomId: editForm.roomId,
              date: editTarget?.date,
              time: editForm.startTime,
              endTime: editEndTime,
            },
          }),
        })
        const result = await response.json()
        if (result.success && result.data) {
          setDiscount({
            original_price: priceToUse,
            discount_amount: result.data.discount_amount,
            final_price: result.data.final_price,
          })
        }
      } catch (err) {
        // Silently fail - keep existing discount
      }
    }
    reapplyPromo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customPrice, appliedPromoCode, editCalculatedPrice, editForm?.roomId, editForm?.startTime, editEndTime])

  const fetchBookings = async (date: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/bookings?date=${date}`, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setBookings(data.bookings || [])
      } else {
        setBookings([])
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async () => {
    if (!cancelTarget?.id) return

    setIsCancelling(true)
    setCancelError("")
    try {
      const response = await fetch("/api/bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: cancelTarget.id,
          booking_status: "cancelled",
        }),
      })

      const result = await response.json()

      if (result.success) {
        setCancelTarget(null)
        setSelectedBooking(null)
        fetchBookings(selectedDate)
      } else {
        setCancelError(result.message || result.error?.message || "Failed to cancel booking")
      }
    } catch (err) {
      console.error("Failed to cancel booking:", err)
      setCancelError("Network error. Please try again.")
    } finally {
      setIsCancelling(false)
    }
  }

  const openEditModal = (booking: TimeSlot) => {
    setEditError("")
    setEditTarget(booking)
    setEditForm({
      roomId: booking.roomId,
      customerName: booking.customerName || "",
      startTime: booking.startTime,
      duration: booking.duration || 30,
    })
    setCustomPrice(null)
    setDiscount(null)
    setAppliedPromoCode(null)
    setAppliedPromotionId(null)
  }

  const closeEditModal = () => {
    setEditTarget(null)
    setEditForm(null)
    setEditError("")
    setCustomPrice(null)
    setDiscount(null)
    setAppliedPromoCode(null)
    setAppliedPromotionId(null)
  }

  const handleSaveEdit = async () => {
    if (!editTarget?.id || !editForm) return

    setIsSaving(true)
    setEditError("")
    try {
      const response = await fetch("/api/bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: editTarget.id,
          room_id: editForm.roomId,
          username: editForm.customerName,
          start_time: editForm.startTime,
          end_time: addMinutesToTime(editForm.startTime, editForm.duration),
          price: editFinalPrice,
          ...(appliedPromotionId && { promotion_id: appliedPromotionId }),
          ...(currentUser && { booked_by_admin_id: currentUser.admin_id, booked_by_admin_name: currentUser.username }),
          // Admin editing a pending booking and saving is treated as final confirmation —
          // no need to wait on the customer's payment-slip verification.
          ...(editTarget.status?.toLowerCase() === "pending" && { booking_status: "booked" }),
        }),
      })

      const result = await response.json()

      if (result.success) {
        closeEditModal()
        setSelectedBooking(null)
        fetchBookings(selectedDate)
      } else {
        setEditError(result.message || result.error?.message || "Failed to save booking")
      }
    } catch (err) {
      console.error("Failed to save booking:", err)
      setEditError("Network error. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreviousDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() - 1)
    setSelectedDate(date.toISOString().split("T")[0])
  }

  const handleNextDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + 1)
    setSelectedDate(date.toISOString().split("T")[0])
  }

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split("T")[0])
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00`)
    return date.toLocaleDateString("th-TH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (time: string | undefined) => {
    if (!time) return "-"
    return time.slice(0, 5)
  }

  const formatDateTime = (dateTime: string | undefined) => {
    if (!dateTime) return "-"
    const date = new Date(dateTime)
    // Add 7 hours to convert from UTC to Thai time (UTC+7)
    date.setHours(date.getHours() + 7)
    return date.toLocaleString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const getStatusColor = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case "booked":
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Booking Log</h2>

        {/* Date Selector */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Calendar className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 flex-shrink-0" />
              <span className="text-sm sm:text-lg font-semibold text-gray-900 truncate">
                {formatDate(selectedDate)}
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={handlePreviousDay}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600" />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex-shrink-0"
              />

              <button
                onClick={handleNextDay}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
                title="Next Day"
              >
                <ChevronRight className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600" />
              </button>


              <button
                onClick={handleToday}
                className="px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm font-medium whitespace-nowrap"
              >
                Today
              </button>
              <button
                onClick={() => fetchBookings(selectedDate)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
                title="Refresh"
              >
                <RefreshCw className={`w-4 sm:w-5 h-4 sm:h-5 text-gray-600 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
              <p className="text-xs sm:text-sm text-gray-600">Total Bookings</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{bookings.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200">
              <p className="text-xs sm:text-sm text-gray-600">Confirmed</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {bookings.filter((b) => b.status?.toLowerCase() === "confirmed").length}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 sm:p-4 border border-yellow-200">
              <p className="text-xs sm:text-sm text-gray-600">Pending</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                {bookings.filter((b) => b.status?.toLowerCase() === "pending").length}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bookings Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : bookings.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {booking.roomName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {booking.customerName || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {booking.customerPhone || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {booking.duration} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ฿{booking.price?.toFixed(2) || "0.00"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(booking.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="text-blue-600 hover:text-blue-900 font-medium flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={() => openEditModal(booking)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium flex items-center gap-1"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                        {booking.status?.toLowerCase() === "pending" && (
                          <button
                            onClick={() => {
                              setCancelError("")
                              setCancelTarget(booking)
                            }}
                            className="text-red-600 hover:text-red-900 font-medium flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No bookings found for {formatDate(selectedDate)}</p>
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Booking Details</h3>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Room</p>
                <p className="text-base font-semibold text-gray-900">{selectedBooking.roomName}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Customer Name</p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedBooking.customerName || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedBooking.customerPhone || "-"}
                </p>
              </div>

              {selectedBooking.bookedByAdminName && (
                <div>
                  <p className="text-sm text-gray-500">Booked By (Admin)</p>
                  <p className="text-base font-semibold text-gray-900">
                    {selectedBooking.bookedByAdminName}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="text-base font-semibold text-gray-900">{selectedBooking.date}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="text-base font-semibold text-gray-900">
                  {formatTime(selectedBooking.startTime)} - {formatTime(selectedBooking.endTime)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="text-base font-semibold text-gray-900">{selectedBooking.duration} minutes</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Price</p>
                <p className="text-base font-semibold text-gray-900">
                  ฿{selectedBooking.price?.toFixed(2) || "0.00"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    selectedBooking.status
                  )}`}
                >
                  {selectedBooking.status?.charAt(0).toUpperCase() +
                    selectedBooking.status?.slice(1).toLowerCase()}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-500">Start Booking Time</p>
                <p className="text-base font-semibold text-gray-900">
                  {formatDateTime(selectedBooking.created_at)}
                </p>
              </div>

              {selectedBooking.status?.toLowerCase() !== "pending" && (
                <div>
                  <p className="text-sm text-gray-500">Confirm Time</p>
                  <p className="text-base font-semibold text-gray-900">
                    {formatDateTime(selectedBooking.updated_at)}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSelectedBooking(null)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Close
              </button>
              <button
                onClick={() => openEditModal(selectedBooking)}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                Edit
              </button>
              {selectedBooking.status?.toLowerCase() === "pending" && (
                <button
                  onClick={() => {
                    setCancelError("")
                    setCancelTarget(selectedBooking)
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-bold text-gray-900">Cancel Booking</h3>
            </div>
            <p className="text-gray-600 mb-2">
              Are you sure you want to cancel this pending booking? This action cannot be undone.
            </p>
            <p className="text-sm text-gray-500">
              {cancelTarget.roomName} &middot; {formatTime(cancelTarget.startTime)} - {formatTime(cancelTarget.endTime)} &middot; {cancelTarget.customerName || "-"}
            </p>
            {cancelError && <p className="text-red-600 mt-3 text-sm">{cancelError}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setCancelTarget(null)
                  setCancelError("")
                }}
                disabled={isCancelling}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isCancelling ? "Cancelling..." : "Cancel Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {editTarget && editForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Booking</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                <select
                  value={editForm.roomId}
                  onChange={(e) => setEditForm({ ...editForm, roomId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {rooms.map((room) => (
                    <option key={room.room_id} value={room.room_id}>
                      {room.room_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={editForm.customerName}
                  onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <TimeSelect
                    value={editForm.startTime}
                    onChange={(time) => setEditForm({ ...editForm, startTime: time })}
                    className="w-full"
                    selectClassName="flex-1 min-w-0 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min={30}
                    step={30}
                    value={editForm.duration}
                    onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500">
                End Time: {editEndTime}
              </p>

              {/* Booking Summary — mirrors AdminBookingModal's live price calculation */}
              <div className="bg-indigo-50 rounded-lg p-3 text-sm">
                <p><span className="font-medium">Original Price:</span> ฿{editCalculatedPrice.toFixed(2)}</p>
                {customPrice !== null && (
                  <p className="text-blue-600"><span className="font-medium">Custom Price:</span> ฿{customPrice.toFixed(2)}</p>
                )}
                {discount && (
                  <div className="mt-2 pt-2 border-t border-indigo-200">
                    <p className="text-green-600"><span className="font-medium">Discount:</span> -฿{discount.discount_amount.toFixed(2)}</p>
                    <p className="font-bold text-base text-green-600"><span className="font-medium">After Discount:</span> ฿{discount.final_price.toFixed(2)}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (Leave blank to use calculated: ฿{editCalculatedPrice.toFixed(2)})
                  {appliedPromoCode && <span className="text-green-600 text-xs ml-2">(Promo will auto-update)</span>}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={customPrice !== null ? customPrice : ""}
                  onChange={(e) => {
                    const value = e.target.value
                    setCustomPrice(value === "" ? null : parseFloat(value) || 0)
                  }}
                  placeholder={editCalculatedPrice.toFixed(2)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <PromoInput
                cartTotal={editPriceBeforeDiscount}
                roomId={editForm.roomId}
                bookingDate={editTarget.date}
                bookingTime={editForm.startTime}
                bookingEndTime={editEndTime}
                externalDiscount={discount}
                onPromoApplied={(newFinalPrice, discountAmount, promoCode, promotionId) => {
                  if (promoCode === "") {
                    setDiscount(null)
                    setAppliedPromoCode(null)
                    setAppliedPromotionId(null)
                  } else {
                    setDiscount({
                      original_price: editPriceBeforeDiscount,
                      discount_amount: discountAmount,
                      final_price: newFinalPrice,
                    })
                    setAppliedPromoCode(promoCode)
                    setAppliedPromotionId(promotionId || null)
                  }
                }}
              />
            </div>

            {editError && <p className="text-red-600 mt-3 text-sm">{editError}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditModal}
                disabled={isSaving}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving
                  ? "Saving..."
                  : editTarget.status?.toLowerCase() === "pending"
                    ? `Save & Confirm Booking - ฿${editFinalPrice.toFixed(2)}`
                    : `Save Changes - ฿${editFinalPrice.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

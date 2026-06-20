"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { siteConfig } from "../config/site-config"
import type { Room, ScheduleData, TimeSlot } from "../types"
import {
  addMinutesToTime,
  calculatePrice,
  formatDuration,
  getAvailableDurations,
  getMinutesBetween,
  isTimeSlotAvailable,
} from "../lib/time-utils"
import { CheckoutModal } from "./checkout-modal"

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  timeSlot: TimeSlot
  room: Room
  scheduleData: ScheduleData
}

export function BookingModal({ isOpen, onClose, timeSlot, room, scheduleData }: BookingModalProps) {
  const [startTime, setStartTime] = useState(timeSlot.startTime)
  const [endTime, setEndTime] = useState("")
  const [selectionMode, setSelectionMode] = useState<"endTime" | "duration">("endTime")
  const [duration, setDuration] = useState(60)
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    specialRequests: "",
  })
  const [error, setError] = useState("")
  const [showCheckout, setShowCheckout] = useState(false)

  const availableSlots = scheduleData.timeSlots.filter((slot) =>
    isTimeSlotAvailable(slot, room.room_id, scheduleData.bookings),
  )

  const firstUnavailableSlot = scheduleData.timeSlots
    .filter((slot) => {
      const slotTime = slot < "06:00" ? new Date(`2000-01-02T${slot}`) : new Date(`2000-01-01T${slot}`)
      const startTimeObj = startTime < "06:00" ? new Date(`2000-01-02T${startTime}`) : new Date(`2000-01-01T${startTime}`)
      return slotTime > startTimeObj
    })
    .find((slot) => !isTimeSlotAvailable(slot, room.room_id, scheduleData.bookings))

  const firstCloseSlot = scheduleData.timeSlots.find((slot) => slot === siteConfig.schedule.closeTime)

  const availableEndTimes = scheduleData.timeSlots.filter((slot) => {
    const startTimeObj = startTime < "06:00" ? new Date(`2000-01-02T${startTime}`) : new Date(`2000-01-01T${startTime}`)
    const slotTime = slot < "06:00" ? new Date(`2000-01-02T${slot}`) : new Date(`2000-01-01T${slot}`)

    startTimeObj.setMinutes(startTimeObj.getMinutes() + 30)
    if (slotTime <= startTimeObj) return false

    if (firstUnavailableSlot) {
      const unavailableTime =
        firstUnavailableSlot < "06:00"
          ? new Date(`2000-01-02T${firstUnavailableSlot}`)
          : new Date(`2000-01-01T${firstUnavailableSlot}`)
      if (slotTime > unavailableTime) return false
    }

    if (firstCloseSlot) {
      const closeTime =
        firstCloseSlot < "06:00" ? new Date(`2000-01-02T${firstCloseSlot}`) : new Date(`2000-01-01T${firstCloseSlot}`)
      if (slotTime > closeTime) return false
    }

    return true
  })

  const availableDurations = getAvailableDurations(startTime, availableEndTimes)

  useEffect(() => {
    if (isOpen && startTime) {
      setEndTime(availableEndTimes[0] ?? "")
    }
  }, [isOpen, startTime, availableEndTimes.join(",")])

  useEffect(() => {
    if (selectionMode === "duration" && startTime && endTime) {
      setDuration(getMinutesBetween(startTime, endTime))
    }
  }, [selectionMode, startTime, endTime])

  useEffect(() => {
    if (selectionMode === "duration" && startTime && availableDurations.length > 0 && !availableDurations.includes(duration)) {
      setDuration(availableDurations[0])
    }
  }, [selectionMode, startTime, availableDurations.join(",")])

  const selectedEndTime = selectionMode === "duration" ? addMinutesToTime(startTime, duration) : endTime
  const totalDuration = startTime && selectedEndTime ? getMinutesBetween(startTime, selectedEndTime) : 0
  const totalPrice = calculatePrice(room.price_per_half_hour, totalDuration)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!startTime || !selectedEndTime) {
      setError("Please select both start and end time settings")
      return
    }

    if (!availableEndTimes.includes(selectedEndTime)) {
      setError("Please select a valid end time")
      return
    }

    setShowCheckout(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleCheckoutClose = () => {
    setShowCheckout(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div
          className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "#e5e7eb" }}>
            <h2 className="text-xl font-bold" style={{ color: siteConfig.theme.maintext }}>
              Book Your Karaoke Session
            </h2>
            <button
              onClick={onClose}
              className="transition-colors"
              style={{ color: "#9ca3af" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#6b7280")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <h3 className="font-semibold mb-3" style={{ color: siteConfig.theme.maintext }}>
                Select Time : {room.room_name}
              </h3>
              <div className="mb-4">
                <label htmlFor="selectionMode" className="block text-sm font-medium mb-1" style={{ color: siteConfig.theme.maintext }}>
                  Select by
                </label>
                <select
                  id="selectionMode"
                  value={selectionMode}
                  onChange={(e) => setSelectionMode(e.target.value as "endTime" | "duration")}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none"
                  style={{ borderColor: "#d1d5db", color: siteConfig.theme.maintext }}
                >
                  <option value="endTime">End Time</option>
                  <option value="duration">Duration</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startTime" className="block text-sm font-medium mb-1" style={{ color: siteConfig.theme.maintext }}>
                    Start Time
                  </label>
                  <select
                    id="startTime"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value)
                    }}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none"
                    style={{ borderColor: "#d1d5db", color: siteConfig.theme.maintext }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "transparent"
                      e.target.style.boxShadow = `0 0 0 2px ${siteConfig.theme.maintext}`
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db"
                      e.target.style.boxShadow = "none"
                    }}
                  >
                    {availableSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
                {selectionMode === "endTime" ? (
                  <div>
                    <label htmlFor="endTime" className="block text-sm font-medium mb-1" style={{ color: siteConfig.theme.maintext }}>
                      End Time
                    </label>
                    <select
                      id="endTime"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={!startTime || availableEndTimes.length === 0}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none disabled:cursor-not-allowed"
                      style={{
                        borderColor: "#d1d5db",
                        backgroundColor: !startTime || availableEndTimes.length === 0 ? "#f3f4f6" : "white",
                        color: siteConfig.theme.maintext,
                      }}
                    >
                      {availableEndTimes.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs" style={{ color: siteConfig.theme.secondary }}>
                      Duration: {formatDuration(totalDuration)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium mb-1" style={{ color: siteConfig.theme.maintext }}>
                      Duration
                    </label>
                    <select
                      id="duration"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      disabled={!startTime || availableDurations.length === 0}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none disabled:cursor-not-allowed"
                      style={{
                        borderColor: "#d1d5db",
                        backgroundColor: !startTime || availableDurations.length === 0 ? "#f3f4f6" : "white",
                        color: siteConfig.theme.maintext,
                      }}
                    >
                      {availableDurations.map((slotDuration) => (
                        <option key={slotDuration} value={slotDuration}>
                          {formatDuration(slotDuration)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs" style={{ color: siteConfig.theme.secondary }}>
                      End Time: {selectedEndTime || "Not selected"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: "#f3f4f6" }}>
              <h3 className="font-semibold mb-2" style={{ color: siteConfig.theme.primary }}>
                Booking Summary
              </h3>
              <div className="space-y-1 text-sm" style={{ color: siteConfig.theme.secondary }}>
                <p>
                  <span className="font-medium">Room:</span> {room.room_name}
                </p>
                <p>
                  <span className="font-medium">Date:</span> {new Date(timeSlot.date).toLocaleDateString()}
                </p>
                <p>
                  <span className="font-medium">Time:</span> {startTime && selectedEndTime ? `${startTime} - ${selectedEndTime}` : "Not selected"}
                </p>
                <p>
                  <span className="font-medium">Duration:</span> {formatDuration(totalDuration)}
                </p>
                <p>
                  <span className="font-medium">Total Price:</span> ฿{totalPrice.toFixed(2)}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium mb-1" style={{ color: siteConfig.theme.maintext }}>
                  Name *
                </label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  required
                  value={formData.customerName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none"
                  style={{ borderColor: "#d1d5db", color: siteConfig.theme.maintext }}
                />
              </div>

              <div>
                <label htmlFor="customerPhone" className="block text-sm font-medium mb-1" style={{ color: siteConfig.theme.maintext }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="customerPhone"
                  name="customerPhone"
                  required
                  value={formData.customerPhone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none"
                  style={{ borderColor: "#d1d5db", color: siteConfig.theme.maintext }}
                />
              </div>

              {error && (
                <div className="p-3 border rounded-md" style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}>
                  <p className="text-sm" style={{ color: siteConfig.theme.error }}>
                    {error}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-md transition-colors"
                  style={{ color: siteConfig.theme.maintext, backgroundColor: "#f3f4f6" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e5e7eb")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!startTime || !selectedEndTime || (selectionMode === "endTime" ? availableEndTimes.length === 0 : availableDurations.length === 0)}
                  className="flex-1 px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  style={{ backgroundColor: siteConfig.theme.primary }}
                  onMouseEnter={(e) => !(!startTime || !selectedEndTime || (selectionMode === "endTime" ? availableEndTimes.length === 0 : availableDurations.length === 0)) && (e.currentTarget.style.backgroundColor = siteConfig.theme.secondary)}
                  onMouseLeave={(e) => !(!startTime || !selectedEndTime || (selectionMode === "endTime" ? availableEndTimes.length === 0 : availableDurations.length === 0)) && (e.currentTarget.style.backgroundColor = siteConfig.theme.primary)}
                >
                  Proceed to Checkout - ฿{totalPrice.toFixed(2)}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal
          isOpen={showCheckout}
          onClose={handleCheckoutClose}
          bookingData={{
            roomId: timeSlot.roomId,
            roomName: timeSlot.roomName,
            date: timeSlot.date,
            timeSlots: [startTime, endTime],
            totalPrice,
            duration: totalDuration,
            ...formData,
          }}
        />
      )}
    </>
  )
}
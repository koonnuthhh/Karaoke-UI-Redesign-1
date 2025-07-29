"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { siteConfig } from "../config/site-config"
import type { TimeSlot, Room, BookingRequest, ScheduleData } from "../types"
import { apiClient } from "../lib/api-client"
import { LoadingSpinner } from "../components/ui/loading-spinner"
import { calculatePrice, formatDuration, isTimeSlotAvailable, getConsecutiveSlots } from "../lib/time-utils"

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

  // Set default end time when modal opens
  useEffect(() => {
    if (isOpen && startTime) {
      // Handle overnight hours properly
      const [startHour, startMinute] = startTime.split(':').map(Number)
      let endHour = startHour
      let endMinute = startMinute + 30

      if (endMinute >= 60) {
        endMinute = endMinute - 60
        endHour = endHour + 1
      }

      // Handle overnight (after 23:59, go to 00:00)
      if (endHour >= 24) {
        endHour = endHour - 24
      }

      const defaultEndTimeString = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`

      // Check if default end time is available
      const isDefaultEndTimeAvailable = scheduleData.timeSlots.includes(defaultEndTimeString) &&
        isTimeSlotAvailable(defaultEndTimeString, room.id, scheduleData.bookings)

      if (isDefaultEndTimeAvailable) {
        setEndTime(defaultEndTimeString)
      }
    }
  }, [isOpen, startTime, room.id, scheduleData])
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    specialRequests: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const availableSlots = scheduleData.timeSlots.filter((slot) =>
    isTimeSlotAvailable(slot, room.id, scheduleData.bookings),
  )

  // Find the first unavailable slot after start time
  const firstUnavailableSlot = scheduleData.timeSlots
    .filter(slot => {
      const slotTime = new Date(`2000-01-01T${slot}`)
      const startTimeObj = new Date(`2000-01-01T${startTime}`)
      return slotTime > startTimeObj
    })
    .find(slot => !isTimeSlotAvailable(slot, room.id, scheduleData.bookings))

  // Find the closing time slot
  const firstCloseSlot = scheduleData.timeSlots.find(slot => slot === siteConfig.schedule.closeTime)

  // Available end times - must be after start time and before first unavailable slot or closing time + 1 slot
  const availableEndTimes = scheduleData.timeSlots
    .filter(slot => {
      let startTimeObj = new Date(`2000-01-01T${startTime}`);
      let slotTime;
      if (slot < startTime) {
        slotTime = new Date(`2000-01-02T${slot}`);
      } else {
        slotTime = new Date(`2000-01-01T${slot}`);
      }
      if (slotTime <= startTimeObj) return false;


      // Must be before the first unavailable slot + 1 slot (if any)
      if (firstUnavailableSlot) {
        const unavailableTime = new Date(`2000-01-01T${firstUnavailableSlot}`)
        const limitTime = new Date(unavailableTime.getTime() + 30 * 60 * 1000) // Add 30 minutes
        if (slotTime >= limitTime) return false
      }


      // Must be before closing time + 1 slot
      // if (firstCloseSlot) {
      //   const closeTime = new Date(`2000-01-01T${firstCloseSlot}`)
      //   const limitTime = new Date(closeTime.getTime() + 30 * 60 * 1000) // Add 30 minutes
      //   if (slotTime >= limitTime) return false
      // }

      return true
    })

  // Debug logging
  // console.log('Start time:', startTime)
  // console.log('Available slots:', scheduleData.timeSlots)
  // console.log('Available end times:', availableEndTimes)

  const totalDuration = startTime && endTime ?
    (() => {
      let endTimeDate
      if (endTime < "06:00") {
        endTimeDate = new Date(`2000-01-02T${endTime}`)
      } else {
        endTimeDate = new Date(`2000-01-01T${endTime}`)
      }
      const startTimeDate = new Date(`2000-01-01T${startTime}`)
      return (endTimeDate.getTime() - startTimeDate.getTime()) / (1000 * 60)
    })() : 0
  const totalPrice = calculatePrice(room.hourlyRate, totalDuration)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!startTime || !endTime) {
      setError("Please select both start and end times")
      return
    }

    // Check if end time is after start time (handling overnight)
    let endTimeDate
    if (endTime < "06:00") {
      endTimeDate = new Date(`2000-01-02T${endTime}`)
    } else {
      endTimeDate = new Date(`2000-01-01T${endTime}`)
    }
    const startTimeDate = new Date(`2000-01-01T${startTime}`)

    if (endTimeDate <= startTimeDate) {
      setError("End time must be after start time")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const bookingRequest: BookingRequest = {
        roomId: timeSlot.roomId,
        date: timeSlot.date,
        startTime,
        endTime,
        timeSlots: [startTime, endTime], // Add timeSlots array for compatibility
        totalPrice,
        duration: totalDuration,
        ...formData,
      }

      const response = await apiClient.createBooking(bookingRequest)

      if (response.success) {
        alert(`Booking confirmed! Booking ID: ${response.bookingId}\nTotal: $${totalPrice.toFixed(2)}`)
        onClose()
      } else {
        setError(response.message)
      }
    } catch (err) {
      setError("Failed to create booking. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">{siteConfig.content.booking.modalTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Time Selection */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Select Time : Room {room.name}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <select
                  id="startTime"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value)
                    setEndTime("") // Reset end time when start time changes
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <select
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!startTime}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {availableEndTimes.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="bg-purple-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-purple-900 mb-2">Booking Summary</h3>
            <div className="space-y-1 text-sm text-purple-800">
              <p>
                <span className="font-medium">Room:</span> {room.name}
              </p>
              <p>
                <span className="font-medium">Date:</span> {new Date(timeSlot.date).toLocaleDateString()}
              </p>
              <p>
                <span className="font-medium">Time:</span> {startTime && endTime ? `${startTime} - ${endTime}` : "Not selected"}
              </p>
              <p>
                <span className="font-medium">Duration:</span> {formatDuration(totalDuration)}
              </p>
              <p>
                <span className="font-medium">Total Price:</span> ${totalPrice.toFixed(2)}
              </p>
              <p>
                <span className="font-medium">Capacity:</span> {room.capacity}
              </p>
            </div>
          </div>

          {/* Room Features */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Room Features</h4>
            <div className="flex flex-wrap gap-2">
              {room.features.map((feature, index) => (
                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* Booking Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                id="customerName"
                name="customerName"
                required
                value={formData.customerName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="customerEmail"
                name="customerEmail"
                required
                value={formData.customerEmail}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                id="customerPhone"
                name="customerPhone"
                required
                value={formData.customerPhone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="specialRequests" className="block text-sm font-medium text-gray-700 mb-1">
                Special Requests (Optional)
              </label>
              <textarea
                id="specialRequests"
                name="specialRequests"
                rows={3}
                value={formData.specialRequests}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Any special requests or requirements..."
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                {siteConfig.content.booking.cancelButton}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !startTime || !endTime}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Processing...</span>
                  </>
                ) : (
                  `${siteConfig.content.booking.confirmButton} - $${totalPrice.toFixed(2)}`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

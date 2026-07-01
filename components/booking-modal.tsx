"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { X, Upload, Check, AlertCircle, Loader2 } from "lucide-react"
import { siteConfig } from "../config/site-config"
import type { TimeSlot, Room, ScheduleData } from "../types"
import { calculatePrice, formatDuration, isTimeSlotAvailable } from "../lib/time-utils"
import { LoadingSpinner } from "./ui/loading-spinner"
import { PromoInput } from "./promo-input"
import promptpay from "promptpay-qr"
import { QRCodeCanvas } from "qrcode.react"

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  timeSlot: TimeSlot
  room: Room
  scheduleData: ScheduleData
}

type Step = "select" | "confirm" | "payment" | "slip-upload" | "verification" | "success"

interface PaymentData {
  qrPayload: string
  promptPayNumber: string
  amount: number
  accountName: string
  bookingId: string
}

interface SlipVerificationResult {
  success: boolean
  amount: number
  timestamp: string
  message: string
}

const STEP_LABELS: { step: Step; label: string }[] = [
  { step: "select", label: "Details" },
  { step: "confirm", label: "Confirm" },
  { step: "payment", label: "Payment" },
  { step: "slip-upload", label: "Upload" },
  { step: "verification", label: "Verify" },
  { step: "success", label: "Success" },
]

export function BookingModal({ isOpen, onClose, timeSlot, room, scheduleData }: BookingModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("select")

  // --- Step 1: time + customer details ---
  const [startTime, setStartTime] = useState(timeSlot.startTime)
  const [endTime, setEndTime] = useState("")
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    specialRequests: "",
  })
  const [selectError, setSelectError] = useState("")

  // --- Checkout flow state ---
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [verificationResult, setVerificationResult] = useState<SlipVerificationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [timeoutSeconds, setTimeoutSeconds] = useState(300) // 5 minutes
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutStartedRef = useRef(false)
  const [isTimeoutExpired, setIsTimeoutExpired] = useState(false)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [finalPrice, setFinalPrice] = useState(0)
  const [promotionId, setPromotionId] = useState<string>("")

  // Set default end time when modal opens / start time changes
  useEffect(() => {
    if (isOpen && startTime) {
      const [startHour, startMinute] = startTime.split(":").map(Number)
      let endHour = startHour
      let endMinute = startMinute + 60

      if (endMinute >= 60) {
        endMinute -= 60
        endHour += 1
      }
      if (endHour >= 24) {
        endHour -= 24
      }

      const defaultEndTimeString = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`
      const isDefaultEndTimeAvailable = scheduleData.timeSlots.includes(defaultEndTimeString)

      if (isDefaultEndTimeAvailable) {
        setEndTime(defaultEndTimeString)
      }
    }
  }, [isOpen, startTime, room.room_id, scheduleData])

  // Handle timeout expiration
  useEffect(() => {
    if (isTimeoutExpired) {
      setError("Session timed out. Please start your booking again.")
      onClose()
    }
  }, [isTimeoutExpired, onClose])

  // Start timeout countdown when payment step begins
  useEffect(() => {
    if (currentStep === "payment" && !timeoutStartedRef.current) {
      timeoutStartedRef.current = true

      timerRef.current = setInterval(() => {
        setTimeoutSeconds((prev) => {
          const next = prev - 1
          if (next <= 0) {
            setIsTimeoutExpired(true)
            if (timerRef.current) {
              clearInterval(timerRef.current)
              timerRef.current = null
            }
            return 0
          }
          return next
        })
      }, 1000)
    }
  }, [currentStep])

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

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
        firstUnavailableSlot < "06:00" ? new Date(`2000-01-02T${firstUnavailableSlot}`) : new Date(`2000-01-01T${firstUnavailableSlot}`)
      if (slotTime > unavailableTime) return false
    }

    if (firstCloseSlot) {
      const closeTime = firstCloseSlot < "06:00" ? new Date(`2000-01-02T${firstCloseSlot}`) : new Date(`2000-01-01T${firstCloseSlot}`)
      if (slotTime > closeTime) return false
    }

    return true
  })

  const totalDuration =
    startTime && endTime
      ? (() => {
          const endTimeDate = endTime < "06:00" ? new Date(`2000-01-02T${endTime}`) : new Date(`2000-01-01T${endTime}`)
          const startTimeDate = startTime < "06:00" ? new Date(`2000-01-02T${startTime}`) : new Date(`2000-01-01T${startTime}`)
          return (endTimeDate.getTime() - startTimeDate.getTime()) / (1000 * 60)
        })()
      : 0

  const totalPrice = calculatePrice(room.price_per_half_hour, totalDuration)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSelectSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!startTime || !endTime) {
      setSelectError("Please select both start and end times")
      return
    }

    const endTimeDate = endTime < "06:00" ? new Date(`2000-01-02T${endTime}`) : new Date(`2000-01-01T${endTime}`)
    const startTimeDate = new Date(`2000-01-01T${startTime}`)

    if (endTimeDate <= startTimeDate) {
      setSelectError("End time must be after start time")
      return
    }

    setSelectError("")
    setFinalPrice(totalPrice)
    setCurrentStep("confirm")
  }

  const handleBookingSubmit = async () => {
    setIsLoading(true)
    setError("")
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: timeSlot.roomId,
          roomName: timeSlot.roomName,
          date: timeSlot.date,
          timeSlots: [startTime, endTime],
          totalPrice,
          duration: totalDuration,
          ...formData,
        }),
      })

      const result = await response.json()
      if (result.success && result.data.booking_id) {
        const promptPayNumber = siteConfig.payment.promptPayNumber
        const qrPayload = promptpay(promptPayNumber, { amount: finalPrice })

        setPaymentData({
          qrPayload,
          promptPayNumber,
          accountName: siteConfig.payment.accountName,
          amount: finalPrice,
          bookingId: result.data.booking_id,
        })

        setCurrentStep("payment")
      } else {
        setError(result.message || "Failed to create booking")
      }
    } catch (err) {
      console.error("Booking Error: ", err)
      setError("Network error or Someone has booked This time already. Please reload and try again ")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSlipUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file")
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB")
        return
      }

      setSlipFile(file)
      setError("")

      const reader = new FileReader()
      reader.onload = (e) => {
        setSlipPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSlipVerification = async () => {
    if (!slipFile || !paymentData) return
    setIsLoading(true)
    setError("")

    try {
      const slipFormData = new FormData()
      slipFormData.append("bookingId", paymentData.bookingId)
      slipFormData.append("expectedAmount", paymentData.amount.toString())
      slipFormData.append("slipFile", slipFile)

      const response = await fetch("/api/verify-slip", {
        method: "POST",
        body: slipFormData,
      })

      const result: SlipVerificationResult = await response.json()

      if (result.success) {
        const bookedResponse = await fetch("/api/bookings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            booking_id: paymentData.bookingId,
            booking_status: "booked",
            ...(promotionId && { promotion_id: promotionId }),
          }),
        })

        const bookedResult = await bookedResponse.json()

        if (bookedResult.success) {
          setVerificationResult(result)
          setCurrentStep("success")
        }
      } else {
        setError(result.message || "Payment verification failed")
        setCurrentStep("slip-upload")
      }
    } catch (err) {
      setError("Failed to verify payment slip. Please try again or crop out the QR section in your slip.")
      setCurrentStep("slip-upload")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelBooking = async () => {
    if (!paymentData) return

    try {
      const response = await fetch("/api/bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: paymentData.bookingId,
          booking_status: "cancelled",
        }),
      })

      const result = await response.json()

      if (result.success) {
        setPaymentData(null)
        setSlipFile(null)
        setSlipPreview(null)
        setCurrentStep("confirm")
        setError("")
      }
    } catch (err) {
      console.error("Failed to cancel booking:", err)
      setError("Failed to cancel booking. Please try again.")
    }
  }

  // Auto-start verification when reaching verification step
  if (currentStep === "verification" && !isLoading) {
    handleSlipVerification()
  }

  if (!isOpen) return null

  const renderSelectStep = () => (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="font-semibold mb-3" style={{ color: siteConfig.theme.maintext }}>
          Select Time : Room {room.room_name}
        </h3>
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
                setEndTime("")
              }}
              className="w-full px-3 py-2 border rounded-md focus:outline-none"
              style={{ borderColor: "#d1d5db", color: siteConfig.theme.maintext }}
            >
              {availableSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="endTime" className="block text-sm font-medium mb-1" style={{ color: siteConfig.theme.maintext }}>
              End Time
            </label>
            <select
              id="endTime"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={!startTime}
              className="w-full px-3 py-2 border rounded-md focus:outline-none disabled:cursor-not-allowed"
              style={{
                borderColor: "#d1d5db",
                backgroundColor: !startTime ? "#f3f4f6" : "white",
                color: siteConfig.theme.maintext,
              }}
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
            <span className="font-medium">Time:</span> {startTime && endTime ? `${startTime} - ${endTime}` : "Not selected"}
          </p>
          <p>
            <span className="font-medium">Duration:</span> {formatDuration(totalDuration)}
          </p>
          <p>
            <span className="font-medium">Total Price:</span> ฿{totalPrice.toFixed(2)}
          </p>
        </div>
      </div>

      <form onSubmit={handleSelectSubmit} className="space-y-4">
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

        {selectError && (
          <div className="p-3 border rounded-md" style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}>
            <p className="text-sm" style={{ color: siteConfig.theme.error }}>
              {selectError}
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
            disabled={!startTime || !endTime}
            className="flex-1 px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{ backgroundColor: siteConfig.theme.primary }}
            onMouseEnter={(e) => !(!startTime || !endTime) && (e.currentTarget.style.backgroundColor = siteConfig.theme.secondary)}
            onMouseLeave={(e) => !(!startTime || !endTime) && (e.currentTarget.style.backgroundColor = siteConfig.theme.primary)}
          >
            Continue to Confirmation - ฿{totalPrice.toFixed(2)}
          </button>
        </div>
      </form>
    </div>
  )

  const renderConfirmStep = () => (
    <div className="p-6">
      <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: "#f3f4f6" }}>
        <h3 className="font-semibold mb-2" style={{ color: siteConfig.theme.maintext }}>
          Booking Summary
        </h3>
        <div className="space-y-1 text-sm" style={{ color: siteConfig.theme.secondary }}>
          <p>
            <span className="font-medium">Date:</span> {new Date(timeSlot.date).toLocaleDateString()}
          </p>
          <p>
            <span className="font-medium">Room:</span> {room.room_name}
          </p>
          <p>
            <span className="font-medium">Time: </span>
            {startTime} - {endTime}
          </p>
          <p>
            <span className="font-medium">Duration: </span>
            {totalDuration} minutes
          </p>
          <p>
            <span className="font-medium">Customer:</span> {formData.customerName}
          </p>
          <p>
            <span className="font-medium">Phone:</span> {formData.customerPhone}
          </p>
          <p className={discountAmount > 0 ? "line-through" : ""}>
            <span className="font-medium">Original Amount:</span> ฿{totalPrice.toFixed(2)}
          </p>
          {discountAmount > 0 && (
            <>
              <p>
                <span className="font-medium text-green-600">Discount:</span>{" "}
                <span className="text-green-600">-฿{discountAmount.toFixed(2)}</span>
              </p>
              <p>
                <span className="font-medium">Total Amount:</span>{" "}
                <span className="font-bold text-lg text-green-600">฿{finalPrice.toFixed(2)}</span>
              </p>
            </>
          )}
          {discountAmount === 0 && (
            <p>
              <span className="font-medium">Total Amount:</span> ฿{finalPrice.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      <PromoInput
        cartTotal={totalPrice}
        roomId={timeSlot.roomId}
        onPromoApplied={(newFinalPrice, discount, _promoCode, newPromotionId) => {
          setFinalPrice(newFinalPrice)
          setDiscountAmount(discount)
          setPromotionId(newPromotionId || "")
        }}
      />

      {error && (
        <div className="p-3 border rounded-md mb-4 mt-4" style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}>
          <p className="text-sm" style={{ color: siteConfig.theme.error }}>
            {error}
          </p>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={() => setCurrentStep("select")}
          className="flex-1 px-4 py-2 rounded-md transition-colors"
          style={{ color: siteConfig.theme.maintext, backgroundColor: "#f3f4f6" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e5e7eb")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
        >
          Back
        </button>
        <button
          onClick={handleBookingSubmit}
          disabled={isLoading}
          className="flex-1 px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 flex items-center justify-center"
          style={{ backgroundColor: siteConfig.theme.primary }}
          onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = siteConfig.theme.secondary)}
          onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = siteConfig.theme.primary)}
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-2">Processing...</span>
            </>
          ) : (
            "Proceed to Payment"
          )}
        </button>
      </div>
    </div>
  )

  const renderPaymentStep = () => (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="bg-white p-4 rounded-lg border-2 border-dashed mb-4" style={{ borderColor: "#d1d5db" }}>
          {paymentData?.qrPayload && (
            <QRCodeCanvas value={paymentData.qrPayload} size={256} level="H" className="mx-auto" />
          )}
        </div>

        <div className="space-y-2" style={{ color: siteConfig.theme.maintext }}>
          <p className="text-lg font-semibold">Amount to Pay: ฿{finalPrice.toFixed(2)}</p>
          <p className="text-sm">PromptPay Number: {paymentData?.promptPayNumber}</p>
          <p className="text-sm">Account Name: {paymentData?.accountName}</p>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Booking ID: {paymentData?.bookingId}
          </p>
        </div>
      </div>

      <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: "#eff6ff" }}>
        <h3 className="font-semibold mb-2" style={{ color: siteConfig.theme.secondary }}>
          Payment Instructions
        </h3>
        <ol className="text-sm space-y-1" style={{ color: siteConfig.theme.secondary }}>
          <li>1. Scan the QR code with your banking app</li>
          <li>2. Verify the amount and PromptPay number</li>
          <li>3. Complete the payment</li>
          <li>4. Take a screenshot of the payment slip</li>
          <li>5. Upload the slip in the next step</li>
        </ol>
        <ol className="text-sm font-semibold mb-2" style={{ color: siteConfig.theme.error }}>
          *If you can't scan please transfer money using the promptpay number*
        </ol>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCancelBooking}
          className="flex-1 px-4 py-2 rounded-md transition-colors"
          style={{ color: siteConfig.theme.primary, backgroundColor: "#f3f4f6" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e5e7eb")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep("slip-upload")}
          className="flex-1 px-4 py-2 text-white rounded-md transition-colors"
          style={{ backgroundColor: siteConfig.theme.primary }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = siteConfig.theme.secondary)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = siteConfig.theme.primary)}
        >
          I've Made Payment
        </button>
      </div>
    </div>
  )

  const renderSlipUploadStep = () => (
    <div className="p-6">
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2" style={{ color: siteConfig.theme.maintext }}>
          Upload your payment slip screenshot
        </label>

        <div
          className="border-2 border-dashed rounded-lg p-6 text-center transition-colors"
          style={{ borderColor: "#d1d5db" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = siteConfig.theme.maintext)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
        >
          {slipPreview ? (
            <div className="space-y-4">
              <img src={slipPreview || "/placeholder.svg"} alt="Payment slip preview" className="mx-auto max-h-48 rounded-lg" />
              <p className="text-sm" style={{ color: siteConfig.theme.maintext }}>
                {slipFile?.name}
              </p>
              <button
                onClick={() => {
                  setSlipFile(null)
                  setSlipPreview(null)
                }}
                className="text-sm transition-colors"
                style={{ color: siteConfig.theme.error }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="mx-auto w-12 h-12" style={{ color: "#9ca3af" }} />
              <div>
                <label className="cursor-pointer">
                  <span
                    className="font-medium transition-colors"
                    style={{ color: siteConfig.theme.primary }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    Click to upload
                  </span>
                  <span style={{ color: siteConfig.theme.primary }}> or drag and drop</span>
                  <input type="file" accept="image/*" onChange={handleSlipUpload} className="hidden" />
                </label>
              </div>
              <p className="text-xs" style={{ color: "#6b7280" }}>
                PNG, JPG, GIF up to 5MB
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 border rounded-md mb-4" style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}>
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" style={{ color: siteConfig.theme.error }} />
            <p className="text-sm" style={{ color: siteConfig.theme.error }}>
              {error}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setCurrentStep("payment")}
          className="flex-1 px-4 py-2 rounded-md transition-colors"
          style={{ color: siteConfig.theme.primary, backgroundColor: "#f3f4f6" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e5e7eb")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep("verification")}
          disabled={!slipFile}
          className="flex-1 px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50"
          style={{ backgroundColor: siteConfig.theme.primary }}
          onMouseEnter={(e) => !!slipFile && (e.currentTarget.style.backgroundColor = siteConfig.theme.secondary)}
          onMouseLeave={(e) => !!slipFile && (e.currentTarget.style.backgroundColor = siteConfig.theme.primary)}
        >
          Verify Payment
        </button>
      </div>
    </div>
  )

  const renderVerificationStep = () => (
    <div className="p-6 text-center">
      <div className="mb-6">
        <Loader2 className="mx-auto w-16 h-16 animate-spin" style={{ color: siteConfig.theme.maintext }} />
        <h3 className="text-lg font-bold mt-4 mb-2" style={{ color: siteConfig.theme.maintext }}>
          Verifying Payment
        </h3>
        <p style={{ color: siteConfig.theme.secondary }}>Please wait while we verify your payment slip...</p>
      </div>

      <div className="rounded-lg p-4" style={{ backgroundColor: "#eff6ff" }}>
        <p className="text-sm" style={{ color: siteConfig.theme.secondary }}>
          This process usually takes 10-30 seconds. Please don't close this window.
        </p>
      </div>
    </div>
  )

  const renderSuccessStep = () => (
    <div className="p-6 text-center">
      <div className="mb-6">
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "#f0fdf4" }}>
          <Check className="w-8 h-8" style={{ color: siteConfig.theme.success }} />
        </div>
        <p className="text-gray-600">Your payment has been verified and your booking is confirmed.</p>
      </div>

      {verificationResult && paymentData && (
        <div className="bg-green-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-green-900 mb-3">Booking Details</h3>
          <div className="space-y-2 text-sm text-green-800">
            <div className="flex justify-between">
              <span>Booking ID:</span>
              <span className="font-mono">{paymentData.bookingId}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span>฿{verificationResult.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Time:</span>
              <span>{new Date(verificationResult.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{formData.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(timeSlot.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Room:</span>
              <span>{room.room_name}</span>
            </div>
            <div className="flex justify-between">
              <span>Time: </span>
              <span>
                {startTime} - {endTime}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{totalDuration} minutes</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p style={{ color: siteConfig.theme.error }}>Don't forget to capture this screen!!</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 text-white rounded-md transition-colors"
          style={{ backgroundColor: siteConfig.theme.primary }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = siteConfig.theme.secondary)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = siteConfig.theme.primary)}
        >
          Close
        </button>
      </div>
    </div>
  )

  const stepTitles: Record<Step, string> = {
    select: "Book Your Karaoke Session",
    confirm: "Confirm Your Booking",
    payment: "Payment via PromptPay",
    "slip-upload": "Upload Payment Slip",
    verification: "Verifying Payment",
    success: "Booking Confirmed!",
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={currentStep === "select" ? onClose : undefined}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold" style={{ color: siteConfig.theme.maintext }}>
              {stepTitles[currentStep]}
            </h2>
            {(currentStep === "payment" || currentStep === "slip-upload") && timeoutStartedRef.current && (
              <div
                className="px-2 py-2 border rounded text-sm font-medium"
                style={{ color: siteConfig.theme.maintext, borderColor: "#d1d5db" }}
              >
                ⏱️ {formatTime(timeoutSeconds)}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={currentStep === "verification"}
            className="transition-colors disabled:cursor-not-allowed"
            style={{ color: "#9ca3af" }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.color = "#6b7280")}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.color = "#9ca3af")}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-between text-xs">
            {STEP_LABELS.map(({ step, label }) => (
              <div
                key={step}
                className="flex items-center"
                style={{ color: currentStep === step ? siteConfig.theme.primary : "#9ca3af" }}
              >
                <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
                {label}
              </div>
            ))}
          </div>
        </div>

        {currentStep === "select" && renderSelectStep()}
        {currentStep === "confirm" && renderConfirmStep()}
        {currentStep === "payment" && renderPaymentStep()}
        {currentStep === "slip-upload" && renderSlipUploadStep()}
        {currentStep === "verification" && renderVerificationStep()}
        {currentStep === "success" && renderSuccessStep()}
      </div>
    </div>
  )
}

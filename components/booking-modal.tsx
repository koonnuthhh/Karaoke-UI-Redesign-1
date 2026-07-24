"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { X, Upload, Check, AlertCircle, Loader2, Minus, Plus, Calendar, Clock } from "lucide-react"
import { siteConfig } from "../config/site-config"
import type { TimeSlot, Room, ScheduleData } from "../types"
import { calculatePrice, formatDuration, isTimeSlotAvailable } from "../lib/time-utils"
import { LoadingSpinner } from "./ui/loading-spinner"
import { PromoInput } from "./promo-input"
import promptpay from "promptpay-qr"
import { QRCodeCanvas } from "qrcode.react"
import {
  getStoredPendingBooking,
  savePendingBooking,
  clearPendingBooking,
  type StoredPendingBooking,
} from "../lib/pending-booking"
import { isValidThaiPhone } from "../lib/validation"

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  timeSlot: TimeSlot
  room: Room
  scheduleData: ScheduleData
}

type Step = "details" | "confirm" | "payment" | "slip-upload" | "verify"
type VerifyState = "pending" | "success" | "failed"

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
  { step: "details", label: "Details" },
  { step: "confirm", label: "Confirm" },
  { step: "payment", label: "Payment" },
  { step: "slip-upload", label: "Upload" },
  { step: "verify", label: "Verify" },
]

const MIN_DURATION_HALF_STEPS = 2 // 1 hour minimum booking

// Treats times before 06:00 as belonging to "the next day" so overnight
// hours (e.g. open 12:00, close 01:00) compare correctly.
function toComparableDate(time: string): Date {
  return time < "06:00" ? new Date(`2000-01-02T${time}:00`) : new Date(`2000-01-01T${time}:00`)
}

function addMinutes(time: string, minutes: number): string {
  const date = toComparableDate(time)
  date.setMinutes(date.getMinutes() + minutes)
  const hh = date.getHours().toString().padStart(2, "0")
  const mm = date.getMinutes().toString().padStart(2, "0")
  return `${hh}:${mm}`
}

export function BookingModal({ isOpen, onClose, timeSlot, room, scheduleData }: BookingModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("details")

  // --- Step 1: duration + customer details + promo ---
  const startTime = timeSlot.startTime
  const [durationHalfSteps, setDurationHalfSteps] = useState(MIN_DURATION_HALF_STEPS)
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    specialRequests: "",
  })
  const [selectError, setSelectError] = useState("")
  const [discountAmount, setDiscountAmount] = useState(0)
  const [promoFinalPrice, setPromoFinalPrice] = useState(0)
  const [promotionId, setPromotionId] = useState<string>("")

  // --- Checkout flow state ---
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [verificationResult, setVerificationResult] = useState<SlipVerificationResult | null>(null)
  const [verifyState, setVerifyState] = useState<VerifyState>("pending")
  const verifyStartedRef = useRef(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [timeoutSeconds, setTimeoutSeconds] = useState(300) // 5 minutes
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutStartedRef = useRef(false)
  const [isTimeoutExpired, setIsTimeoutExpired] = useState(false)

  // Set when the modal was opened on the customer's own pending booking (matched
  // via localStorage) — the flow then resumes at the payment step with the
  // original times/amount instead of starting a fresh booking.
  const [resumeInfo, setResumeInfo] = useState<StoredPendingBooking | null>(null)

  useEffect(() => {
    if (!isOpen || timeSlot.status !== "pending") return
    const stored = getStoredPendingBooking()
    if (!stored || stored.bookingId !== timeSlot.id) return

    setResumeInfo(stored)
    setFormData((prev) => ({
      ...prev,
      customerName: stored.customerName,
      customerPhone: stored.customerPhone,
    }))
    setPromotionId(stored.promotionId || "")

    const promptPayNumber = siteConfig.payment.promptPayNumber
    setPaymentData({
      qrPayload: promptpay(promptPayNumber, { amount: stored.amount }),
      promptPayNumber,
      accountName: siteConfig.payment.accountName,
      amount: stored.amount,
      bookingId: stored.bookingId,
    })
    setCurrentStep("payment")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, timeSlot.id, timeSlot.status])

  // Only the last slot before close (01:00) can extend the booking past
  // normal closing time, and only up to 02:00 in that one case.
  const isMidnightHalf = startTime === "00:30"
  const effectiveCloseTime = isMidnightHalf ? "02:00" : siteConfig.schedule.closeTime

  const firstUnavailableSlot = scheduleData.timeSlots
    .filter((slot) => toComparableDate(slot) > toComparableDate(startTime))
    .find((slot) => !isTimeSlotAvailable(slot, room.room_id, scheduleData.bookings))

  const minutesUntilClose =
    (toComparableDate(effectiveCloseTime).getTime() - toComparableDate(startTime).getTime()) / (1000 * 60)

  const minutesUntilConflict = firstUnavailableSlot
    ? (toComparableDate(firstUnavailableSlot).getTime() - toComparableDate(startTime).getTime()) / (1000 * 60)
    : Infinity

  const maxDurationMinutes = Math.max(0, Math.min(minutesUntilClose, minutesUntilConflict))
  const maxDurationHalfSteps = Math.floor(maxDurationMinutes / 30)
  const canBookMinimum = maxDurationHalfSteps >= MIN_DURATION_HALF_STEPS

  const clampedDurationHalfSteps = Math.min(
    Math.max(durationHalfSteps, MIN_DURATION_HALF_STEPS),
    Math.max(maxDurationHalfSteps, MIN_DURATION_HALF_STEPS),
  )

  const totalDuration = clampedDurationHalfSteps * 30
  const endTime = addMinutes(startTime, totalDuration)
  const totalPrice = calculatePrice(room.price_per_half_hour, totalDuration)
  const finalPrice = discountAmount > 0 ? promoFinalPrice : totalPrice

  // When resuming a pending booking, the clicked slot may be any cell inside the
  // booked range, so display the original booking's times/amount — not values
  // recomputed from the clicked cell.
  const displayStartTime = resumeInfo?.startTime ?? startTime
  const displayEndTime = resumeInfo?.endTime ?? endTime
  const displayDuration = resumeInfo?.duration ?? totalDuration

  const resetAppliedPromo = () => {
    setDiscountAmount(0)
    setPromotionId("")
  }

  const incrementDuration = () => {
    setDurationHalfSteps((prev) => Math.min(prev + 1, Math.max(maxDurationHalfSteps, MIN_DURATION_HALF_STEPS)))
    resetAppliedPromo()
  }

  const decrementDuration = () => {
    setDurationHalfSteps((prev) => Math.max(prev - 1, MIN_DURATION_HALF_STEPS))
    resetAppliedPromo()
  }

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleContinueToConfirm = () => {
    if (!canBookMinimum) {
      setSelectError("This time slot can't accommodate the minimum 1 hour booking")
      return
    }

    if (!formData.customerName.trim() || !formData.customerPhone.trim()) {
      setSelectError("Please fill in your name and phone number")
      return
    }

    if (!isValidThaiPhone(formData.customerPhone)) {
      setSelectError("Please enter a valid 10-digit phone number (e.g. 0812345678)")
      return
    }

    setSelectError("")
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

        // Remember the unfinished booking so the customer can click their pending
        // slot on the schedule and resume payment after closing the modal.
        savePendingBooking({
          bookingId: result.data.booking_id,
          roomId: timeSlot.roomId,
          date: timeSlot.date,
          startTime,
          endTime,
          duration: totalDuration,
          amount: finalPrice,
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          promotionId,
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
          clearPendingBooking()
          setVerificationResult(result)
          setVerifyState("success")
        } else {
          setError(bookedResult.message || "Failed to finalize booking")
          setVerifyState("failed")
        }
      } else {
        setError(result.message || "Payment verification failed")
        setVerifyState("failed")
      }
    } catch (err) {
      setError("Failed to verify payment slip. Please try again or crop out the QR section in your slip.")
      setVerifyState("failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetryVerification = () => {
    verifyStartedRef.current = false
    setVerifyState("pending")
    setCurrentStep("slip-upload")
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
        clearPendingBooking()
        setPaymentData(null)
        setSlipFile(null)
        setSlipPreview(null)
        if (resumeInfo) {
          // A resumed booking has no fresh details/confirm state to fall back to —
          // cancelling it just closes the modal.
          setResumeInfo(null)
          onClose()
        } else {
          setCurrentStep("confirm")
        }
        setError("")
      }
    } catch (err) {
      console.error("Failed to cancel booking:", err)
      setError("Failed to cancel booking. Please try again.")
    }
  }

  // Auto-start verification once when entering the verify step
  useEffect(() => {
    if (currentStep === "verify" && !verifyStartedRef.current) {
      verifyStartedRef.current = true
      handleSlipVerification()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  if (!isOpen) return null

  const secondaryButtonClass = "flex-1 px-4 py-2 rounded-md transition-colors"
  const secondaryButtonStyle = { color: siteConfig.theme.maintext, backgroundColor: "#f3f4f6" }
  const secondaryButtonHover = (e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = "#e5e7eb")
  const secondaryButtonLeave = (e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = "#f3f4f6")

  const renderDetailsBody = () => (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="font-semibold mb-3" style={{ color: siteConfig.theme.maintext }}>
          Select Duration : Room {room.room_name}
        </h3>
        <div className="rounded-lg border p-4" style={{ borderColor: "#d1d5db" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium" style={{ color: siteConfig.theme.maintext }}>
              Start Time
            </span>
            <span className="text-sm font-semibold" style={{ color: siteConfig.theme.maintext }}>
              {startTime}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: siteConfig.theme.maintext }}>
              Duration
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={decrementDuration}
                disabled={clampedDurationHalfSteps <= MIN_DURATION_HALF_STEPS}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: siteConfig.theme.primary, color: siteConfig.theme.primary }}
                aria-label="Decrease duration by 30 minutes"
              >
                <Minus className="w-4 h-4" />
              </button>
              {/* Fixed width so the text length changing (e.g. "1 hour" vs "1 hour 30 minutes")
                  never shifts the +/- buttons out from under repeated clicks. */}
              <span
                className="w-[9.5rem] flex-shrink-0 text-center font-semibold whitespace-nowrap"
                style={{ color: siteConfig.theme.maintext }}
              >
                {formatDuration(totalDuration)}
              </span>
              <button
                type="button"
                onClick={incrementDuration}
                disabled={!canBookMinimum || clampedDurationHalfSteps >= maxDurationHalfSteps}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: siteConfig.theme.primary, color: siteConfig.theme.primary }}
                aria-label="Increase duration by 30 minutes"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t text-sm" style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>
            <span>End Time</span>
            <span>{endTime}</span>
          </div>
        </div>
        {!canBookMinimum && (
          <p className="text-sm mt-2" style={{ color: siteConfig.theme.error }}>
            This time slot can't accommodate the minimum 1 hour booking.
          </p>
        )}
      </div>

      <div className="space-y-4">
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
            inputMode="numeric"
            maxLength={20}
            value={formData.customerPhone}
            onChange={(e) => {
              // Strip separators (e.g. pasted "089-995-6542") and keep digits only,
              // clamped to 10 so the stored value always matches what's validated
              const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10)
              setFormData((prev) => ({ ...prev, customerPhone: digitsOnly }))
            }}
            placeholder="0812345678"
            className="w-full px-3 py-2 border rounded-md focus:outline-none"
            style={{ borderColor: "#d1d5db", color: siteConfig.theme.maintext }}
          />
        </div>

        <PromoInput
          key={clampedDurationHalfSteps}
          cartTotal={totalPrice}
          roomId={timeSlot.roomId}
          bookingDate={timeSlot.date}
          bookingTime={startTime}
          bookingEndTime={endTime}
          onPromoApplied={(newFinalPrice, discount, _promoCode, newPromotionId) => {
            setPromoFinalPrice(newFinalPrice)
            setDiscountAmount(discount)
            setPromotionId(newPromotionId || "")
          }}
        />

        {selectError && (
          <div className="p-3 border rounded-md" style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}>
            <p className="text-sm" style={{ color: siteConfig.theme.error }}>
              {selectError}
            </p>
          </div>
        )}

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
              <span className="font-medium">Time:</span> {startTime} - {endTime}
            </p>
            <p>
              <span className="font-medium">Duration:</span> {formatDuration(totalDuration)}
            </p>
            <p>
              <span className="font-medium">Total Price:</span> ฿{totalPrice.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderDetailsFooter = () => (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        className={secondaryButtonClass}
        style={secondaryButtonStyle}
        onMouseEnter={secondaryButtonHover}
        onMouseLeave={secondaryButtonLeave}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleContinueToConfirm}
        disabled={!canBookMinimum}
        className="flex-1 px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        style={{ backgroundColor: siteConfig.theme.primary }}
        onMouseEnter={(e) => canBookMinimum && (e.currentTarget.style.backgroundColor = siteConfig.theme.secondary)}
        onMouseLeave={(e) => canBookMinimum && (e.currentTarget.style.backgroundColor = siteConfig.theme.primary)}
      >
        Continue to Confirmation - ฿{finalPrice.toFixed(2)}
      </button>
    </div>
  )

  const renderConfirmBody = () => (
    <div className="p-6">
      <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: "#f3f4f6" }}>
        <h3 className="font-semibold mb-2" style={{ color: siteConfig.theme.maintext }}>
          Booking Summary
        </h3>

        {/* Prominent date & time — customers often overlook these and book the
            wrong slot, so surface them large, bold and clearly separated. */}
        <div
          className="rounded-lg border-2 p-3 mb-3"
          style={{ borderColor: siteConfig.theme.primary, backgroundColor: "#eff6ff" }}
        >
          <div className="flex items-center gap-2 mb-1.5" style={{ color: siteConfig.theme.secondary }}>
            <Calendar className="w-5 h-5 flex-shrink-0" style={{ color: siteConfig.theme.primary }} />
            <span className="text-base font-bold">
              {new Date(timeSlot.date + "T00:00:00").toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-baseline gap-2" style={{ color: siteConfig.theme.secondary }}>
            <Clock className="w-5 h-5 flex-shrink-0 self-center" style={{ color: siteConfig.theme.primary }} />
            <span className="text-2xl font-extrabold tracking-tight">
              {startTime} – {endTime}
            </span>
            <span className="text-sm font-medium">({formatDuration(totalDuration)})</span>
          </div>
          
        </div>

        <div className="space-y-1 text-sm" style={{ color: siteConfig.theme.secondary }}>
          <p>
            <span className="font-medium">Room:</span> {room.room_name}
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
        <p className="text-xs mt-2 font-medium" style={{ color: siteConfig.theme.error }}>
          ⚠️ กรุณาตรวจสอบวันและเวลาให้ถูกต้องก่อนชำระเงิน / Please double-check the date &amp; time before paying.
        </p>
      </div>

      {error && (
        <div className="p-3 border rounded-md mb-4" style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}>
          <p className="text-sm" style={{ color: siteConfig.theme.error }}>
            {error}
          </p>
        </div>
      )}
    </div>
  )

  const renderConfirmFooter = () => (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => setCurrentStep("details")}
        className={secondaryButtonClass}
        style={secondaryButtonStyle}
        onMouseEnter={secondaryButtonHover}
        onMouseLeave={secondaryButtonLeave}
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
  )

  const renderPaymentBody = () => (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="bg-white p-4 rounded-lg border-2 border-dashed mb-4" style={{ borderColor: "#d1d5db" }}>
          {paymentData?.qrPayload && (
            <QRCodeCanvas value={paymentData.qrPayload} size={256} level="H" className="mx-auto" />
          )}
        </div>

        <div className="space-y-2" style={{ color: siteConfig.theme.maintext }}>
          <p className="text-lg font-semibold">Amount to Pay: ฿{(paymentData?.amount ?? finalPrice).toFixed(2)}</p>
          <p className="text-sm">PromptPay Number: {paymentData?.promptPayNumber}</p>
          <p className="text-sm">Account Name: {paymentData?.accountName}</p>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Booking ID: {paymentData?.bookingId}
          </p>
        </div>
      </div>

      <div className="rounded-lg p-4" style={{ backgroundColor: "#eff6ff" }}>
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
    </div>
  )

  const renderPaymentFooter = () => (
    <div className="flex gap-3">
      <button
        onClick={handleCancelBooking}
        className="flex-1 px-4 py-2 rounded-md transition-colors"
        style={{ color: siteConfig.theme.primary, backgroundColor: "#f3f4f6" }}
        onMouseEnter={secondaryButtonHover}
        onMouseLeave={secondaryButtonLeave}
      >
        {resumeInfo ? "Cancel Booking" : "Back"}
      </button>
      <button
        onClick={() => setCurrentStep("slip-upload")}
        className="flex-1 px-4 py-2 text-white rounded-md transition-colors bg-sky-500 hover:bg-sky-600"
      >
        Verify Slip
      </button>
    </div>
  )

  const renderSlipUploadBody = () => (
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
    </div>
  )

  const renderSlipUploadFooter = () => (
    <div className="flex gap-3">
      <button
        onClick={() => setCurrentStep("payment")}
        className="flex-1 px-4 py-2 rounded-md transition-colors"
        style={{ color: siteConfig.theme.primary, backgroundColor: "#f3f4f6" }}
        onMouseEnter={secondaryButtonHover}
        onMouseLeave={secondaryButtonLeave}
      >
        Back
      </button>
      <button
        onClick={() => setCurrentStep("verify")}
        disabled={!slipFile}
        className="flex-1 px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50"
        style={{ backgroundColor: siteConfig.theme.primary }}
        onMouseEnter={(e) => !!slipFile && (e.currentTarget.style.backgroundColor = siteConfig.theme.secondary)}
        onMouseLeave={(e) => !!slipFile && (e.currentTarget.style.backgroundColor = siteConfig.theme.primary)}
      >
        Verify Payment
      </button>
    </div>
  )

  const renderVerifyBody = () => (
    <div className="p-6 text-center">
      {verifyState === "pending" && (
        <>
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
        </>
      )}

      {verifyState === "success" && (
        <>
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
                    {displayStartTime} - {displayEndTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{formatDuration(displayDuration)}</span>
                </div>
              </div>
            </div>
          )}

          <p style={{ color: siteConfig.theme.error }}>Don't forget to capture this screen!!</p>
        </>
      )}

      {verifyState === "failed" && (
        <div className="mb-2">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "#fef2f2" }}>
            <AlertCircle className="w-8 h-8" style={{ color: siteConfig.theme.error }} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: siteConfig.theme.maintext }}>
            Verification Failed
          </h3>
          <p style={{ color: siteConfig.theme.secondary }}>{error || "Payment verification failed"}</p>
        </div>
      )}
    </div>
  )

  const renderVerifyFooter = () => {
    if (verifyState === "success") {
      return (
        <button
          onClick={onClose}
          className="w-full px-4 py-2 text-white rounded-md transition-colors"
          style={{ backgroundColor: siteConfig.theme.primary }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = siteConfig.theme.secondary)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = siteConfig.theme.primary)}
        >
          Close
        </button>
      )
    }

    if (verifyState === "failed") {
      return (
        <button
          onClick={handleRetryVerification}
          className="w-full px-4 py-2 text-white rounded-md transition-colors"
          style={{ backgroundColor: siteConfig.theme.primary }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = siteConfig.theme.secondary)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = siteConfig.theme.primary)}
        >
          Try Again
        </button>
      )
    }

    return null
  }

  const stepTitles: Record<Step, string> = {
    details: "Book Your Karaoke Session",
    confirm: "Confirm Your Booking",
    payment: "Payment via PromptPay",
    "slip-upload": "Upload Payment Slip",
    verify:
      verifyState === "success" ? "Booking Confirmed!" : verifyState === "failed" ? "Verification Failed" : "Verifying Payment",
  }

  const stepBody: Record<Step, () => React.ReactNode> = {
    details: renderDetailsBody,
    confirm: renderConfirmBody,
    payment: renderPaymentBody,
    "slip-upload": renderSlipUploadBody,
    verify: renderVerifyBody,
  }

  const stepFooter: Record<Step, () => React.ReactNode> = {
    details: renderDetailsFooter,
    confirm: renderConfirmFooter,
    payment: renderPaymentFooter,
    "slip-upload": renderSlipUploadFooter,
    verify: renderVerifyFooter,
  }

  const footerContent = stepFooter[currentStep]()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={currentStep === "details" ? onClose : undefined}>
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - stays fixed at the top */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0" style={{ borderColor: "#e5e7eb" }}>
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
            disabled={currentStep === "verify" && verifyState === "pending"}
            className="transition-colors disabled:cursor-not-allowed"
            style={{ color: "#9ca3af" }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.color = "#6b7280")}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.color = "#9ca3af")}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Indicator - stays fixed under the header */}
        <div className="px-6 py-3 bg-gray-50 border-b flex-shrink-0">
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

        {/* Scrollable content - only this area scrolls */}
        <div className="flex-1 overflow-y-auto min-h-0">{stepBody[currentStep]()}</div>

        {/* Footer - stays fixed at the bottom so the action buttons are never scrolled out of view */}
        {footerContent && (
          <div className="p-6 border-t flex-shrink-0 bg-white" style={{ borderColor: "#e5e7eb" }}>
            {footerContent}
          </div>
        )}
      </div>
    </div>
  )
}

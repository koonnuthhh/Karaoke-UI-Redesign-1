"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { siteConfig } from "../config/site-config"
import type { TimeSlot, Room, ScheduleData, BookingRequest } from "../types"
import { calculatePrice, formatDuration, isTimeSlotAvailable } from "../lib/time-utils"
import { LoadingSpinner } from "../components/ui/loading-spinner"
import { TimeSelect } from "../components/ui/time-select"
import { AlertModal } from "./AlertModal"
import { PromoInput } from "./promo-input"
import { getAdminUser } from "../lib/admin-service"

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

function minutesBetween(start: string, end: string): number {
    let endDate = toComparableDate(end)
    const startDate = toComparableDate(start)
    if (endDate <= startDate) endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000)
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60)
}

function formatDateTime(dateTime: string | undefined) {
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

interface AdminBookingModalProps {
    isOpen: boolean
    onClose: () => void
    timeSlot: TimeSlot
    room: Room
    scheduleData: ScheduleData
    adminCredential: string | null
}
export function AdminBookingModal({ isOpen, onClose, timeSlot, room, scheduleData, adminCredential }: AdminBookingModalProps) {
    const [startTime, setStartTime] = useState(timeSlot.startTime)
    const [endTime, setEndTime] = useState("")
    const [customPrice, setCustomPrice] = useState<number | null>(null)
    const [discount, setDiscount] = useState<{ original_price: number; discount_amount: number; final_price: number } | null>(null)
    const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null)
    const [appliedPromotionId, setAppliedPromotionId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        specialRequests: "",
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [showConfirmCancel, setShowConfirmCancel] = useState(false)
    const currentUser = getAdminUser()
    const isModulator = currentUser?.role === "modulator"

    const isManageableSlot = timeSlot.status === "booked" || timeSlot.status === "pending"
    const bookedSlot = isManageableSlot
        ? scheduleData.bookings.find(b => b.id === timeSlot.id)
        : null

    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<{ roomId: string; customerName: string; startTime: string; duration: number } | null>(null)
    const [editCustomPrice, setEditCustomPrice] = useState<number | null>(null)
    const [editDiscount, setEditDiscount] = useState<{ original_price: number; discount_amount: number; final_price: number } | null>(null)
    const [editAppliedPromoCode, setEditAppliedPromoCode] = useState<string | null>(null)
    const [editAppliedPromotionId, setEditAppliedPromotionId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [editError, setEditError] = useState("")

    const editRoom = editForm ? scheduleData.rooms.find(r => r.room_id === editForm.roomId) : undefined
    const editEndTime = editForm ? addMinutesToTime(editForm.startTime, editForm.duration) : ""
    const editCalculatedPrice = editForm && editRoom ? calculatePrice(editRoom.price_per_half_hour, editForm.duration) : 0
    const editPriceBeforeDiscount = editCustomPrice !== null && editCustomPrice >= 0 ? editCustomPrice : editCalculatedPrice
    const editFinalPrice = editDiscount ? editDiscount.final_price : editPriceBeforeDiscount

    // Automatically recalculate the applied promo's discount when the price, room, or time being edited changes.
    useEffect(() => {
        if (!editForm || !editAppliedPromoCode) return
        const priceToUse = editCustomPrice !== null && editCustomPrice >= 0 ? editCustomPrice : editCalculatedPrice
        const reapplyPromo = async () => {
            try {
                const response = await fetch("/api/user/promotions/apply", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        data: {
                            code: editAppliedPromoCode,
                            total_price: priceToUse,
                            roomId: editForm.roomId,
                            date: timeSlot.date,
                            time: editForm.startTime,
                            endTime: editEndTime,
                        },
                    }),
                })
                const result = await response.json()
                if (result.success && result.data) {
                    setEditDiscount({
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
    }, [editCustomPrice, editAppliedPromoCode, editCalculatedPrice, editForm?.roomId, editForm?.startTime, editEndTime])

    const openEditMode = () => {
        if (!bookedSlot) return
        setEditError("")
        const start = (bookedSlot.bookingStart || timeSlot.bookingStart || timeSlot.startTime).slice(0, 5)
        const end = (bookedSlot.bookingEnd || timeSlot.bookingEnd || addMinutesToTime(start, 30)).slice(0, 5)
        setEditForm({
            roomId: bookedSlot.roomId || room.room_id,
            customerName: bookedSlot.customerName || "",
            startTime: start,
            duration: minutesBetween(start, end),
        })
        setEditCustomPrice(null)
        setEditDiscount(null)
        setEditAppliedPromoCode(null)
        setEditAppliedPromotionId(null)
        setIsEditing(true)
    }

    const closeEditMode = () => {
        setIsEditing(false)
        setEditForm(null)
        setEditError("")
        setEditCustomPrice(null)
        setEditDiscount(null)
        setEditAppliedPromoCode(null)
        setEditAppliedPromotionId(null)
    }

    const handleSaveEdit = async () => {
        if (!timeSlot.id || !editForm) return
        setIsSaving(true)
        setEditError("")
        try {
            const response = await fetch("/api/bookings", {
                method: "PUT",
                headers: { "Content-Type": "application/json", "credential": adminCredential ? adminCredential : "" },
                body: JSON.stringify({
                    booking_id: timeSlot.id,
                    room_id: editForm.roomId,
                    username: editForm.customerName,
                    start_time: editForm.startTime,
                    end_time: editEndTime,
                    price: editFinalPrice,
                    ...(editAppliedPromotionId && { promotion_id: editAppliedPromotionId }),
                    ...(currentUser && { booked_by_admin_id: currentUser.admin_id, booked_by_admin_name: currentUser.username }),
                    // Admin editing a pending booking and saving is treated as final confirmation —
                    // no need to wait on the customer's payment-slip verification.
                    ...(timeSlot.status?.toLowerCase() === "pending" && { booking_status: "booked" }),
                }),
            })
            const result = await response.json()
            if (result.success) {
                closeEditMode()
                onClose()
            } else {
                setEditError(result.message || result.error?.message || "Failed to save booking")
            }
        } catch (err) {
            setEditError("Network error. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }


    // same available slots logic as BookingModal
    const availableSlots = scheduleData.timeSlots.filter((slot) =>
        isTimeSlotAvailable(slot, room.room_id, scheduleData.bookings),
    )

    const firstUnavailableSlot = scheduleData.timeSlots
        .filter(slot => {
            let slotTime, startTimeObj
            if (slot < "06:00") slotTime = new Date(`2000-01-02T${slot}`)
            else slotTime = new Date(`2000-01-01T${slot}`)
            if (startTime < "06:00") startTimeObj = new Date(`2000-01-02T${startTime}`)
            else startTimeObj = new Date(`2000-01-01T${startTime}`)
            return slotTime > startTimeObj
        })
        .find(slot => !isTimeSlotAvailable(slot, room.room_id, scheduleData.bookings))

    const firstCloseSlot = scheduleData.timeSlots.find(slot => slot === siteConfig.schedule.closeTime)

    const availableEndTimes = scheduleData.timeSlots.filter(slot => {
        let startTimeObj, slotTime
        if (startTime < "06:00") startTimeObj = new Date(`2000-01-02T${startTime}`)
        else startTimeObj = new Date(`2000-01-01T${startTime}`)
        if (slot < "06:00") slotTime = new Date(`2000-01-02T${slot}`)
        else slotTime = new Date(`2000-01-01T${slot}`)

        if (slotTime <= startTimeObj) return false
        if (firstUnavailableSlot) {
            let unavailableTime
            if (firstUnavailableSlot < "06:00") unavailableTime = new Date(`2000-01-02T${firstUnavailableSlot}`)
            else unavailableTime = new Date(`2000-01-01T${firstUnavailableSlot}`)
            if (slotTime > unavailableTime) return false
        }
        if (firstCloseSlot) {
            let closeTime
            if (firstCloseSlot < "06:00") closeTime = new Date(`2000-01-02T${firstCloseSlot}`)
            else closeTime = new Date(`2000-01-01T${firstCloseSlot}`)
            if (slotTime > closeTime) return false
        }
        return true
    })

    // default end time logic same as BookingModal
    // Set default end time separately
    useEffect(() => {
        if (isOpen && startTime) {
            const [startHour, startMinute] = startTime.split(':').map(Number);
            let endHour = startHour;
            let endMinute = startMinute + 30;

            if (endMinute >= 60) {
                endMinute -= 60;
                endHour += 1;
            }
            if (endHour >= 24) {
                endHour -= 24;
            }

            const defaultEnd = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
            if (scheduleData.timeSlots.includes(defaultEnd)) {
                setEndTime(defaultEnd);
            }
        }
    }, [isOpen, startTime, scheduleData.timeSlots]);

    // Reset custom price and discount when modal opens
    useEffect(() => {
        if (isOpen) {
            setCustomPrice(null)
            setDiscount(null)
            setAppliedPromoCode(null)
            setAppliedPromotionId(null)
            closeEditMode()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, timeSlot.id]);

    const totalDuration = startTime && endTime
        ? (() => {
            let endTimeDate = endTime < "06:00" ? new Date(`2000-01-02T${endTime}`) : new Date(`2000-01-01T${endTime}`)
            let startTimeDate = startTime < "06:00" ? new Date(`2000-01-02T${startTime}`) : new Date(`2000-01-01T${startTime}`)
            return (endTimeDate.getTime() - startTimeDate.getTime()) / (1000 * 60)
        })()
        : 0

    const calculatedPrice = calculatePrice(room.price_per_half_hour, totalDuration)

    // Automatically recalculate discount when custom price changes
    useEffect(() => {
        if (appliedPromoCode) {
            const priceToUse = customPrice !== null && customPrice >= 0 ? customPrice : calculatedPrice
            const reapplyPromo = async () => {
                try {
                    const response = await fetch("/api/user/promotions/apply", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            data: {
                                code: appliedPromoCode,
                                total_price: priceToUse,
                                roomId: room.room_id,
                                date: timeSlot.date,
                                time: startTime,
                                endTime,
                            },
                        }),
                    })
                    const result = await response.json()
                    if (result.success && result.data) {
                        setDiscount({
                            original_price: priceToUse,
                            discount_amount: result.data.discount_amount,
                            final_price: result.data.final_price
                        })
                    }
                } catch (err) {
                    // Silently fail - keep existing discount
                }
            }
            reapplyPromo()
        }
    }, [customPrice, appliedPromoCode, calculatedPrice]);
    const priceBeforeDiscount = customPrice !== null && customPrice >= 0 ? customPrice : calculatedPrice
    const finalPrice = discount ? discount.final_price : priceBeforeDiscount

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value,
        }))
    }

    const createAndConfirmBooking = async () => {
        if (!startTime || !endTime) {
            setError("Please select both start and end times")
            return
        }
        setIsSubmitting(true)
        setError("")
        try {
            // Step 1: Create booking as pending
            const bookingRequest: BookingRequest = {
                roomId: timeSlot.roomId,
                roomName: timeSlot.roomName,
                date: timeSlot.date,
                timeSlots: [startTime, endTime],
                totalPrice: finalPrice,
                duration: totalDuration,
                ...formData,
                ...(currentUser && { bookedByAdminId: currentUser.admin_id, bookedByAdminName: currentUser.username }),
            }
            const createRes = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bookingRequest)
            })
            const createResult = await createRes.json()
            if (!createResult.success || !createResult.data?.booking_id) {
                setError(createResult.message || "Failed to create booking")
                setIsSubmitting(false)
                return
            }
            // Step 2: Immediately confirm booking
            const updateRes = await fetch("/api/bookings", {
                method: "PUT",
                headers: { "Content-Type": "application/json", "credential": adminCredential ? adminCredential : "" },
                body: JSON.stringify({
                    booking_id: createResult.data.booking_id,
                    booking_status: "booked",
                    ...(appliedPromotionId && { promotion_id: appliedPromotionId }),
                })
            })
            const updateResult = await updateRes.json()
            if (!updateResult.success) {
                setError(updateResult.message || "Failed to confirm booking")
                setIsSubmitting(false)
                return
            }
            onClose()
        } catch (e) {
            setError("Network error while creating booking")
        } finally {
            setIsSubmitting(false)
        }
    }

    const confirmCancelBooking = async () => {
        setIsSubmitting(true)
        setError("")
        try {
            const res = await fetch("/api/bookings", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "credential": adminCredential ? adminCredential : ""
                },
                body: JSON.stringify({
                    booking_id: timeSlot.id,
                    booking_status: "cancelled"
                })
            })

            const result = await res.json()
            if (!result.success) {
                setError(result.message || "Failed to cancel booking")
            } else {
                onClose()
            }
        } catch {
            setError("Network error while cancelling booking")
        } finally {
            setIsSubmitting(false)
            setShowConfirmCancel(false)
        }
    }

    const handleCancelBooking = () => {
        if (!timeSlot.id) return
        setShowConfirmCancel(true)
    }

    if (!isOpen) return null


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold">
                        {timeSlot.status === "booked" ? "Booking Details" : timeSlot.status === "pending" ? "Pending Booking Details" : "Admin Booking"}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    {isManageableSlot && isEditing && editForm ? (
                        <>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                                <select
                                    value={editForm.roomId}
                                    onChange={(e) => setEditForm({ ...editForm, roomId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    {scheduleData.rooms.map((r) => (
                                        <option key={r.room_id} value={r.room_id}>{r.room_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                                <input
                                    type="text"
                                    value={editForm.customerName}
                                    onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                    <TimeSelect
                                        value={editForm.startTime}
                                        onChange={(time) => setEditForm({ ...editForm, startTime: time })}
                                        className="w-full"
                                        selectClassName="flex-1 min-w-0 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 -mt-2 mb-4">End Time: {editEndTime}</p>

                            <div className="bg-purple-50 rounded-lg p-4 mb-6">
                                <h3 className="font-semibold text-purple-900 mb-2">Booking Summary</h3>
                                <p><span className="font-medium">Original Price:</span> ฿{editCalculatedPrice.toFixed(2)}</p>
                                {editCustomPrice !== null && (
                                    <p className="text-blue-600"><span className="font-medium">Custom Price:</span> ฿{editCustomPrice.toFixed(2)}</p>
                                )}
                                {editDiscount && (
                                    <div className="mt-2 pt-2 border-t border-purple-200">
                                        <p className="text-green-600"><span className="font-medium">Discount:</span> -฿{editDiscount.discount_amount.toFixed(2)}</p>
                                        <p className="font-bold text-lg text-green-600"><span className="font-medium">After Discount:</span> ฿{editDiscount.final_price.toFixed(2)}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Price (Leave blank to use calculated: ฿{editCalculatedPrice.toFixed(2)})
                                    {editAppliedPromoCode && <span className="text-green-600 text-xs ml-2">(Promo will auto-update)</span>}
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={editCustomPrice !== null ? editCustomPrice : ""}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        setEditCustomPrice(value === "" ? null : parseFloat(value) || 0)
                                    }}
                                    placeholder={editCalculatedPrice.toFixed(2)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>

                            <PromoInput
                                cartTotal={editPriceBeforeDiscount}
                                roomId={editForm.roomId}
                                bookingDate={timeSlot.date}
                                bookingTime={editForm.startTime}
                                bookingEndTime={editEndTime}
                                externalDiscount={editDiscount}
                                onPromoApplied={(finalPrice, discountAmount, promoCode, promotionId) => {
                                    if (promoCode === "") {
                                        setEditDiscount(null)
                                        setEditAppliedPromoCode(null)
                                        setEditAppliedPromotionId(null)
                                    } else {
                                        setEditDiscount({
                                            original_price: editPriceBeforeDiscount,
                                            discount_amount: discountAmount,
                                            final_price: finalPrice
                                        })
                                        setEditAppliedPromoCode(promoCode)
                                        setEditAppliedPromotionId(promotionId || null)
                                    }
                                }}
                            />

                            {editError && <p className="text-red-600 mt-3">{editError}</p>}

                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={closeEditMode}
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {isSaving
                                        ? <LoadingSpinner size="sm" />
                                        : timeSlot.status?.toLowerCase() === "pending"
                                            ? `Save & Confirm Booking - ฿${editFinalPrice.toFixed(2)}`
                                            : `Save Changes - ฿${editFinalPrice.toFixed(2)}`}
                                </button>
                            </div>
                        </>
                    ) : isManageableSlot ? (
                        <>
                            <p><strong>Customer:</strong> {bookedSlot?.customerName ?? timeSlot.customerName ?? "Unknown"}</p>
                            <p><strong>Phone:</strong> {bookedSlot?.customerPhone ?? timeSlot.customerPhone ?? "Not provided"}</p>
                            <p><strong>Time:</strong> {timeSlot.bookingStart} - {timeSlot.bookingEnd}</p>
                            <p><strong>Created At:</strong> {formatDateTime(bookedSlot?.created_at)}</p>
                            {bookedSlot?.bookedByAdminName && (
                                <p><strong>Booked By (Admin):</strong> {bookedSlot.bookedByAdminName}</p>
                            )}
                            {timeSlot.status === "pending" && (
                                <p><strong>Status:</strong> <span className="text-yellow-600 font-medium">Pending</span></p>
                            )}
                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={openEditMode}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                    disabled={isSubmitting}
                                >
                                    Edit Booking
                                </button>
                                <button
                                    onClick={handleCancelBooking}
                                    className="flex-1 px-4 py-2 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                                    disabled={isSubmitting}
                                    style={{backgroundColor: siteConfig.theme.error}}
                                >
                                    {isSubmitting ? <LoadingSpinner size="sm" /> : "Cancel Booking"}
                                </button>
                            </div>
                            {error && <p className="text-red-600 mt-3">{error}</p>}
                        </>
                    ) : (
                        <>
                            {/* Same UI as BookingModal */}
                            <div className="mb-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Select Time : Room {room.room_name}</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                        <select
                                            value={startTime}
                                            onChange={(e) => { setStartTime(e.target.value); setEndTime(""); }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            {availableSlots.map((slot) => (
                                                <option key={slot} value={slot}>{slot}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                        <select
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            disabled={!startTime}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                                        >
                                            {availableEndTimes.map((slot) => (
                                                <option key={slot} value={slot}>{slot}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Booking Summary */}
                            <div className="bg-purple-50 rounded-lg p-4 mb-6">
                                <h3 className="font-semibold text-purple-900 mb-2">Booking Summary</h3>
                                <p><span className="font-medium">Room:</span> {room.room_name}</p>
                                <p><span className="font-medium">Date:</span> {new Date(timeSlot.date).toLocaleDateString()}</p>
                                <p><span className="font-medium">Time:</span> {startTime && endTime ? `${startTime} - ${endTime}` : "Not selected"}</p>
                                <p><span className="font-medium">Duration:</span> {formatDuration(totalDuration)}</p>
                                <p><span className="font-medium">Original Price:</span> ฿{calculatedPrice.toFixed(2)}</p>
                                {customPrice !== null && (
                                    <p className="text-blue-600"><span className="font-medium">Custom Price:</span> ฿{customPrice.toFixed(2)}</p>
                                )}
                                {discount && (
                                    <div className="mt-2 pt-2 border-t border-purple-200">
                                        <p className="text-green-600"><span className="font-medium">Discount:</span> -฿{discount.discount_amount.toFixed(2)}</p>
                                        <p className="font-bold text-lg text-green-600"><span className="font-medium">After Discount:</span> ฿{discount.final_price.toFixed(2)}</p>
                                    </div>
                                )}
                                {/* <p><span className="font-medium">Capacity:</span> {room.capacity}</p> */}
                            </div>

                            {/* Booking Form */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input name="customerName" value={formData.customerName} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                </div>
                                {/* <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input name="customerEmail" value={formData.customerEmail} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                </div> */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                                    <input name="customerPhone" value={formData.customerPhone} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Price (Leave blank to use original: ฿{calculatedPrice.toFixed(2)})
                                        {appliedPromoCode && <span className="text-green-600 text-xs ml-2">(Promo will auto-update)</span>}
                                    </label>
                                    <input
                                        type="number"
                                        value={customPrice !== null ? customPrice : ""}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setCustomPrice(value === "" ? null : parseFloat(value));
                                        }}
                                        min="0"
                                        step="0.01"
                                        placeholder={calculatedPrice.toFixed(2)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>

                            {/* Promo Code Section */}
                            <PromoInput
                                cartTotal={priceBeforeDiscount}
                                roomId={room.room_id}
                                bookingDate={timeSlot.date}
                                bookingTime={startTime}
                                bookingEndTime={endTime}
                                externalDiscount={discount}
                                onPromoApplied={(finalPrice, discountAmount, promoCode, promotionId) => {
                                    if (promoCode === "") {
                                        // Promo was cleared
                                        setDiscount(null)
                                        setAppliedPromoCode(null)
                                        setAppliedPromotionId(null)
                                    } else {
                                        setDiscount({
                                            original_price: priceBeforeDiscount,
                                            discount_amount: discountAmount,
                                            final_price: finalPrice
                                        })
                                        setAppliedPromoCode(promoCode)
                                        setAppliedPromotionId(promotionId || null)
                                    }
                                }}
                            />

                            {error && <p className="text-red-600 mt-3">{error}</p>}

                            <div className="flex gap-3 mt-4">
                                <button onClick={onClose} className="flex-1 bg-gray-200 rounded p-2">Cancel</button>
                                <button
                                    onClick={createAndConfirmBooking}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-purple-600 text-white rounded p-2 hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? <LoadingSpinner size="sm" /> : "Book (No Payment)"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            {showConfirmCancel && (
                <AlertModal
                    isOpen={showConfirmCancel}
                    message="Are you sure you want to cancel this booking?"
                    onClose={() => setShowConfirmCancel(false)}
                    actions={[
                        { label: "Yes", onClick: confirmCancelBooking, variant: "error", textcolor:"#FFFFFF" },
                        { label: "No", onClick: () => setShowConfirmCancel(false), variant: "roomavailable" }
                    ]}
                />
            )}
        </div>
    )
}

"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { siteConfig } from "../config/site-config"
import type { TimeSlot, Room, ScheduleData, BookingRequest } from "../types"
import { calculatePrice, formatDuration, isTimeSlotAvailable } from "../lib/time-utils"
import { LoadingSpinner } from "../components/ui/loading-spinner"
import { time } from "console"

interface AdminBookingModalProps {
    isOpen: boolean
    onClose: () => void
    timeSlot: TimeSlot
    room: Room
    scheduleData: ScheduleData
    adminCredential: string | null
}
interface User {
    username: string
    email: string
    phone: string
}

export function AdminBookingModal({ isOpen, onClose, timeSlot, room, scheduleData, adminCredential}: AdminBookingModalProps) {
    const [startTime, setStartTime] = useState(timeSlot.startTime)
    const [endTime, setEndTime] = useState("")
    const [formData, setFormData] = useState({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        specialRequests: "",
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [User, setUser] = useState<User | null>(null);


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
    useEffect(() => {
        if (timeSlot.status === "booked" && timeSlot.customerID) {
            (async () => {
                try {
                    const userraw = await fetch("/api/user", {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "userId": timeSlot.customerID,
                            "credential" : adminCredential? adminCredential: ""
                        }
                    });

                    const userdata = await userraw.json();
                    setUser({
                        username: userdata.data.username,
                        email: userdata.data.email,
                        phone: userdata.data.phone,
                    });
                    //console.log("userdata: ", userdata)
                } catch (err) {
                    console.error("Failed to fetch user:", err);
                }
            })();
        } else {
            setUser(null); // reset when timeslot changes
        }
    }, [timeSlot.status, timeSlot.customerID]);

    //console.log("User: ", User)

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

    const totalDuration = startTime && endTime
        ? (() => {
            let endTimeDate = endTime < "06:00" ? new Date(`2000-01-02T${endTime}`) : new Date(`2000-01-01T${endTime}`)
            let startTimeDate = startTime < "06:00" ? new Date(`2000-01-02T${startTime}`) : new Date(`2000-01-01T${startTime}`)
            return (endTimeDate.getTime() - startTimeDate.getTime()) / (1000 * 60)
        })()
        : 0

    const totalPrice = calculatePrice(room.price_per_half_hour, totalDuration)

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
                date: timeSlot.date,
                timeSlots: [startTime, endTime],
                totalPrice,
                duration: totalDuration,
                ...formData,
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
                headers: { "Content-Type": "application/json", "credential": adminCredential? adminCredential:""},
                body: JSON.stringify({
                    booking_id: createResult.data.booking_id,
                    booking_status: "booked"
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

    const handleCancelBooking = async () => {
        if (!timeSlot.id) return
        setIsSubmitting(true)
        setError("")
        try {
            const res = await fetch("/api/bookings", {
                method: "PUT",
                headers: { "Content-Type": "application/json", "credential": adminCredential? adminCredential:""},
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
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold">
                        {timeSlot.status === "booked" ? "Booking Details" : "Admin Booking"}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    {timeSlot.status === "booked" ? (
                        User == null ? (
                            <p>Loading customer data...</p> // or <LoadingSpinner size="md" />
                        ) : (
                            <>
                                <p><strong>Customer:</strong> {User.username}</p>
                                <p><strong>Phone:</strong> {User.phone}</p>
                                <p><strong>Time:</strong> {timeSlot.startTime} - {timeSlot.endTime}</p>
                                <div className="mt-4 flex gap-3">
                                    <button
                                        onClick={handleCancelBooking}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? <LoadingSpinner size="sm" /> : "Cancel Booking"}
                                    </button>
                                </div>
                                {error && <p className="text-red-600 mt-3">{error}</p>}
                            </>
                        )
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
                                <p><span className="font-medium">Total Price:</span> ฿{totalPrice.toFixed(2)}</p>
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
                            </div>

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
        </div>
    )
}

"use client"

import { useState } from "react"
import { siteConfig } from "../config/site-config"
import type { ScheduleData, TimeSlot } from "../types"
import { LoadingSpinner } from "../components/ui/loading-spinner"
import { BookingModal } from "../components/booking-modal"
import { AdminBookingModal } from "../components/admin-booking-modal"
import { AlertModal } from "./AlertModal"
import { isTimeSlotPast } from "../lib/time-utils"
import { getAdminUser } from "../lib/admin-service"
import { getStoredPendingBooking } from "../lib/pending-booking"
import type { Room } from "../types"

// Ascending by display_order; rooms with no order set sort after ordered ones,
// falling back to alphabetical by name so ties (or all-unset) stay stable.
function compareRoomOrder(a: Room, b: Room): number {
  const aOrder = a.display_order ?? null
  const bOrder = b.display_order ?? null
  if (aOrder !== null && bOrder !== null && aOrder !== bOrder) return aOrder - bOrder
  if (aOrder !== null && bOrder === null) return -1
  if (aOrder === null && bOrder !== null) return 1
  return a.room_name.localeCompare(b.room_name)
}

// Corrected interface for the ScheduleTable props
interface ScheduleTableProps {
  scheduleData: ScheduleData
  isLoading?: boolean
  adminCredential: string | null // Added adminCredential prop
  handleRefresh: () => void
}





function SlotCell({
  slot,
  onClick,
  adminCredential,
  scheduleDate,
  roomActive,
}: {
  slot: TimeSlot
  onClick: (slot: TimeSlot) => void
  adminCredential: string | null// Added adminCredential to SlotCell props
  scheduleDate: string
  roomActive: boolean
}) {
  //console.log("Slot:",slot)
  const [isHover, setIsHover] = useState(false)
  const currentUser = getAdminUser()
  const isModulator = currentUser?.role === "modulator"

  // Inactive rooms are shown but can't be booked by customers
  const isDisabledForBooking = !roomActive && !adminCredential

  // The customer's own unfinished booking (created in this browser, still pending)
  // stays clickable so they can resume the payment flow.
  const isOwnPendingBooking =
    !adminCredential && slot.status === "pending" && getStoredPendingBooking()?.bookingId === slot.id

  function getSlotStyles(slot: TimeSlot): string {
    const status = slot.status
    const isPast = isTimeSlotPast(slot.startTime, scheduleDate)
    const baseStyles = "p-1 sm:p-2 text-center text-[11px] sm:text-sm border rounded cursor-pointer transition-colors duration-200"

    if (isDisabledForBooking) {
      return `${baseStyles} ${siteConfig.theme.maintext} border-gray-200 cursor-not-allowed`
    }

    // If time slot has passed, make it non-clickable for non-admin users
    if (isPast && !adminCredential) {
      return `${baseStyles} ${siteConfig.theme.maintext} cursor-not-allowed`
    }

    switch (status) {
      case "booked":
        // For admin, booked slots are clickable to see details
        if (adminCredential) {
          return `${baseStyles} ${siteConfig.theme.maintext} border-red-200 cursor-pointer`
        }
        return `${baseStyles} ${siteConfig.theme.maintext} border-red-200 cursor-not-allowed`
      case "closed":
        return `${baseStyles} ${siteConfig.theme.maintext} border-gray-200 cursor-not-allowed`
      case "cancelled":
        return `${baseStyles} ${siteConfig.theme.maintext} border-green-200`
      case "available":
        return `${baseStyles} ${siteConfig.theme.maintext} border-green-200`
      case "pending":
        // Admin can click pending to manage it; a customer can click only their
        // own pending booking (to resume payment)
        if (adminCredential || isOwnPendingBooking) {
          return `${baseStyles} ${siteConfig.theme.maintext} border-yellow-200 cursor-pointer`
        }
        return `${baseStyles} ${siteConfig.theme.maintext} border-yellow-200 cursor-not-allowed`
      default:
        return baseStyles
    }
  }

  // Function to get slot background color
  function getSlotColor(slot: TimeSlot, isHover: boolean): string {
    const status = slot.status
    const isPast = isTimeSlotPast(slot.startTime, scheduleDate)

    if (isDisabledForBooking) {
      return siteConfig.theme.roomclosed
    }

    // If time slot has passed and user is not admin, show grayed out
    if (isPast && !adminCredential) {
      return siteConfig.theme.roomclosed
    }

    switch (status) {
      case "booked":
        return siteConfig.theme.roombooked
      case "cancelled":
        return isHover
          ? siteConfig.theme.roomavailableHover
          : siteConfig.theme.roomavailable
      case "closed":
        return siteConfig.theme.roomclosed
      case "pending":
        return siteConfig.theme.roompending
      case "available":
        return isHover
          ? siteConfig.theme.roomavailableHover
          : siteConfig.theme.roomavailable
      default:
        return siteConfig.theme.roomclosed
    }
  }

  return (
    <td
      className="px-0.5 sm:px-4 py-1 sm:py-3 text-center"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <div
        className={`${getSlotStyles(slot)} flex items-center justify-center w-full h-full min-h-[2.75rem] sm:min-h-[3.25rem]`}
        style={{ background: getSlotColor(slot, isHover) }}
        // Added adminCredential check for clickability of booked and pending slots
        onClick={() => {
          // Inactive rooms can't be booked by customers
          if (isDisabledForBooking) {
            return
          }

          const isPast = isTimeSlotPast(slot.startTime, scheduleDate)

          // Prevent clicking on past slots for non-admin users
          if (isPast && !adminCredential) {
            return
          }

          // Admin: can click any slot, including pending (to view/cancel it)
          if (adminCredential) {
            onClick(slot)
          } else {
            // Regular users: available/cancelled slots, plus their own pending
            // booking to resume the payment flow
            if (slot.status === "available" || slot.status === "cancelled" || isOwnPendingBooking) {
              onClick(slot)
            }
          }
        }}
      >
        {/* Check if slot is greyed out (unavailable) */}
        {(() => {
          if (isDisabledForBooking) {
            return <div className="font-medium truncate w-full">Closed</div>
          }

          const isPast = isTimeSlotPast(slot.startTime, scheduleDate)
          const isUnavailable = (isPast || slot.status === "closed" ) && !adminCredential &&  slot.status !== "booked"

          if (isUnavailable) {
            return <div className="font-medium truncate w-full">Unavailable</div>
          }

          if (slot.status === "booked") {
            return (
              <div className="w-full">
                {/* Conditional rendering: show customer name if they are non-empty, otherwise show "Booked" */}

                <div className="font-medium truncate w-full">{ slot.customerName != null ? slot.customerName : "Anonymous" }</div>
                {(slot.bookingStart || slot.bookingEnd) && (
                  <div className="text-[9px] sm:text-xs truncate w-full opacity-80">
                    {slot.bookingStart?.slice(0, 5)} - {slot.bookingEnd?.slice(0, 5)}
                  </div>
                )}
              </div>
            )
          }

          if (slot.status === "available" || slot.status === "cancelled") {
            return (
              <div className="w-full">
                <div className="font-medium cursor-pointer truncate w-full">Available</div>
                {/* <div className="text-xs">${slot.price}</div> */}
              </div>
            )
          }

          if (slot.status === "pending") {
            return (
              <div className="w-full">
                <div className="font-medium truncate w-full">
                  {slot.customerName != null ? slot.customerName : "Anonymous"}
                </div>
                <div className="text-[9px] sm:text-xs truncate w-full opacity-80">
                  {isOwnPendingBooking ? "Tap to continue" : "Pending"}
                </div>
              </div>
            )
          }

          return <div className="font-medium truncate w-full">Closed</div>
        })()}
      </div>
    </td>
  )
}

export function ScheduleTable({ scheduleData, isLoading, adminCredential, handleRefresh }: ScheduleTableProps) {
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const currentUser = getAdminUser()
  const isModulator = currentUser?.role === "modulator"

  const handleSlotClick = (slot: TimeSlot) => {
    //console.log("Slot data:",slot)
    // Only check when user is not admin and slot is available
    if (!adminCredential && slot.status === "available") {
      const slotIndex = scheduleData.timeSlots.indexOf(slot.startTime)

      // Each slot = 30 min, so need at least 2 consecutive slots
      const nextSlotTime = scheduleData.timeSlots[slotIndex + 1]

      const nextSlot = scheduleData.bookings.find(
        (b) => b.roomId === slot.roomId && b.startTime === nextSlotTime
      )

      // If next slot doesn't exist or is not available → less than 1 hr
      if (!nextSlot || nextSlot.status !== "available") {
        setAlertMessage("Can't book less than 1 hour");
        return
      }
    }

    setSelectedSlot(slot)
    setIsModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">
          {"Loading schedule..."}
        </span>
      </div>
    )
  }

  //create format date to display in header
  function formatBookingDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }
    return date.toLocaleDateString('en-UK', options)
  }

  return (
    <>
      <div className="p-3 sticky top-0 z-50"
        style={{
          background: `linear-gradient(to right, ${siteConfig.theme.secondary}, ${siteConfig.theme.primary})`,
        }}
      >
        <h2 className="text-lg font-bold text-white">
          Schedule for {formatBookingDate(new Date(scheduleData.date))}
        </h2>
      </div>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">


        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full table-fixed">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                <th className="w-10 sm:w-10 px-1 sm:px-2 py-1.5 sm:py-3 text-left text-[10px] sm:text-xs font-medium uppercase tracking-wider" style={{ color: siteConfig.theme.maintext }}>
                  Time
                </th>
                {scheduleData.rooms
                  // .filter((room) => room.is_active)
                  .sort(compareRoomOrder).map((room) => (
                  <th
                    key={room.room_id}
                    className="px-1 sm:px-4 py-1.5 sm:py-3 text-center text-[10px] sm:text-xs font-medium uppercase tracking-wider"
                    style={{ color: siteConfig.theme.maintext }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-semibold truncate w-full">{room.room_name}</span>
                      {!room.is_active && (
                        <span className="text-[10px] font-normal normal-case" style={{ color: siteConfig.theme.error }}>
                          Closed
                        </span>
                      )}
                      {/* <span className="text-xs text-gray-400">{room.capacity}</span> */}
                      {/* <span className="text-xs font-bold text-purple-600">
                        ฿{room.price_per_half_hour * 2}/hr
                      </span> */}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y" style={{ borderColor: '#e5e7eb' }}>
              {scheduleData.timeSlots.slice(0, -1).map((timeSlot) => (
                <tr key={timeSlot} className="hover:bg-gray-50">
                  <td className="w-10 sm:w-10 px-1 sm:px-2 py-1 sm:py-3 whitespace-nowrap text-[11px] sm:text-sm font-medium" style={{ color: siteConfig.theme.maintext }}>
                    {timeSlot}
                  </td>
                  {scheduleData.rooms
                    // .filter((room) => room.is_active)
                    .sort(compareRoomOrder).map((room) => {
                      const slot = scheduleData.bookings.find((booking) => {
                      return (
                        booking.roomId === room.room_id &&
                        booking.startTime === timeSlot
                      )
                    })

                    if (!slot) {
                      return (
                        <td
                          key={`${room.room_id}-${timeSlot}`}
                          className="px-1 sm:px-4 py-1.5 sm:py-3 text-center"
                        >
                          <div
                            className="p-1 sm:p-2 text-[11px] sm:text-sm text-gray-400 flex items-center justify-center w-full h-full min-h-[2.75rem] sm:min-h-[3.25rem]"
                            style={{ color: siteConfig.theme.error }}
                          >
                            N/A
                          </div>
                        </td>
                      )
                    }

                    return (
                      <SlotCell
                        key={`${room.room_id}-${timeSlot}`}
                        slot={slot}
                        onClick={handleSlotClick}
                        adminCredential={adminCredential} // Pass the adminCredential prop down
                        scheduleDate={scheduleData.date}
                        roomActive={room.is_active}
                      />
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center">
              <div
                className="w-4 h-4 border border-green-200 rounded mr-2"
                style={{ background: siteConfig.theme.roomavailable }}
              ></div>
              <span>Available</span>
            </div>
            <div className="flex items-center">
              <div
                className="w-4 h-4 bg-red-100 border border-red-200 rounded mr-2"
                style={{ background: siteConfig.theme.roombooked }}
              ></div>
              <span>Booked</span>
            </div>
            <div className="flex items-center">
              <div
                className="w-4 h-4 bg-gray-100 border border-gray-200 rounded mr-2"
                style={{ background: siteConfig.theme.roompending }}
              ></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center">
              <div
                className="w-4 h-4 bg-gray-100 border border-gray-200 rounded mr-2"
                style={{ background: siteConfig.theme.roomclosed }}
              ></div>
              <span>Closed</span>
            </div>
          </div>
        </div>
      </div>

      {selectedSlot && (
        adminCredential ? (
          <AdminBookingModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false)
              setSelectedSlot(null)
              handleRefresh()
            }}
            timeSlot={selectedSlot}
            room={scheduleData.rooms.find((r) => r.room_id === selectedSlot.roomId)!}
            scheduleData={scheduleData}
            adminCredential={adminCredential}
          />
        ) : (
          <BookingModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false)
              setSelectedSlot(null)
              handleRefresh()
            }}
            timeSlot={selectedSlot}
            room={scheduleData.rooms.find((r) => r.room_id === selectedSlot.roomId)!}
            scheduleData={scheduleData}
          />
        )
      )}
      {alertMessage && (
        <AlertModal
          isOpen={!!alertMessage}
          message={alertMessage}
          onClose={() => setAlertMessage(null)}
        />
      )}
    </>
  )
}

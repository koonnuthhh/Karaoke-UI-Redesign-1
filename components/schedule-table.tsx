"use client"

import { useState } from "react"
import { siteConfig } from "../config/site-config"
import type { ScheduleData, TimeSlot } from "../types"
import { LoadingSpinner } from "../components/ui/loading-spinner"
import { BookingModal } from "../components/booking-modal"
import { AdminBookingModal } from "../components/admin-booking-modal"

// Corrected interface for the ScheduleTable props
interface ScheduleTableProps {
  scheduleData: ScheduleData
  isLoading?: boolean
  isAdmin?: boolean // Added isAdmin prop
  handleRefresh: () => void
}




// SlotCell component now accepts the isAdmin prop
function SlotCell({
  slot,
  onClick,
  isAdmin
}: {
  slot: TimeSlot
  onClick: (slot: TimeSlot) => void
  isAdmin: boolean // Added isAdmin to SlotCell props
}) {
  const [isHover, setIsHover] = useState(false)
  // if(slot.status === "booked"){
  //   console.log("booked slot: ",slot)
  // }
  // Function to get styles for the slot
  function getSlotStyles(slot: TimeSlot): string {
    const status = slot.status
    const baseStyles =
      "p-2 text-center text-sm border rounded cursor-pointer transition-colors duration-200 select-none"

    switch (status) {
      case "booked":
        // For admin, booked slots are clickable to see details
        if (isAdmin) {
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
        // Admin can click pending to manage it, regular users can't
        if (isAdmin) {
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
      className="px-4 py-3 text-center"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <div
        className={getSlotStyles(slot)}
        style={{ background: getSlotColor(slot, isHover) }}
        // Added isAdmin check for clickability of booked and pending slots
        onClick={() => {
          if (isAdmin) {
            (slot.status != "pending") && onClick(slot)
          } else {
            (slot.status === "available" || slot.status === "cancelled") && onClick(slot)
          }
        }}
      >
        {slot.status === "booked" ? (
          <div>
            {/* Conditional rendering: show customer name if admin, otherwise show "Booked" */}
            <div className="font-medium">{isAdmin && slot.customerName ? slot.customerName : "Booked"}</div>
            {isAdmin && slot.customerName && (
              <div className="text-xs text-red-700">Booked</div>
            )}
          </div>
        ) : slot.status === "available" ? (
          <div>
            <div className="font-medium cursor-pointer">Available</div>
            {/* <div className="text-xs">${slot.price}</div> */}
          </div>
        ) : slot.status === "cancelled" ? (
          <div>
            <div className="font-medium cursor-pointer">Available</div>
            {/* <div className="text-xs">${slot.price}</div> */}
          </div>
        ) : slot.status === "pending" ? (
          <div>
            <div className="font-medium">Pending</div>
          </div>
        ) : (
          <div className="font-medium">Closed</div>
        )}
      </div>
    </td>
  )
}

export function ScheduleTable({ scheduleData, isLoading, isAdmin = false, handleRefresh }: ScheduleTableProps) {
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSlotClick = (slot: TimeSlot) => {
    setSelectedSlot(slot)
    setIsModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">
          {siteConfig.content.schedule.loading}
        </span>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div
          className="px-6 py-4"
          style={{
            background: `linear-gradient(to right, ${siteConfig.theme.primary}, ${siteConfig.theme.secondary})`,
          }}
        >
          <h2 className="text-xl font-bold text-white">
            {siteConfig.content.schedule.tableTitle}
          </h2>
          <p className="text-purple-100 text-sm mt-1">
            Schedule for {new Date(scheduleData.date).toLocaleDateString()}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start time
                </th>
                {scheduleData.rooms.map((room) => (
                  <th
                    key={room.room_id}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-semibold">{room.room_name}</span>
                      <span className="text-xs text-gray-400">{room.capacity}</span>
                      <span className="text-xs font-bold text-purple-600">
                        ฿{room.price_per_half_hour * 2}/hr
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scheduleData.timeSlots.slice(0, -1).map((timeSlot) => (
                <tr key={timeSlot} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {timeSlot}
                  </td>
                  {scheduleData.rooms.map((room) => {
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
                          className="px-4 py-3 text-center"
                        >
                          <div
                            className="p-2 text-sm text-gray-400"
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
                        isAdmin={isAdmin} // Pass the isAdmin prop down
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
        isAdmin ? (
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
            isAdmin={false}
          />
        )
      )}
    </>
  )
}

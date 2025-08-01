"use client"

import { useState } from "react"
import { siteConfig } from "../config/site-config"
import type { ScheduleData, TimeSlot } from "../types"
import { LoadingSpinner } from "../components/ui/loading-spinner"
import { BookingModal } from "../components/booking-modal"
import { ca } from "date-fns/locale"

interface ScheduleTableProps {
  scheduleData: ScheduleData
  isLoading?: boolean 
}

function getSlotStatus(slot: TimeSlot): "booked" | "Closed" | "available" | "Pending" {
  if (slot.isBooked) return "booked"
  if(!slot.isBooked && !slot.isAvailable) return "Pending"
  if (!slot.isAvailable) return "Closed"
  return "available"
}

function getSlotStyles(slot: TimeSlot): string {
  const status = getSlotStatus(slot)
  const baseStyles =
    "p-2 text-center text-sm border rounded cursor-pointer transition-colors duration-200 select-none"

  switch (status) {
    case "booked":
      return `${baseStyles} ${siteConfig.theme.maintext} border-red-200 cursor-not-allowed`
    case "Closed":
      return `${baseStyles} ${siteConfig.theme.maintext} border-gray-200 cursor-not-allowed`
    case "available":
      return `${baseStyles} ${siteConfig.theme.maintext} border-green-200`
    case "Pending":
      return `${baseStyles} ${siteConfig.theme.maintext} border-yellow-200 cursor-not-allowed`
    default:
      return baseStyles
  }
}

function getSlotColor(slot: TimeSlot, isHover: boolean): string {
  const status = getSlotStatus(slot)

  switch (status) {
    case "booked":
      return siteConfig.theme.roombooked
    case "Closed":
      return siteConfig.theme.roomclosed
    case "Pending":
      return siteConfig.theme.roompending
    case "available":
      return isHover
        ? siteConfig.theme.roomavailableHover
        : siteConfig.theme.roomavailable
    default:
      return siteConfig.theme.error
  }
}

function SlotCell({
  slot,
  onClick,
}: {
  slot: TimeSlot
  onClick: (slot: TimeSlot) => void
}) {
  const [isHover, setIsHover] = useState(false)

  return (
    <td
      className="px-4 py-3 text-center"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <div
        className={getSlotStyles(slot)}
        style={{ background: getSlotColor(slot, isHover) }}
        onClick={() => slot.isAvailable && !slot.isBooked && onClick(slot)}
      >
        {slot.isBooked ? (
          <div>
            <div className="font-medium">Booked</div>
            {/* {slot.customerName && (
              <div className="text-xs">{slot.customerName}</div>
            )} */}
          </div>
        ) : slot.isAvailable ? (
          <div>
            <div className="font-medium cursor-pointer">Available</div>
            {/* <div className="text-xs">${slot.price}</div> */}
          </div>
        ) : !slot.isBooked && !slot.isAvailable ? (
          <div>
            <div className="font-medium">Pending</div>
          </div>
        ):(
          <div className="font-medium">Closed</div>
        )}
      </div>
    </td>
  )
}

export function ScheduleTable({ scheduleData, isLoading }: ScheduleTableProps) {
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
                    key={room.id}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-semibold">{room.name}</span>
                      <span className="text-xs text-gray-400">{room.capacity}</span>
                      <span className="text-xs font-bold text-purple-600">
                      ฿{room.hourlyRate}/hr
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
                    const slot = scheduleData.bookings.find(
                      (booking) =>
                        booking.roomId === room.id &&
                        booking.startTime === timeSlot,
                    )

                    if (!slot) {
                      return (
                        <td
                          key={`${room.id}-${timeSlot}`}
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
                        key={`${room.id}-${timeSlot}`}
                        slot={slot}
                        onClick={handleSlotClick}
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
        <BookingModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedSlot(null)
          }}
          timeSlot={selectedSlot}
          room={scheduleData.rooms.find((r) => r.id === selectedSlot.roomId)!}
          scheduleData={scheduleData}
        />
      )}
    </>
  )
}

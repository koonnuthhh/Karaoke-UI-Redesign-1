import { Room, TimeSlot } from "types"
import { siteConfig } from "@/config/site-config"


export function generateTimeSlots(startTime: string, endTime: string, slotDuration = 30): string[] {
  const slots: string[] = []
  const start = new Date(`2000-01-01T${startTime}:00`)
  const end = new Date(`2000-01-01T${endTime}:00`)

  // Handle overnight hours (e.g., until 03:00 next day)
  if (end < start) {
    end.setDate(end.getDate() + 1)
  }

  const current = new Date(start)

  while (current <= end) {
    const timeString = current.toTimeString().slice(0, 5)
    slots.push(timeString)
    current.setMinutes(current.getMinutes() + slotDuration)
  }

  return slots
}

export function calculatePrice(baseRate: number, duration: number, isPeakTime = false): number {
  let hours = duration / 60
  const decrementPerHour = 10
  const basePrice = baseRate * 2
  let hourlyRate = basePrice
  let total = 0;
  if ((hours * 2) % 2 != 0) {
    total += basePrice/2
    hours = hours-0.5
    if (hours <= 1) {
      //return hourlyRate
    } else if (hours <= 2) {
      hourlyRate = basePrice - (decrementPerHour * 1)
    } else if (hours <= 3) {
      hourlyRate = basePrice - (decrementPerHour * 2)
    } else {
      hourlyRate = basePrice - (decrementPerHour * 3)
    }
  } else {

    //console.log("hour: ",hours)
    if (hours <= 1) {
    } else if (hours <= 2) {
      hourlyRate = basePrice - (decrementPerHour * 1)
    } else if (hours <= 3) {
      hourlyRate = basePrice - (decrementPerHour * 2)
    } else {
      hourlyRate = basePrice - (decrementPerHour * 3)
    }
  }

  total = total + hourlyRate * hours
  //console.log("total: ",total)

  return isPeakTime ? total * 1.5 : total
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) {
    return `${mins} min`
  } else if (mins === 0) {
    return `${hours} hr${hours > 1 ? "s" : ""}`
  } else {
    return `${hours} hr${hours > 1 ? "s" : ""} ${mins} min`
  }
}

// A blackout ("closed") is only a soft block: admins are allowed to book straight
// through one, so admin flows pass { ignoreClosed: true } to drop it from the check.
// Real bookings stay a hard block for everyone.
export interface AvailabilityOptions {
  ignoreClosed?: boolean
}

export function isTimeSlotAvailable(
  timeSlot: string,
  roomId: string,
  bookings: TimeSlot[],
  options: AvailabilityOptions = {},
): boolean {
  return !bookings.some(
    (booking) =>
      booking.roomId === roomId &&
      booking.startTime === timeSlot &&
      (booking.status === "booked" || (booking.status === "closed" && !options.ignoreClosed)),
  )
}

// Minutes since the start of the business day for an "HH:MM" (or "HH:MM:SS") time.
// Times before 06:00 belong to the following calendar day, so overnight hours
// (open 12:00, close 01:00) stay correctly ordered — same rule the schedule route
// and the booking modals use.
export function toBusinessMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  const total = hours * 60 + minutes
  return hours < 6 ? total + 1440 : total
}

// A room's blackout: a date range plus an optional DAILY recurring time window during
// which the room is unavailable. Missing times mean the whole day. Same rule as
// app/api/schedule/route.ts, but expressed in business minutes so a caller can test an
// arbitrary window rather than one slot. The schedule route keeps its own copy on
// purpose - it normalises times against closeTime instead of the 06:00 rule here.
export function isRoomBlackedOut(
  room: Pick<Room, "blackout_start_date" | "blackout_end_date" | "blackout_start_time" | "blackout_end_time">,
  date: string,
  startMinutes: number,
  endMinutes: number,
): boolean {
  const { blackout_start_date, blackout_end_date, blackout_start_time, blackout_end_time } = room

  if (!blackout_start_date || !blackout_end_date) return false
  if (date < blackout_start_date || date > blackout_end_date) return false
  if (!blackout_start_time || !blackout_end_time) return true // Whole day

  const start = toBusinessMinutes(blackout_start_time.slice(0, 5))
  let end = toBusinessMinutes(blackout_end_time.slice(0, 5))
  if (end <= start) end += 1440 // Overnight blackout window

  return startMinutes < end && endMinutes > start
}

// The blackout window overlapping [startTime, endTime) in `room` on `date`, as an
// "HH:MM - HH:MM" pair, or undefined when the window is clear. Used to tell an admin
// exactly which closed period they are booking over.
export function findBlackoutOverlap(
  room: Pick<Room, "blackout_start_date" | "blackout_end_date" | "blackout_start_time" | "blackout_end_time">,
  date: string,
  startTime: string,
  endTime: string,
): { startTime: string; endTime: string } | undefined {
  if (!startTime || !endTime) return undefined

  const start = toBusinessMinutes(startTime)
  let end = toBusinessMinutes(endTime)
  if (end <= start) end += 1440

  if (!isRoomBlackedOut(room, date, start, end)) return undefined

  return {
    startTime: room.blackout_start_time?.slice(0, 5) || siteConfig.schedule.openTime,
    endTime: room.blackout_end_time?.slice(0, 5) || siteConfig.schedule.closeTime,
  }
}

// A block of time a room is already taken for: a booking, or a blackout window.
export interface BookedRange {
  id?: string
  roomId: string
  startTime: string
  endTime: string
  status?: string
  customerName?: string | null
}

// The first range in `ranges` that overlaps [startTime, endTime) in the same room —
// i.e. why the requested window can't be booked. Cancelled ranges and
// `excludeBookingId` (the booking being edited, so it doesn't collide with its own
// current slot) are skipped. `ranges` must all be for the same date as the window.
export function findOverlappingBooking<T extends BookedRange>(
  ranges: T[],
  roomId: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string,
): T | undefined {
  if (!startTime || !endTime) return undefined

  const start = toBusinessMinutes(startTime)
  let end = toBusinessMinutes(endTime)
  if (end <= start) end += 1440 // Window runs past midnight

  return ranges.find((range) => {
    if (range.roomId !== roomId) return false
    if (excludeBookingId && range.id === excludeBookingId) return false
    if (range.status?.toLowerCase() === "cancelled") return false
    if (!range.startTime || !range.endTime) return false

    const rangeStart = toBusinessMinutes(range.startTime)
    let rangeEnd = toBusinessMinutes(range.endTime)
    if (rangeEnd <= rangeStart) rangeEnd += 1440

    return rangeStart < end && rangeEnd > start
  })
}

// How many minutes are actually free in `roomId` from `startTime` — until the next
// occupied range or `closeTime`, whichever comes first. Returns 0 when `startTime`
// itself already falls inside an occupied range. Used to tell an admin how much really
// fits, instead of silently shrinking a booking down to match.
export function freeMinutesFrom(
  ranges: BookedRange[],
  roomId: string,
  startTime: string,
  closeTime: string,
  excludeBookingId?: string,
): number {
  if (!startTime) return 0

  const start = toBusinessMinutes(startTime)
  let limit = toBusinessMinutes(closeTime)
  if (limit <= start) limit += 1440

  for (const range of ranges) {
    if (range.roomId !== roomId) continue
    if (excludeBookingId && range.id === excludeBookingId) continue
    if (range.status?.toLowerCase() === "cancelled") continue
    if (!range.startTime || !range.endTime) continue

    const rangeStart = toBusinessMinutes(range.startTime)
    let rangeEnd = toBusinessMinutes(range.endTime)
    if (rangeEnd <= rangeStart) rangeEnd += 1440

    if (rangeStart <= start && rangeEnd > start) return 0 // Start is inside this range
    if (rangeStart > start) limit = Math.min(limit, rangeStart)
  }

  return Math.max(0, limit - start)
}

export function getConsecutiveSlots(selectedSlots: string[], allSlots: string[]): boolean {
  if (selectedSlots.length <= 1) return true

  const sortedSelected = selectedSlots.sort()

  for (let i = 0; i < sortedSelected.length - 1; i++) {
    const currentIndex = allSlots.indexOf(sortedSelected[i])
    const nextIndex = allSlots.indexOf(sortedSelected[i + 1])

    if (nextIndex !== currentIndex + 1) {
      return false
    }
  }

  return true
}

// A customer booking must cover at least this long. Admin bookings use their own,
// smaller minimum (see MIN_DURATION_MINUTES in the admin modals).
export const CUSTOMER_MIN_DURATION_MINUTES = 60

export function isTimeSlotPast(timeSlot: string, scheduleDate: string): boolean {
  const now = new Date()
  // Grace period: a slot stays bookable until 10 minutes after its start time
  // (e.g. at 17:05 the 17:00 slot is still clickable, but not after 17:10).
  const pastThresholdMinutes = 10
  
  // Parse the schedule date and ensure we're working in local time
  const [year, month, day] = scheduleDate.split('-').map(Number)
  
  // Parse time slot (e.g., "14:30")
  const [hours, minutes] = timeSlot.split(':').map(Number)
  
  // Validate parsed values
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
    console.error('Invalid date or time format:', { scheduleDate, timeSlot })
    return false
  }
  
  // Create slot date in local time (month is 0-indexed in Date constructor)
  let slotDate = new Date(year, month - 1, day, hours, minutes, 0, 0)
  
  // Handle overnight schedule: if the time slot is in early morning hours (00:00 to 06:00),
  // it likely refers to the next day
  if (hours >= 0 && hours < 6) {
    slotDate.setDate(slotDate.getDate() + 1)
  }

  slotDate.setMinutes(slotDate.getMinutes() + pastThresholdMinutes)
  
  // Compare with current time
  return slotDate < now
}

// "HH:MM" shifted by `minutes`, wrapping around midnight.
function shiftTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number)
  const total = (((hours * 60 + mins + minutes) % 1440) + 1440) % 1440
  const hh = Math.floor(total / 60).toString().padStart(2, "0")
  const mm = (total % 60).toString().padStart(2, "0")
  return `${hh}:${mm}`
}

// The time a booking starting at `startTime` must end by. Single source of truth for
// the closing rule — every duration cap in the app goes through here.
//
//   admin    -> adminCloseTime, in every case
//   customer -> closeTime, except the final lateNightStartSlot cell once the slot
//               before it has expired, which may run to lateNightCloseTime
//
// The exception exists because lateNightStartSlot (00:30) is only half an hour from
// closeTime, i.e. below the customer minimum, so without it the slot would never be
// bookable. It opens the moment the preceding 00:00 slot passes its grace period —
// from then on 00:30 is the earliest cell still open and a walk-in has nothing else to
// take. Booked in advance (00:00 still live, or a future date) it stays at closeTime.
export function getEffectiveCloseTime(
  startTime: string,
  scheduleDate: string,
  options: { isAdmin?: boolean } = {},
): string {
  const { closeTime, adminCloseTime, slotDuration, lateNightStartSlot, lateNightCloseTime } =
    siteConfig.schedule

  if (options.isAdmin) return adminCloseTime

  if (
    startTime === lateNightStartSlot &&
    isTimeSlotPast(shiftTime(lateNightStartSlot, -slotDuration), scheduleDate)
  ) {
    return lateNightCloseTime
  }

  return closeTime
}

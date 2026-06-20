import { TimeSlot } from "types"

function parseTimeToDate(time: string): Date {
  return time < "06:00"
    ? new Date(`2000-01-02T${time}`)
    : new Date(`2000-01-01T${time}`)
}

export function addMinutesToTime(time: string, minutes: number): string {
  const date = parseTimeToDate(time)
  date.setMinutes(date.getMinutes() + minutes)
  return date.toTimeString().slice(0, 5)
}

export function getMinutesBetween(startTime: string, endTime: string): number {
  const startDate = parseTimeToDate(startTime)
  const endDate = parseTimeToDate(endTime)

  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1)
  }

  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
}

export function getAvailableDurations(
  startTime: string,
  availableEndTimes: string[],
  minimumDuration = 60,
  stepMinutes = 30,
): number[] {
  return Array.from(
    new Set(
      availableEndTimes
        .map((endTime) => getMinutesBetween(startTime, endTime))
        .filter((duration) => duration >= minimumDuration && duration % stepMinutes === 0),
    ),
  ).sort((a, b) => a - b)
}


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
    return `${mins} minutes`
  } else if (mins === 0) {
    return `${hours} hour${hours > 1 ? "s" : ""}`
  } else {
    return `${hours} hour${hours > 1 ? "s" : ""} ${mins} minutes`
  }
}

export function isTimeSlotAvailable(timeSlot: string, roomId: string, bookings: TimeSlot[]): boolean {
  return !bookings.some((booking) => booking.roomId === roomId && booking.startTime === timeSlot && booking.status == "booked")
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

export function isTimeSlotPast(timeSlot: string, scheduleDate: string): boolean {
  const now = new Date()
  const pastThresholdMinutes = 30
  
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

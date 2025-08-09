import { TimeSlot } from "types"


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
  const hours = duration / 60
  const decrementPerHour = 10
  const basePrice = baseRate * 2
  let hourlyRate = basePrice

  if (hours > 1 && hours <= 2) {
    hourlyRate -= decrementPerHour
  } else if (hours <= 3) {
    hourlyRate -= decrementPerHour * 2
  } else if (hours > 3) {
    hourlyRate -= decrementPerHour * 3
  }

  if (!Number.isInteger(hours)) {
    hourlyRate += 100
  }

  const total = hourlyRate * Math.floor(hours)
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

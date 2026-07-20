// Customers have no accounts, so the only way to let them resume an unfinished
// (pending) booking after closing the modal is to remember it in localStorage.
// The stored bookingId is matched against pending slots on the schedule; a slot
// that matches is clickable and reopens the payment flow.

export interface StoredPendingBooking {
  bookingId: string
  roomId: string
  date: string
  startTime: string
  endTime: string
  duration: number // minutes
  amount: number // final price the QR was generated for
  customerName: string
  customerPhone: string
  promotionId: string
}

const PENDING_BOOKING_KEY = "pending_booking"

export function getStoredPendingBooking(): StoredPendingBooking | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(PENDING_BOOKING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredPendingBooking
    return parsed.bookingId ? parsed : null
  } catch {
    return null
  }
}

export function savePendingBooking(booking: StoredPendingBooking): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(booking))
  } catch {
    // Storage full/blocked — resume just won't be offered
  }
}

export function clearPendingBooking(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(PENDING_BOOKING_KEY)
  } catch {
    // ignore
  }
}

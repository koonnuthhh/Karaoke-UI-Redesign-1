export interface Room {
  id: string
  name: string
  capacity: string
  hourlyRate: number
  features: string[]
  color: string
}

export interface TimeSlot {
  id: string
  roomId: string
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
  isBooked: boolean
  customerName?: string
  price?: number
  duration: number // in minutes
}

export interface BookingRequest {
  startTime: any
  endTime: any
  roomId: string
  date: string
  timeSlots: string[] // Array of selected time slots
  customerName: string
  customerEmail: string
  customerPhone: string
  specialRequests?: string
  totalPrice: number
  duration: number // total duration in minutes
}

export interface BookingResponse {
  success: boolean
  bookingId?: string
  message: string
  paymentUrl?: string
}

export interface ScheduleData {
  date: string
  timeSlots: string[]
  rooms: Room[]
  bookings: TimeSlot[]
}

export interface AdminBooking {
  id: string
  roomId: string
  roomName: string
  customerName: string
  customerEmail: string
  customerPhone: string
  date: string
  startTime: string
  endTime: string
  duration: number
  totalPrice: number
  status: "confirmed" | "pending" | "cancelled"
  createdAt: string
  specialRequests?: string
}

export interface AdminStats {
  totalBookings: number
  totalRevenue: number
  occupancyRate: number
  popularRooms: { roomName: string; bookings: number }[]
}

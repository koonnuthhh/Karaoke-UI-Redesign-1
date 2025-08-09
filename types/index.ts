export interface Room {
  room_id: string
  room_name: string
  capacity: string
  price_per_half_hour: number
  features: string[]
  color: string
}

export interface TimeSlot {
  id: string
  roomId: string
  date: string
  startTime: string
  endTime: string
  status: string
  customerName?: string
  customerID: string
  price?: number
  duration: number // in minutes
}

export interface BookingRequest {
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

export interface Room {
  room_id: string
  room_name: string
  price_per_half_hour: number
  is_active: boolean
  features: string[]
  color: string
  // Controls column order in the schedule grid (ascending); rooms with no
  // value (or equal values) fall back to alphabetical by room_name.
  display_order?: number | null
  // Temporary scheduled unavailability (e.g. maintenance), separate from is_active.
  // blackout_start_time/end_time is a DAILY recurring window (like Promotion's
  // start_time/end_time), applied on every date within the start/end date range.
  // null (not undefined) is used to explicitly clear a field - JSON.stringify drops
  // undefined keys entirely, which would leave the old value untouched server-side.
  blackout_start_date?: string | null
  blackout_end_date?: string | null
  blackout_start_time?: string | null
  blackout_end_time?: string | null
}

export interface TimeSlot {
  id: string
  roomId: string
  roomName: string
  date: string
  startTime: string
  bookingStart?: string
  bookingEnd?: string
  endTime?: string
  status: string
  customerName?: string
  customerPhone?: string
  customerID: string
  price?: number
  duration: number // in minutes
  created_at?: string
  updated_at?: string
  // Set when an admin created this booking directly (not a customer self-booking)
  bookedByAdminId?: string
  bookedByAdminName?: string
}

export interface BookingRequest {
  roomId: string
  roomName: string
  date: string
  timeSlots: string[] // Array of selected time slots
  customerName: string
  customerEmail: string
  customerPhone: string
  specialRequests?: string
  totalPrice: number
  duration: number // total duration in minutes
  // Set when an admin created this booking directly (not a customer self-booking)
  bookedByAdminId?: string
  bookedByAdminName?: string
}


export interface ScheduleData {
  date: string
  timeSlots: string[]
  rooms: Room[]
  bookings: TimeSlot[]
}

export interface AdminUser {
  admin_id: string
  username: string
  email: string
  role: "admin" | "modulator"
  login_time?: string
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

export interface Admin {
  admin_id?: string
  id?: string
  name: string
  username: string
  password?: string
  role: string
}
export interface Promotion {
  id?: string
  code: string
  pro_name?: string
  name?: string  // Legacy support
  description?: string
  type?: "percentage_discount" | "flat_discount" | "buy_x_get_y"
  discount_percent?: number
  discount_value?: number
  discount?: number  // Legacy support
  buy_x_hour?: number
  get_y_hour?: number
  start_date?: string
  startDate?: string  // Legacy support
  end_date?: string
  endDate?: string  // Legacy support
  start_time?: string
  end_time?: string
  applicable_days?: number[] // Days of week the promo is active, 0=Sunday..6=Saturday; empty/undefined = every day
  is_active?: boolean
  isActive?: boolean  // Legacy support
  is_room_specific?: boolean
  applicable_room_ids?: string[]  // Array of room IDs for room-specific promotions
  max_usage?: number
  maxUses?: number  // Legacy support
  used_count?: number
  usedCount?: number  // Legacy support
  created_by?: string
  discountType?: string  // Legacy support
}
export const siteConfig = {
  // Business Information
  business: {
    name: "Harmony Karaoke Lounge",
    tagline: "Book Your Perfect Karaoke Experience",
    phone: "+1 (555) 123-4567",
    email: "bookings@harmonykaraoke.com",
    address: "123 Music Street, Entertainment District",
  },

  // Room Configuration
  rooms: [
    {
      id: "room-1",
      name: "Intimate Studio",
      capacity: "2-4 people",
      hourlyRate: 25,
      features: ["Premium sound system", "Mood lighting", "Snack service"],
    },
    {
      id: "room-2",
      name: "Party Room",
      capacity: "6-10 people",
      hourlyRate: 45,
      features: ["Large screen", "Dance floor", "Full bar service", "DJ booth"],
    },
    {
      id: "room-3",
      name: "VIP Suite",
      capacity: "10-15 people",
      hourlyRate: 75,
      features: ["Private bathroom", "Luxury seating", "Champagne service", "Personal host"],
    },
    {
      id: "room-4",
      name: "Super VIP",
      capacity: "10-15 people",
      hourlyRate: 75,
      features: ["Private bathroom", "Luxury seating", "Champagne service", "Personal host"],
    },
  ],

  // Schedule Configuration
  schedule: {
    slotDuration: 30, // minutes
    openTime: "10:00",
    closeTime: "03:00",
  },

  // Business Hours
  businessHours: {
    monday: { open: "18:00", close: "02:00", closed: false },
    tuesday: { open: "18:00", close: "02:00", closed: false },
    wednesday: { open: "18:00", close: "02:00", closed: false },
    thursday: { open: "18:00", close: "02:00", closed: false },
    friday: { open: "17:00", close: "03:00", closed: false },
    saturday: { open: "15:00", close: "03:00", closed: false },
    sunday: { open: "15:00", close: "01:00", closed: false },
  },

  // Pricing Rules
  pricing: {
    peakHours: {
      start: "19:00",
      end: "23:00",
      multiplier: 1.5,
      days: ["friday", "saturday"],
    },
    minimumBooking: 1, // 30-minute slots
    maximumBooking: 12, // 6 hours in 30-minute slots
    advanceBookingDays: 30,
    cancellationHours: 24,
  },

  // Admin Configuration
  admin: {
    username: "admin",
    password: "karaoke2024", // In production, use proper authentication
    routes: {
      dashboard: "/admin",
      bookings: "/admin/bookings",
      rooms: "/admin/rooms",
      settings: "/admin/settings",
    },
  },

  // UI Configuration
  theme: {
    primary: "rgb(147, 51, 234)", // purple-600
    secondary: "rgb(59, 130, 246)", // blue-500
    accent: "rgb(245, 158, 11)", // amber-500
    success: "rgb(34, 197, 94)", // green-500
    error: "rgb(239, 68, 68)", // red-500
    warning: "rgb(245, 158, 11)", // amber-500
  },

  // Text Content
  content: {
    hero: {
      title: "Book Your Karaoke Room",
      subtitle: "Choose from our premium rooms and sing your heart out!",
    },
    booking: {
      modalTitle: "Book Your Karaoke Session",
      confirmButton: "Confirm Booking",
      cancelButton: "Cancel",
      paymentButton: "Proceed to Payment",
      selectSlots: "Select time slots (minimum 1 slot = 30 minutes)",
    },
    schedule: {
      tableTitle: "Room Availability",
      noBookings: "No bookings available",
      loading: "Loading schedule...",
    },
    admin: {
      title: "Admin Dashboard",
      bookingsTitle: "Manage Bookings",
      roomsTitle: "Manage Rooms",
      settingsTitle: "System Settings",
    },
  },

  // API Configuration
  api: {
    endpoints: {
      bookings: "/api/bookings",
      rooms: "/api/rooms",
      schedule: "/api/schedule",
      payment: "/api/payment",
      admin: "/api/admin",
    },
    timeout: 10000,
  },
} as const

export type SiteConfig = typeof siteConfig

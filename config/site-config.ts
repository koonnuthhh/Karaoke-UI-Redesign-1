export const siteConfig = {
  // Business Information
  business: {
    name: "Alurfia Karaoke",
    tagline: "Be Your Perfect Karaoke Experience",
    IG: "Alurfia.in.shelter",
    facebook: "Alurfia in shelter",
    address: "264/2 M.1 Thasud Muang Chiangrai 57100",
  },

  payment: {
    promptPayNumber: "0945945564", 
    currency: "THB",
  },



  // Schedule Configuration
  schedule: {
    maximumPrebook: 30,
    slotDuration: 30, // minutes
    openTime: "12:00",
    closeTime: "01:00",
  },

  // Business Hours
  Open_hour: {
    monday: { open: "12:00", close: "01:00", closed: false },
    tuesday: { open: "12:00", close: "01:00", closed: false },
    wednesday: { open: "12:00", close: "01:00", closed: false },
    thursday: { open: "12:00", close: "01:00", closed: false },
    friday: { open: "12:00", close: "01:00", closed: false },
    saturday: { open: "12:00", close: "01:00", closed: false },
    sunday: { open: "12:00", close: "01:00", closed: false },
  },

  // Pricing Rules

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
    maintext: "text-grey-400",
    primary: "rgb(27, 20, 34)", // purple-600
    secondary: "rgb(18, 64, 138)", // blue-500

    accent: "rgb(245, 158, 11)", // amber-500
    success: "rgb(34, 197, 94)", // green-500
    error: "rgb(239, 68, 68)", // red-500
    warning: "rgb(245, 158, 11)", // amber-500

    roomavailable: "rgb(43, 170, 243)",
    roomavailableHover: "rgb(23, 126, 145)",
    roompending: "rgba(88, 233, 31, 1)", // red-400
    roombooked:"rgba(255, 129, 129, 1)",
    roomclosed:"rgb(150,150,150)"
  },

  // Text Content
  content: {
    hero: {
      // title: "This could be use for Title of promotion",
      // subtitle: "This could be use for detail!",
      title: "",
      subtitle: "",
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

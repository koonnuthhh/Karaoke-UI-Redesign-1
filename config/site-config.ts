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
    accountName:"น.ส. สุธาวี จอประเสริฐกุล",
    promptPayNumber: "0945945564", 
    currency: "THB",
  },



  // Schedule Configuration
  schedule: {
    maximumPrebook: 30,
    slotDuration: 30, // minutes
    closeTime: "01:00",
    openTime: "12:00",
    // How often the Live Rooms tab re-fetches bookings. Must stay longer than that
    // tab's own CLOCK_TICK_MS, which re-renders the countdowns between fetches.
    refreshIntervalMs: 60000,
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

  // UI Configuration
  theme: {
    maintext: "text-grey-400",
    primary: "rgb(18, 64, 138)", // purple-600 rgb(18, 64, 138)
    secondary: "rgb(27, 20, 34)", // blue-500
    //rgb(18, 64, 138)
    success: "rgb(34, 197, 94)", // green-500
    error: "rgb(239, 68, 68)", // red-500
    warning: "rgb(245, 158, 11)", // amber-500

    roomavailable: "rgb(43, 170, 243)",
    roomavailableHover: "rgb(23, 126, 145)",
    roompending: "rgba(88, 233, 31, 1)", // red-400
    roombooked:"rgba(255, 129, 129, 1)",
    roomclosed:"rgb(150,150,150)"
  },

  // API Configuration
  api: {
    baseURL: process.env.API_PATH || "http://localhost:3000",
    timeout: 10000,
  },
} as const

export type SiteConfig = typeof siteConfig

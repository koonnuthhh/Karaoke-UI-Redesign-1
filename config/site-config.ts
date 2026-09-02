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
    // Admins may book right up to this time in every case — the walk-in exception
    // below is for customers only. See getEffectiveCloseTime in lib/time-utils.ts.
    adminCloseTime: "02:00",
    // The final 00:30 slot sits only half an hour from closeTime, below the customer
    // minimum, so on its own it would never be bookable. It opens to 01:30 once the
    // 00:00 slot before it is out of reach — the clock has passed it, or the room is
    // already booked through it. Otherwise it stays capped at closeTime, which is what
    // stops it being booked in advance. See getEffectiveCloseTime.
    lateNightStartSlot: "00:30",
    lateNightCloseTime: "01:30",
    // How far the Live Rooms timeline draws, which is deliberately NOT closeTime:
    // sessions booked up to closing still run past it, and the chart has to show them
    // rather than clipping them at the right edge. Bookable hours stay openTime..closeTime.
    timelineEndTime: "02:00",
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
    roomclosed:"rgb(150,150,150)",

    // One colour per customer on the Live Rooms timeline, so back-to-back bookings by
    // different people don't read as a single long block. Kept light enough that the
    // dark block text stays legible on every entry.
    roomBookingPalette: [
      "rgb(248, 154, 154)", // rose - same family as roombooked
      "rgb(152, 205, 233)", // sky
      "rgb(160, 214, 166)", // green
      "rgb(246, 205, 138)", // amber
      "rgb(203, 178, 232)", // violet
      "rgb(139, 212, 205)", // teal
      "rgb(242, 179, 141)", // orange
      "rgb(197, 208, 141)", // olive
    ],
  },

  // API Configuration
  api: {
    baseURL: process.env.API_PATH || "http://localhost:3000",
    timeout: 10000,
  },
} as const

export type SiteConfig = typeof siteConfig

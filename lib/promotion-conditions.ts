import type { Promotion } from "@/types"

export interface PromotionConditionCheck {
  valid: boolean
  message?: string
}

export interface PromotionConditionTarget {
  date?: string
  time?: string
  endTime?: string
  roomId?: string
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + (minutes || 0)
}

// Business hours cross midnight (e.g. 12:00 open, 01:00 close), so a daily window
// like start_time=23:00/end_time=01:00 wraps past midnight the same way schedule
// slots do elsewhere in this codebase (see lib/time-utils.ts).
function isWithinDailyWindow(time: string, startTime: string, endTime: string): boolean {
  const t = toMinutes(time)
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  if (end <= start) {
    return t >= start || t <= end
  }
  return t >= start && t <= end
}

/**
 * Minutes of overlap between a one-off [bookingStart, bookingEnd) range and a
 * daily-recurring [windowStart, windowEnd) window. Both ranges may cross midnight
 * (e.g. window 23:00-01:00, booking 23:30-02:00). Checks the window's occurrence
 * on the previous/same/next day relative to the booking so wraparound in either
 * range is handled without needing to know the site's actual open/close time.
 */
export function getOverlapMinutes(
  bookingStart: string,
  bookingEnd: string,
  windowStart: string,
  windowEnd: string
): number {
  const bStart = toMinutes(bookingStart)
  let bEnd = toMinutes(bookingEnd)
  if (bEnd <= bStart) bEnd += 1440

  const wStartBase = toMinutes(windowStart)
  let wEndBase = toMinutes(windowEnd)
  if (wEndBase <= wStartBase) wEndBase += 1440
  const windowDuration = wEndBase - wStartBase

  let totalOverlap = 0
  for (const offset of [-1440, 0, 1440]) {
    const wStart = wStartBase + offset
    const wEnd = wStart + windowDuration
    const overlap = Math.min(bEnd, wEnd) - Math.max(bStart, wStart)
    if (overlap > 0) totalOverlap += overlap
  }
  return totalOverlap
}

/**
 * Fraction (0-1) of a booking's price that falls within the promotion's daily
 * time window. 1 when the promotion has no time window, or when either time
 * isn't known (falls back to the whole booking being eligible).
 */
export function getEligiblePriceFraction(promotion: Promotion, bookingStart?: string, bookingEnd?: string): number {
  if (!promotion.start_time || !promotion.end_time || !bookingStart || !bookingEnd) {
    return 1
  }

  const start = toMinutes(bookingStart)
  let end = toMinutes(bookingEnd)
  if (end <= start) end += 1440
  const totalMinutes = end - start
  if (totalMinutes <= 0) return 1

  const overlapMinutes = getOverlapMinutes(bookingStart, bookingEnd, promotion.start_time, promotion.end_time)
  return Math.max(0, Math.min(1, overlapMinutes / totalMinutes))
}

/**
 * Checks whether a promotion's conditions (active flag, room, date range,
 * day-of-week, daily time window, usage limit) hold for a given target
 * date/time - either "now" (default) or a specific booking's date/start_time
 * (so the promo is checked against the slot actually being booked).
 *
 * When both target.time and target.endTime are given, the time-window check is
 * overlap-based (valid as long as the booking touches the window at all - see
 * getEligiblePriceFraction for prorating the actual discount).
 */
export function checkPromotionConditions(
  promotion: Promotion,
  target: PromotionConditionTarget = {}
): PromotionConditionCheck {
  if (!(promotion.isActive ?? promotion.is_active)) {
    return { valid: false, message: "Promotion code is no longer active" }
  }

  if (promotion.is_room_specific && target.roomId) {
    if (!promotion.applicable_room_ids || !promotion.applicable_room_ids.includes(target.roomId)) {
      return { valid: false, message: "This promotion is not available for the selected room" }
    }
  }

  const startDate = promotion.startDate || promotion.start_date
  const endDate = promotion.endDate || promotion.end_date
  const targetDate = target.date || new Date().toISOString().split("T")[0]

  if (startDate && targetDate < startDate.split("T")[0]) {
    return { valid: false, message: "This promotion is not yet valid for the selected booking date" }
  }
  if (endDate && targetDate > endDate.split("T")[0]) {
    return { valid: false, message: "This promotion has expired for the selected booking date" }
  }

  if (promotion.applicable_days && promotion.applicable_days.length > 0) {
    const [year, month, day] = targetDate.split("-").map(Number)
    const weekday = new Date(year, month - 1, day).getDay()
    if (!promotion.applicable_days.includes(weekday)) {
      return { valid: false, message: "This promotion is not valid on the selected day of the week" }
    }
  }

  if (promotion.start_time && promotion.end_time) {
    if (target.time && target.endTime) {
      const overlapMinutes = getOverlapMinutes(target.time, target.endTime, promotion.start_time, promotion.end_time)
      if (overlapMinutes <= 0) {
        return { valid: false, message: "This promotion is not available during the booked time" }
      }
    } else if (target.time) {
      if (!isWithinDailyWindow(target.time, promotion.start_time, promotion.end_time)) {
        return { valid: false, message: "This promotion is not available at the selected time" }
      }
    }
  }

  const maxUsage = promotion.maxUses ?? promotion.max_usage
  const usageCount = promotion.usedCount ?? promotion.used_count
  if (maxUsage && usageCount !== undefined && usageCount >= maxUsage) {
    return { valid: false, message: "This promotion has reached its usage limit" }
  }

  return { valid: true }
}

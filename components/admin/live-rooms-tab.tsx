"use client"

import { useState, useEffect, useMemo } from "react"
import { RefreshCw, DoorOpen, Users, Wrench, ArrowRight, CalendarClock } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { formatDuration } from "@/lib/time-utils"
import {
  RoomTimelineChart,
  bookingWindow,
  compareRoomOrder,
  hhmm,
  isRoomBlackedOutNow,
} from "@/components/admin/room-timeline-chart"
import { siteConfig } from "@/config/site-config"
import type { TimeSlot, Room } from "@/types"

// How often the countdowns re-render. Shorter than the data refresh so "ends in
// X min" doesn't sit visibly stale between fetches.
const CLOCK_TICK_MS = 15000

// Fallback refresh period. setInterval() treats an undefined delay as 0, which turns a
// missing config value into a request flood rather than a visible error, so the delay
// is floored here instead of being passed through raw.
const DEFAULT_REFRESH_MS = 60000

// Local "YYYY-MM-DD". Not toISOString() - that is UTC and would roll the date
// over 7 hours early in Thailand.
function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

// The business day runs past midnight (open 12:00, close 01:00), so between
// midnight and 06:00 the day still belongs to yesterday's date - the same cut-off
// toBusinessMinutes uses to order overnight times.
function businessDateOf(now: Date): string {
  const d = new Date(now)
  if (d.getHours() < 6) d.setDate(d.getDate() - 1)
  return toDateKey(d)
}

// "Now" on the same minutes-since-open scale as toBusinessMinutes.
function nowBusinessMinutes(now: Date): number {
  const total = now.getHours() * 60 + now.getMinutes()
  return now.getHours() < 6 ? total + 1440 : total
}

// "in 25 min" / "in 2 hrs 5 min", or "now" once the gap has closed.
function relativeFromNow(minutes: number): string {
  if (minutes <= 0) return "now"
  return `in ${formatDuration(minutes)}`
}

interface QueuedBooking {
  booking: TimeSlot
  startsIn: number
}

interface RoomStatus {
  room: Room
  current?: TimeSlot
  upcoming: QueuedBooking[]
  // Why the room can't take a customer right now, if it can't. A room can still be
  // showing a live booking while unavailable (e.g. a blackout added mid-session), so
  // `current` always wins in the UI.
  unavailableReason?: "inactive" | "blackout"
}

interface LiveRoomsTabProps {
  rooms: Room[]
  onNavigateToBookings?: () => void
}

export function LiveRoomsTab({ rooms, onNavigateToBookings }: LiveRoomsTabProps) {
  const [now, setNow] = useState<Date>(() => new Date())
  const [bookings, setBookings] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const businessDate = businessDateOf(now)
  const nowMin = nowBusinessMinutes(now)

  // Countdown clock, independent of the data refresh below.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_TICK_MS)
    return () => clearInterval(timer)
  }, [])

  const fetchBookings = async (date: string, showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      const response = await fetch(`/api/admin/bookings?date=${date}`, {
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) throw new Error("Request failed")
      const data = await response.json()
      setBookings(data.bookings || [])
      setError("")
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Failed to fetch live bookings:", err)
      setError("Could not load today's bookings.")
    } finally {
      setLoading(false)
    }
  }

  // Re-fetches on its own interval, and again whenever the business day rolls over
  // (i.e. someone leaves this page open past 06:00).
  useEffect(() => {
    fetchBookings(businessDate, true)
    const refreshMs = Math.max(CLOCK_TICK_MS, siteConfig.schedule.refreshIntervalMs || DEFAULT_REFRESH_MS)
    const timer = setInterval(() => fetchBookings(businessDate), refreshMs)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessDate])

  // Shared by the summary counts, the queue and the timeline chart, so all three agree
  // on which bookings and which room order they are describing.
  const activeBookings = useMemo(
    () => bookings.filter((b) => b.status?.toLowerCase() !== "cancelled"),
    [bookings],
  )
  const sortedRooms = useMemo(() => [...rooms].sort(compareRoomOrder), [rooms])

  const roomStatuses: RoomStatus[] = useMemo(() => {
    return sortedRooms.map((room) => {
      const roomBookings = activeBookings
        .filter((b) => b.roomId === room.room_id)
        .map((b) => ({ booking: b, window: bookingWindow(b) }))
        .filter((entry): entry is { booking: TimeSlot; window: { start: number; end: number } } => entry.window !== null)
        .sort((a, b) => a.window.start - b.window.start)

      const current = roomBookings.find((e) => e.window.start <= nowMin && e.window.end > nowMin)
      const upcoming = roomBookings.filter((e) => e.window.start > nowMin)

      return {
        room,
        current: current?.booking,
        upcoming: upcoming.map((e) => ({ booking: e.booking, startsIn: e.window.start - nowMin })),
        unavailableReason: room.is_active === false
          ? ("inactive" as const)
          : isRoomBlackedOutNow(room, businessDate, nowMin)
            ? ("blackout" as const)
            : undefined,
      }
    })
  }, [sortedRooms, activeBookings, nowMin, businessDate])

  // Everyone still to come today, across all rooms, earliest first - the queue an
  // admin actually reads off when someone asks "who's next?".
  const queue = useMemo(() => {
    return roomStatuses
      .flatMap((status) =>
        status.upcoming.map((entry) => ({ ...entry, roomName: status.room.room_name }))
      )
      .sort((a, b) => a.startsIn - b.startsIn)
  }, [roomStatuses])

  const inUseCount = roomStatuses.filter((s) => s.current).length
  const closedCount = roomStatuses.filter((s) => !s.current && s.unavailableReason).length
  const freeCount = roomStatuses.length - inUseCount - closedCount

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Live Rooms</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} &middot; business day {businessDate}
            {lastUpdated && (
              <> &middot; updated {lastUpdated.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</>
            )}
          </p>
        </div>
        <button
          onClick={() => fetchBookings(businessDate, true)}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <SummaryCard label="In Use" value={inUseCount} icon={<Users className="w-8 h-8 text-rose-500 opacity-20" />} />
        <SummaryCard label="Free" value={freeCount} icon={<DoorOpen className="w-8 h-8 text-emerald-500 opacity-20" />} />
        <SummaryCard label="Unavailable" value={closedCount} icon={<Wrench className="w-8 h-8 text-slate-500 opacity-20" />} />
        <SummaryCard label="Queue Left" value={queue.length} icon={<CalendarClock className="w-8 h-8 text-blue-500 opacity-20" />} />
      </div>

      {/* Rooms x time, from the current slot to closing */}
      <RoomTimelineChart
        rooms={sortedRooms}
        bookings={activeBookings}
        businessDate={businessDate}
        nowMin={nowMin}
      />

      {/* Queue across all rooms */}
      <div className="mt-6 sm:mt-8 bg-white rounded-lg shadow overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-blue-600" /> Up Next
          </h3>
          {onNavigateToBookings && (
            <button
              onClick={onNavigateToBookings}
              className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              All bookings <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {queue.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No bookings left for the rest of the day.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {queue.map(({ booking, roomName, startsIn }) => (
              <li key={booking.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-14 sm:w-16 flex-shrink-0 text-sm font-semibold text-gray-900">
                  {hhmm(booking.startTime)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {booking.customerName || "Walk-in"}
                    <span className="text-slate-400 font-normal"> &middot; {roomName}</span>
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {hhmm(booking.startTime)} - {hhmm(booking.endTime)}
                    {booking.customerPhone && <> &middot; {booking.customerPhone}</>}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs text-slate-500 whitespace-nowrap">{relativeFromNow(startsIn)}</span>
                  <StatusPill status={booking.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-gray-600 text-xs sm:text-sm">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="flex-shrink-0">{icon}</div>
      </div>
    </div>
  )
}

// "pending" is an unpaid booking still holding the slot, so it gets its own colour
// rather than reading as a confirmed customer.
function StatusPill({ status }: { status?: string }) {
  const value = status?.toLowerCase()
  const styles =
    value === "pending"
      ? "bg-amber-100 text-amber-700"
      : value === "confirmed" || value === "paid"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-slate-100 text-slate-600"

  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${styles}`}>{status || "unknown"}</span>
}

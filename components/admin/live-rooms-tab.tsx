"use client"

import { useState, useEffect, useMemo } from "react"
import { RefreshCw, Clock, DoorOpen, Users, Wrench, Phone, ArrowRight, CalendarClock } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { toBusinessMinutes, formatDuration, isRoomBlackedOut } from "@/lib/time-utils"
import { siteConfig } from "@/config/site-config"
import type { TimeSlot, Room } from "@/types"

// How often the countdowns re-render. Shorter than the data refresh so "ends in
// X min" doesn't sit visibly stale between fetches.
const CLOCK_TICK_MS = 15000

// Fallback refresh period. setInterval() treats an undefined delay as 0, which turns a
// missing config value into a request flood rather than a visible error, so the delay
// is floored here instead of being passed through raw.
const DEFAULT_REFRESH_MS = 60000

// Ascending by display_order; rooms with no order set sort after ordered ones,
// falling back to alphabetical by name - same ordering as the schedule grid.
function compareRoomOrder(a: Room, b: Room): number {
  const aOrder = a.display_order ?? null
  const bOrder = b.display_order ?? null
  if (aOrder !== null && bOrder !== null && aOrder !== bOrder) return aOrder - bOrder
  if (aOrder !== null && bOrder === null) return -1
  if (aOrder === null && bOrder !== null) return 1
  return a.room_name.localeCompare(b.room_name)
}

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

function hhmm(time?: string): string {
  return time ? time.slice(0, 5) : "--:--"
}

// Occupied window of a booking on the business-minutes scale.
function bookingWindow(booking: TimeSlot): { start: number; end: number } | null {
  const start = hhmm(booking.startTime)
  const end = hhmm(booking.endTime)
  if (start === "--:--" || end === "--:--") return null

  const startMin = toBusinessMinutes(start)
  let endMin = toBusinessMinutes(end)
  if (endMin <= startMin) endMin += 1440 // Runs past midnight
  return { start: startMin, end: endMin }
}

// "Is this room blacked out at this instant" - the shared window test narrowed to the
// single minute we're rendering.
function isRoomBlackedOutNow(room: Room, date: string, nowMin: number): boolean {
  return isRoomBlackedOut(room, date, nowMin, nowMin + 1)
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
  currentEndsIn: number
  currentElapsedPercent: number
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

  const roomStatuses: RoomStatus[] = useMemo(() => {
    const active = bookings.filter((b) => b.status?.toLowerCase() !== "cancelled")

    return [...rooms].sort(compareRoomOrder).map((room) => {
      const roomBookings = active
        .filter((b) => b.roomId === room.room_id)
        .map((b) => ({ booking: b, window: bookingWindow(b) }))
        .filter((entry): entry is { booking: TimeSlot; window: { start: number; end: number } } => entry.window !== null)
        .sort((a, b) => a.window.start - b.window.start)

      const current = roomBookings.find((e) => e.window.start <= nowMin && e.window.end > nowMin)
      const upcoming = roomBookings.filter((e) => e.window.start > nowMin)
      const duration = current ? current.window.end - current.window.start : 0

      return {
        room,
        current: current?.booking,
        currentEndsIn: current ? current.window.end - nowMin : 0,
        currentElapsedPercent: duration > 0 ? Math.min(100, ((nowMin - current!.window.start) / duration) * 100) : 0,
        upcoming: upcoming.map((e) => ({ booking: e.booking, startsIn: e.window.start - nowMin })),
        unavailableReason: room.is_active === false
          ? ("inactive" as const)
          : isRoomBlackedOutNow(room, businessDate, nowMin)
            ? ("blackout" as const)
            : undefined,
      }
    })
  }, [rooms, bookings, nowMin, businessDate])

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

      {/* Room cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {roomStatuses.map((status) => (
          <RoomCard key={status.room.room_id} status={status} />
        ))}
        {roomStatuses.length === 0 && (
          <div className="col-span-full bg-white rounded-lg shadow p-8 text-center text-slate-500 text-sm">
            No rooms configured.
          </div>
        )}
      </div>

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

function RoomCard({ status }: { status: RoomStatus }) {
  const { room, current, currentEndsIn, currentElapsedPercent, upcoming, unavailableReason } = status
  const next = upcoming[0]

  const accent = current ? "border-rose-500" : unavailableReason ? "border-slate-400" : "border-emerald-500"

  return (
    <div className={`bg-white rounded-lg shadow border-l-4 ${accent} p-4`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-gray-900 truncate">{room.room_name}</h3>
        {current ? (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-100 text-rose-700 whitespace-nowrap">
            In use
          </span>
        ) : unavailableReason ? (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 text-slate-700 whitespace-nowrap">
            {unavailableReason === "inactive" ? "Closed" : "Blackout"}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700 whitespace-nowrap">
            Free
          </span>
        )}
      </div>

      {current ? (
        <div className="mb-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">{current.customerName || "Walk-in"}</p>
            <StatusPill status={current.status} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {hhmm(current.startTime)} - {hhmm(current.endTime)}
          </p>
          {current.customerPhone && (
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Phone className="w-3 h-3" /> {current.customerPhone}
            </p>
          )}

          <div className="mt-2">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${currentElapsedPercent}%` }} />
            </div>
            <p className="text-xs font-medium text-rose-600 mt-1">
              {currentEndsIn > 0 ? `${formatDuration(currentEndsIn)} left` : "Ending now"}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500 mb-3">
          {unavailableReason === "inactive"
            ? "Room is set inactive"
            : unavailableReason === "blackout"
              ? "Blocked by a blackout window"
              : "Nobody in this room right now"}
        </p>
      )}

      {/* Next in queue for this room */}
      <div className="pt-3 border-t border-slate-100">
        {next ? (
          <>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Next</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-gray-900 truncate">
                {next.booking.customerName || "Walk-in"}
                <span className="text-slate-400"> &middot; {hhmm(next.booking.startTime)}-{hhmm(next.booking.endTime)}</span>
              </p>
              <span className="text-xs text-slate-500 whitespace-nowrap">{relativeFromNow(next.startsIn)}</span>
            </div>
            {upcoming.length > 1 && (
              <p className="text-xs text-slate-400 mt-1">+{upcoming.length - 1} more later today</p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-400">No further bookings today</p>
        )}
      </div>
    </div>
  )
}

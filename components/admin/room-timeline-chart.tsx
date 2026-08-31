"use client"

import { useMemo } from "react"
import { generateTimeSlots, toBusinessMinutes, isRoomBlackedOut } from "@/lib/time-utils"
import { siteConfig } from "@/config/site-config"
import type { Room, TimeSlot } from "@/types"

// Width of the sticky room-name column, in px. Needed as a number (not a Tailwind
// class) because the "now" line is positioned with calc() against it.
const ROOM_COL_WIDTH = 128

// Minimum width of one time slot. Below this the labels collide, so the track gets a
// min-width and the container scrolls horizontally instead of squashing.
const SLOT_MIN_WIDTH = 64

const ROW_HEIGHT = 52

// A block narrower than this many slots only has room for the name, not the times.
const SLOTS_FOR_TIME_LABEL = 3

// Ascending by display_order; rooms with no order set sort after ordered ones,
// falling back to alphabetical by name - same ordering as the schedule grid.
export function compareRoomOrder(a: Room, b: Room): number {
  const aOrder = a.display_order ?? null
  const bOrder = b.display_order ?? null
  if (aOrder !== null && bOrder !== null && aOrder !== bOrder) return aOrder - bOrder
  if (aOrder !== null && bOrder === null) return -1
  if (aOrder === null && bOrder !== null) return 1
  return a.room_name.localeCompare(b.room_name)
}

// The API hands back "HH:MM:SS"; everything downstream (toBusinessMinutes included)
// expects "HH:MM".
export function hhmm(time?: string): string {
  return time ? time.slice(0, 5) : "--:--"
}

// Occupied window of a booking on the business-minutes scale.
export function bookingWindow(booking: TimeSlot): { start: number; end: number } | null {
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
export function isRoomBlackedOutNow(room: Room, date: string, nowMin: number): boolean {
  return isRoomBlackedOut(room, date, nowMin, nowMin + 1)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// Two bookings belong to the same party when the account matches; walk-ins have no
// user_id, so fall back to the name.
function samePartyAs(a: MergedBooking, b: TimeSlot): boolean {
  if (a.customerID && b.customerID) return a.customerID === b.customerID
  return (a.customerName || "") === (b.customerName || "")
}

interface MergedBooking {
  ids: string[]
  start: number
  end: number
  startLabel: string
  endLabel: string
  status?: string
  customerID?: TimeSlot["customerID"]
  customerName?: string | null
  customerPhone?: string | null
}

// /api/admin/bookings already returns one row per booking, so a 3-hour session arrives
// as a single row. This only collapses the other case: the same customer holding two
// back-to-back rows in one room, which should read as one continuous block.
function mergeRoomBookings(bookings: TimeSlot[]): MergedBooking[] {
  const entries = bookings
    .map((booking) => ({ booking, window: bookingWindow(booking) }))
    .filter((entry): entry is { booking: TimeSlot; window: { start: number; end: number } } => entry.window !== null)
    .sort((a, b) => a.window.start - b.window.start)

  const merged: MergedBooking[] = []

  for (const { booking, window } of entries) {
    const last = merged[merged.length - 1]
    const contiguous = last && window.start <= last.end
    const sameStatus = last && (last.status || "").toLowerCase() === (booking.status || "").toLowerCase()

    if (last && contiguous && sameStatus && samePartyAs(last, booking)) {
      if (window.end > last.end) {
        last.end = window.end
        last.endLabel = hhmm(booking.endTime)
      }
      last.ids.push(booking.id)
      continue
    }

    merged.push({
      ids: [booking.id],
      start: window.start,
      end: window.end,
      startLabel: hhmm(booking.startTime),
      endLabel: hhmm(booking.endTime),
      status: booking.status,
      customerID: booking.customerID,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
    })
  }

  return merged
}

interface VisibleSlot {
  label: string
  start: number
}

// Runs of blacked-out slots, coalesced into blocks. Derived by asking the shared
// isRoomBlackedOut() per slot rather than re-parsing the blackout fields here.
function blackoutBlocks(room: Room, date: string, slots: VisibleSlot[], slotDuration: number) {
  const blocks: { start: number; end: number }[] = []

  for (const slot of slots) {
    const slotEnd = slot.start + slotDuration
    if (!isRoomBlackedOut(room, date, slot.start, slotEnd)) continue

    const last = blocks[blocks.length - 1]
    if (last && last.end === slot.start) last.end = slotEnd
    else blocks.push({ start: slot.start, end: slotEnd })
  }

  return blocks
}

// Who a block belongs to. Walk-ins have no user_id, so the name is the fallback key -
// the same rule the merge uses.
function partyKey(block: MergedBooking): string {
  return block.customerID ? String(block.customerID) : block.customerName || "walk-in"
}

// Stable palette slot for a party, so one customer keeps the same colour across rooms
// and across refreshes rather than shuffling on every render. Plain hash * 31: on the
// key shapes this actually sees - "user-001", "booking-1782856145501-173", customer
// names - it walks sequential ids round-robin through the palette, which spreads
// neighbouring bookings better here than a stronger avalanche hash does.
function paletteIndexFor(key: string, length: number): number {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return Math.abs(hash) % length
}

// Colours for one room's blocks, in time order. Two blocks that touch must never share
// a colour - that is exactly the case ("A ends 17:00, B starts 17:00") where one long
// bar would otherwise read as a single booking. Blocks with a real gap between them can
// safely reuse a colour, which keeps a customer's colour stable more often.
function assignBlockColors(blocks: MergedBooking[]): string[] {
  const palette = siteConfig.theme.roomBookingPalette
  const indexes: number[] = []

  blocks.forEach((block, i) => {
    let index = paletteIndexFor(partyKey(block), palette.length)
    const previous = blocks[i - 1]
    if (previous && block.start <= previous.end && index === indexes[i - 1]) {
      index = (index + 1) % palette.length
    }
    indexes.push(index)
  })

  return indexes.map((index) => palette[index])
}

// "pending" is an unpaid booking still holding the slot. Colour now identifies the
// customer, so the status rides along as a hatch instead of a hue.
function isPending(status?: string): boolean {
  return status?.toLowerCase() === "pending"
}

interface RoomTimelineChartProps {
  rooms: Room[]
  /** Real bookings for the business day, cancelled ones already filtered out. */
  bookings: TimeSlot[]
  businessDate: string
  /** "Now" in business minutes, the same scale as toBusinessMinutes. */
  nowMin: number
}

export function RoomTimelineChart({ rooms, bookings, businessDate, nowMin }: RoomTimelineChartProps) {
  const { slotDuration } = siteConfig.schedule

  // The x axis: current slot through timelineEndTime, which runs past closing so a
  // session booked up to closeTime is not cut off. generateTimeSlots() is inclusive of
  // the end, so the trailing entry is a boundary, not a slot.
  const { visibleSlots, windowStart, windowEnd } = useMemo(() => {
    const { openTime, timelineEndTime } = siteConfig.schedule
    const all = generateTimeSlots(openTime, timelineEndTime, slotDuration).map((label) => ({
      label,
      start: toBusinessMinutes(label),
    }))
    const dayEnd = all[all.length - 1]?.start ?? 0
    const usable = all.slice(0, -1)

    // First slot that has not finished yet - so a session in progress still shows.
    const firstIndex = usable.findIndex((slot) => slot.start + slotDuration > nowMin)
    const visible = firstIndex === -1 ? [] : usable.slice(firstIndex)

    return {
      visibleSlots: visible,
      windowStart: visible[0]?.start ?? dayEnd,
      windowEnd: dayEnd,
    }
  }, [nowMin, slotDuration])

  const span = windowEnd - windowStart
  const sortedRooms = useMemo(() => [...rooms].sort(compareRoomOrder), [rooms])

  const bookingsByRoom = useMemo(() => {
    const grouped = new Map<string, TimeSlot[]>()
    for (const booking of bookings) {
      const list = grouped.get(booking.roomId)
      if (list) list.push(booking)
      else grouped.set(booking.roomId, [booking])
    }
    return grouped
  }, [bookings])

  if (visibleSlots.length === 0 || span <= 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-sm text-slate-500">
        Closed for the day &mdash; the timeline picks up again at {siteConfig.schedule.openTime}.
      </div>
    )
  }

  // Position on the axis, as a percentage of the visible window.
  const percentOf = (minutes: number) => ((clamp(minutes, windowStart, windowEnd) - windowStart) / span) * 100
  const nowPercent = percentOf(nowMin)
  const afterHoursPercent = percentOf(toBusinessMinutes(siteConfig.schedule.closeTime))
  const showNowLine = nowMin > windowStart && nowMin < windowEnd
  const trackMinWidth = ROOM_COL_WIDTH + visibleSlots.length * SLOT_MIN_WIDTH

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
          Room Timeline
          <span className="ml-2 font-normal text-xs text-slate-400">
            {visibleSlots[0].label} &ndash; {siteConfig.schedule.timelineEndTime}
          </span>
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="inline-flex gap-0.5">
              {siteConfig.theme.roomBookingPalette.slice(0, 4).map((color) => (
                <span key={color} className="h-2.5 w-2 rounded-sm" style={{ backgroundColor: color }} />
              ))}
            </span>
            one colour per customer
          </span>
          <LegendSwatch color={siteConfig.theme.roomBookingPalette[0]} label="Pending" hatched />
          <LegendSwatch color={siteConfig.theme.roomclosed} label="Closed" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: trackMinWidth }}>
          {/* Time axis */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <div className="sticky left-0 z-30 flex-shrink-0 bg-slate-50" style={{ width: ROOM_COL_WIDTH }} />
            <div className="relative flex-1 h-6">
              {visibleSlots.map((slot, index) =>
                index === 0 || slot.label.endsWith(":00") ? (
                  <span
                    key={slot.label}
                    className="absolute top-1 pl-1 text-[10px] leading-none text-slate-500"
                    style={{ left: `${(index / visibleSlots.length) * 100}%` }}
                  >
                    {slot.label}
                  </span>
                ) : null,
              )}
              <span className="absolute top-1 right-1 text-[10px] leading-none text-slate-400">
                {siteConfig.schedule.timelineEndTime}
              </span>
            </div>
          </div>

          {/* Room rows */}
          <div className="relative">
            {sortedRooms.map((room) => (
              <RoomRow
                key={room.room_id}
                room={room}
                merged={mergeRoomBookings(bookingsByRoom.get(room.room_id) || [])}
                blackouts={blackoutBlocks(room, businessDate, visibleSlots, slotDuration)}
                visibleSlots={visibleSlots}
                windowStart={windowStart}
                windowEnd={windowEnd}
                businessDate={businessDate}
                nowMin={nowMin}
                percentOf={percentOf}
                slotDuration={slotDuration}
                afterHoursPercent={afterHoursPercent}
              />
            ))}

            {sortedRooms.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No rooms configured.</p>
            )}

            {showNowLine && sortedRooms.length > 0 && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-[5] w-px bg-rose-500"
                style={{ left: `calc(${ROOM_COL_WIDTH}px + (100% - ${ROOM_COL_WIDTH}px) * ${nowPercent / 100})` }}
              >
                <span className="absolute -top-1 -left-[3px] h-[7px] w-[7px] rounded-full bg-rose-500" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function LegendSwatch({ color, label, hatched }: { color: string; label: string; hatched?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="h-2.5 w-2.5 rounded-sm"
        style={{ backgroundColor: color, backgroundImage: hatched ? PENDING_HATCH : undefined }}
      />
      {label}
    </span>
  )
}

interface RoomRowProps {
  room: Room
  merged: MergedBooking[]
  blackouts: { start: number; end: number }[]
  visibleSlots: VisibleSlot[]
  windowStart: number
  windowEnd: number
  businessDate: string
  nowMin: number
  percentOf: (minutes: number) => number
  slotDuration: number
  /** Where closeTime falls on the axis; everything to its right is after hours. */
  afterHoursPercent: number
}

function RoomRow({
  room,
  merged,
  blackouts,
  visibleSlots,
  windowStart,
  windowEnd,
  businessDate,
  nowMin,
  percentOf,
  slotDuration,
  afterHoursPercent,
}: RoomRowProps) {
  const inactive = room.is_active === false
  // Anything already finished is off the left edge of the window.
  const visibleBookings = merged.filter((block) => block.end > windowStart && block.start < windowEnd)
  const blockColors = assignBlockColors(visibleBookings)
  const inUse = visibleBookings.some((block) => block.start <= nowMin && block.end > nowMin)

  const dotColor = inUse
    ? "bg-rose-500"
    : inactive || isRoomBlackedOutNow(room, businessDate, nowMin)
      ? "bg-slate-400"
      : "bg-emerald-500"

  return (
    <div className="flex border-b border-slate-100 last:border-b-0">
      <div
        className="sticky left-0 z-10 flex flex-shrink-0 items-center gap-2 bg-white px-3"
        style={{ width: ROOM_COL_WIDTH, height: ROW_HEIGHT }}
      >
        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dotColor}`} />
        <span className="truncate text-xs sm:text-sm font-medium text-gray-900" title={room.room_name}>
          {room.room_name}
        </span>
      </div>

      <div className="relative flex-1" style={{ height: ROW_HEIGHT }}>
        {/* Past closeTime the shop is shut and anything here is a session running over.
            Painted first so it sits under the gridlines and every block. */}
        {afterHoursPercent < 100 && (
          <div className="absolute top-0 bottom-0 right-0 bg-slate-100/70" style={{ left: `${afterHoursPercent}%` }} />
        )}

        {/* Slot gridlines - one per slot so they line up with the axis labels above. */}
        {visibleSlots.map((slot, index) => (
          <div
            key={slot.label}
            className={`absolute top-0 bottom-0 border-l ${
              slot.label.endsWith(":00") ? "border-slate-200" : "border-slate-100"
            }`}
            style={{ left: `${(index / visibleSlots.length) * 100}%` }}
          />
        ))}

        {/* Unavailability is the backdrop (z-0); bookings always draw on top of it. A
            room can be switched inactive or blacked out while it still holds bookings,
            and hiding those would make the room look free. */}
        {inactive ? (
          <Block
            left={0}
            width={100}
            color={siteConfig.theme.roomclosed}
            title={`${room.room_name} is set inactive`}
            label="Closed"
          />
        ) : (
          blackouts.map((block) => (
            <Block
              key={`blackout-${block.start}`}
              left={percentOf(block.start)}
              width={percentOf(block.end) - percentOf(block.start)}
              color={siteConfig.theme.roomclosed}
              title={`Blackout in ${room.room_name}`}
              label="Blackout"
            />
          ))
        )}

        {visibleBookings.map((block, index) => {
          const left = percentOf(block.start)
          const width = percentOf(block.end) - left
          const name = block.customerName || "Walk-in"
          const times = `${block.startLabel}-${block.endLabel}`
          const wideEnough = (block.end - block.start) / slotDuration >= SLOTS_FOR_TIME_LABEL

          return (
            <Block
              key={block.ids.join("+")}
              left={left}
              width={width}
              color={blockColors[index]}
              elevated
              hatched={isPending(block.status)}
              title={[name, times, block.status, block.customerPhone].filter(Boolean).join(" · ")}
              label={name}
              sublabel={wideEnough ? times : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}

// Diagonal stripes for a booking that is still unpaid. Colour identifies the customer,
// so "pending" has to be legible without a hue of its own.
const PENDING_HATCH =
  "repeating-linear-gradient(45deg, rgba(255,255,255,0) 0 7px, rgba(255,255,255,0.55) 7px 14px)"

interface BlockProps {
  left: number
  width: number
  color: string
  title: string
  label: string
  sublabel?: string
  elevated?: boolean
  hatched?: boolean
}

function Block({ left, width, color, title, label, sublabel, elevated, hatched }: BlockProps) {
  if (width <= 0) return null

  return (
    <div
      className={`absolute top-1 bottom-1 flex flex-col justify-center overflow-hidden rounded-md px-1.5 ring-1 ring-inset ring-black/10 ${
        elevated ? "z-[1] shadow-sm" : "z-0"
      }`}
      // The 1px inset on each side guarantees a visible seam between two bookings that
      // end and start on the same minute, at any zoom level.
      style={{
        left: `calc(${left}% + 1px)`,
        width: `calc(${width}% - 2px)`,
        backgroundColor: color,
      }}
      title={title}
    >
      {hatched && <span className="pointer-events-none absolute inset-0" style={{ background: PENDING_HATCH }} />}
      <span className="relative truncate text-[11px] sm:text-xs font-medium leading-tight text-slate-900">{label}</span>
      {sublabel && <span className="relative truncate text-[10px] leading-tight text-slate-700">{sublabel}</span>}
    </div>
  )
}

import { NextRequest, NextResponse } from "next/server"
import { readCollection, writeCollection, genId, ok, fail } from "@/lib/mockDb"
import type { Room } from "@/types"

export async function GET() {
  const rooms = readCollection<Room>("rooms")
  return NextResponse.json(ok(rooms))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const input = body.data || body

  const rooms = readCollection<Room>("rooms")
  const newRoom: Room = {
    room_id: genId("room"),
    room_name: input.room_name,
    price_per_half_hour: Number(input.price_per_half_hour) || 0,
    is_active: input.is_active !== undefined ? input.is_active : true,
    features: input.features || [],
    color: input.color || "rgb(150,150,150)",
    display_order: input.display_order ?? null,
    blackout_start_date: input.blackout_start_date || undefined,
    blackout_end_date: input.blackout_end_date || undefined,
    blackout_start_time: input.blackout_start_time || undefined,
    blackout_end_time: input.blackout_end_time || undefined,
  }

  rooms.push(newRoom)
  writeCollection("rooms", rooms)

  return NextResponse.json(ok(newRoom))
}

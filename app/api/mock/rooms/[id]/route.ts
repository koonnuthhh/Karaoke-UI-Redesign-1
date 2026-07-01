import { NextRequest, NextResponse } from "next/server"
import { readCollection, writeCollection, ok, fail } from "@/lib/mockDb"
import type { Room } from "@/types"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const input = body.data || body

  const rooms = readCollection<Room>("rooms")
  const index = rooms.findIndex((r) => r.room_id === id)

  if (index === -1) {
    return NextResponse.json(fail("Room not found"), { status: 404 })
  }

  rooms[index] = { ...rooms[index], ...input, room_id: id }
  writeCollection("rooms", rooms)

  return NextResponse.json(ok(rooms[index]))
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rooms = readCollection<Room>("rooms")
  const index = rooms.findIndex((r) => r.room_id === id)

  if (index === -1) {
    return NextResponse.json(fail("Room not found"), { status: 404 })
  }

  const [removed] = rooms.splice(index, 1)
  writeCollection("rooms", rooms)

  return NextResponse.json(ok(removed))
}

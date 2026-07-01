import { NextRequest, NextResponse } from "next/server"
import { readCollection, ok, fail } from "@/lib/mockDb"
import type { Promotion } from "@/types"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const input = body.data || body
  const { code, roomId } = input || {}

  const promotions = readCollection<Promotion>("promotions")
  const promotion = promotions.find((p) => p.code === String(code).toUpperCase() && p.is_active)

  if (!promotion) {
    return NextResponse.json(fail("Promotion code is invalid"), { status: 400 })
  }

  if (promotion.is_room_specific && promotion.applicable_room_ids?.length && roomId) {
    if (!promotion.applicable_room_ids.includes(roomId)) {
      return NextResponse.json(fail("This promotion is not available for the selected room"), { status: 400 })
    }
  }

  return NextResponse.json(ok({ message: "Promotion code is valid" }))
}

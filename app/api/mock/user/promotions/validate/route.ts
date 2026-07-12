import { NextRequest, NextResponse } from "next/server"
import { readCollection, ok, fail } from "@/lib/mockDb"
import { checkPromotionConditions } from "@/lib/promotion-conditions"
import type { Promotion } from "@/types"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const input = body.data || body
  const { code, roomId, date, time, endTime } = input || {}

  const promotions = readCollection<Promotion>("promotions")
  const promotion = promotions.find((p) => p.code === String(code).toUpperCase())

  if (!promotion) {
    return NextResponse.json(fail("Promotion code is invalid"), { status: 400 })
  }

  const check = checkPromotionConditions(promotion, { date, time, endTime, roomId })
  if (!check.valid) {
    return NextResponse.json(fail(check.message || "Promotion code is invalid"), { status: 400 })
  }

  return NextResponse.json(ok({ message: "Promotion code is valid" }))
}

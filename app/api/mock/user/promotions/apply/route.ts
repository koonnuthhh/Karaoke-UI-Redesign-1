import { NextRequest, NextResponse } from "next/server"
import { readCollection, ok, fail } from "@/lib/mockDb"
import type { Promotion } from "@/types"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const input = body.data || body
  const { code, total_price, roomId } = input || {}

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

  const originalPrice = Number(total_price) || 0
  let discountAmount = 0

  if (promotion.type === "percentage_discount") {
    discountAmount = Math.round((originalPrice * (promotion.discount_percent || 0)) / 100)
  } else if (promotion.type === "flat_discount") {
    discountAmount = promotion.discount_value || 0
  } else if (promotion.type === "buy_x_get_y") {
    discountAmount = 0
  }

  discountAmount = Math.min(discountAmount, originalPrice)
  const finalPrice = originalPrice - discountAmount

  return NextResponse.json(
    ok({
      original_price: originalPrice,
      discount_amount: discountAmount,
      final_price: finalPrice,
      type: promotion.type,
      message: "Promotion applied successfully",
      promotion_id: promotion.id,
    })
  )
}

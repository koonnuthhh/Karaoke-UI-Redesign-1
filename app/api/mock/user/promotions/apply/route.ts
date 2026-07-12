import { NextRequest, NextResponse } from "next/server"
import { readCollection, ok, fail } from "@/lib/mockDb"
import { checkPromotionConditions, getEligiblePriceFraction } from "@/lib/promotion-conditions"
import type { Promotion } from "@/types"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const input = body.data || body
  const { code, total_price, roomId, date, time, endTime } = input || {}

  const promotions = readCollection<Promotion>("promotions")
  const promotion = promotions.find((p) => p.code === String(code).toUpperCase())

  if (!promotion) {
    return NextResponse.json(fail("Promotion code is invalid"), { status: 400 })
  }

  const check = checkPromotionConditions(promotion, { date, time, endTime, roomId })
  if (!check.valid) {
    return NextResponse.json(fail(check.message || "Promotion code is invalid"), { status: 400 })
  }

  const originalPrice = Number(total_price) || 0

  // If the promotion has a daily time window and the booking only partially overlaps
  // it (e.g. promo active 12:00-15:00, booking 14:00-16:00), only the overlapping
  // portion of the price is eligible for the discount - not the whole booking.
  const eligiblePrice = originalPrice * getEligiblePriceFraction(promotion, time, endTime)

  let discountAmount = 0

  if (promotion.type === "percentage_discount") {
    discountAmount = Math.round((eligiblePrice * (promotion.discount_percent || 0)) / 100)
  } else if (promotion.type === "flat_discount") {
    discountAmount = Math.min(promotion.discount_value || 0, eligiblePrice)
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

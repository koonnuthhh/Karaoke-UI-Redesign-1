import { NextRequest, NextResponse } from "next/server"
import { readCollection, writeCollection, genId, ok } from "@/lib/mockDb"
import type { Promotion } from "@/types"

export async function GET() {
  const promotions = readCollection<Promotion>("promotions")
  return NextResponse.json(ok(promotions))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const input = body.data || body

  const promotions = readCollection<Promotion>("promotions")
  const newPromotion: Promotion & { id: string; used_count: number } = {
    id: genId("promo"),
    code: input.code,
    pro_name: input.pro_name,
    description: input.description,
    type: input.type,
    discount_percent: input.discount_percent,
    discount_value: input.discount_value,
    buy_x_hour: input.buy_x_hour,
    get_y_hour: input.get_y_hour,
    start_date: input.start_date,
    end_date: input.end_date,
    start_time: input.start_time,
    end_time: input.end_time,
    is_active: input.is_active !== undefined ? input.is_active : true,
    is_room_specific: input.is_room_specific || false,
    applicable_room_ids: input.applicable_room_ids || [],
    max_usage: input.max_usage,
    used_count: 0,
    created_by: input.created_by,
  }

  promotions.push(newPromotion)
  writeCollection("promotions", promotions)

  return NextResponse.json(ok(newPromotion))
}

import { NextRequest, NextResponse } from "next/server"
import { readCollection, ok, fail } from "@/lib/mockDb"
import type { Promotion } from "@/types"

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const promotions = readCollection<Promotion>("promotions")
  const promotion = promotions.find((p) => p.code === code.toUpperCase())

  if (!promotion) {
    return NextResponse.json(fail("Promotion not found"), { status: 404 })
  }
  return NextResponse.json(ok(promotion))
}

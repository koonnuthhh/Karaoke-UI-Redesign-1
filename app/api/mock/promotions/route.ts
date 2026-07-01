import { NextResponse } from "next/server"
import { readCollection, ok } from "@/lib/mockDb"
import type { Promotion } from "@/types"

export async function GET() {
  const promotions = readCollection<Promotion>("promotions")
  const active = promotions.filter((p) => p.is_active)
  return NextResponse.json(ok(active))
}

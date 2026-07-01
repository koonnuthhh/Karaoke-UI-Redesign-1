import { NextRequest, NextResponse } from "next/server"
import { readCollection, writeCollection, ok, fail } from "@/lib/mockDb"
import type { Promotion } from "@/types"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const promotions = readCollection<any>("promotions")
  const promotion = promotions.find((p) => p.id === id)

  if (!promotion) {
    return NextResponse.json(fail("Promotion not found"), { status: 404 })
  }
  return NextResponse.json(ok(promotion))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const input = body.data || body

  const promotions = readCollection<any>("promotions")
  const index = promotions.findIndex((p) => p.id === id)

  if (index === -1) {
    return NextResponse.json(fail("Promotion not found"), { status: 404 })
  }

  promotions[index] = { ...promotions[index], ...input, id }
  writeCollection("promotions", promotions)

  return NextResponse.json(ok(promotions[index]))
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const promotions = readCollection<any>("promotions")
  const index = promotions.findIndex((p) => p.id === id)

  if (index === -1) {
    return NextResponse.json(fail("Promotion not found"), { status: 404 })
  }

  const [removed] = promotions.splice(index, 1)
  writeCollection("promotions", promotions)

  return NextResponse.json(ok(removed))
}

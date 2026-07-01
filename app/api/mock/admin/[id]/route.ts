import { NextRequest, NextResponse } from "next/server"
import { readCollection, writeCollection, ok, fail } from "@/lib/mockDb"
import type { Admin } from "@/types"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admins = readCollection<Admin>("admins")
  const admin = admins.find((a) => a.admin_id === id)

  if (!admin) {
    return NextResponse.json(fail("Admin not found"), { status: 404 })
  }
  const { password, ...sanitized } = admin
  return NextResponse.json(ok(sanitized))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const input = body.data || body

  const admins = readCollection<Admin>("admins")
  const index = admins.findIndex((a) => a.admin_id === id)

  if (index === -1) {
    return NextResponse.json(fail("Admin not found"), { status: 404 })
  }

  admins[index] = { ...admins[index], ...input, admin_id: id }
  writeCollection("admins", admins)

  const { password, ...sanitized } = admins[index]
  return NextResponse.json(ok(sanitized))
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admins = readCollection<Admin>("admins")
  const index = admins.findIndex((a) => a.admin_id === id)

  if (index === -1) {
    return NextResponse.json(fail("Admin not found"), { status: 404 })
  }

  const [removed] = admins.splice(index, 1)
  writeCollection("admins", admins)

  const { password, ...sanitized } = removed
  return NextResponse.json(ok(sanitized))
}

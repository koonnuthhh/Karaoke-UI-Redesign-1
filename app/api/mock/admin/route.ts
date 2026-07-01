import { NextRequest, NextResponse } from "next/server"
import { readCollection, writeCollection, genId, ok } from "@/lib/mockDb"
import type { Admin } from "@/types"

export async function GET() {
  const admins = readCollection<Admin>("admins")
  const sanitized = admins.map(({ password, ...rest }) => rest)
  return NextResponse.json(ok(sanitized))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const input = body.data || body

  const admins = readCollection<Admin>("admins")
  const newAdmin: Admin = {
    admin_id: genId("admin"),
    name: input.name || input.username,
    username: input.username,
    password: input.password,
    role: input.role || "modulator",
  }

  admins.push(newAdmin)
  writeCollection("admins", admins)

  const { password, ...sanitized } = newAdmin
  return NextResponse.json(ok(sanitized))
}

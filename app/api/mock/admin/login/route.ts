import { NextRequest, NextResponse } from "next/server"
import { readCollection, ok, fail } from "@/lib/mockDb"
import type { Admin } from "@/types"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const input = body.data || body
  const { username, password } = input || {}

  const admins = readCollection<Admin>("admins")
  const admin = admins.find((a) => a.username === username && a.password === password)

  if (!admin) {
    return NextResponse.json(fail("Invalid username or password"), { status: 401 })
  }

  return NextResponse.json(
    ok({
      admin_id: admin.admin_id,
      username: admin.username,
      email: (admin as any).email,
      role: admin.role,
    })
  )
}

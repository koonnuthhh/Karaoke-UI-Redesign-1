import { NextRequest, NextResponse } from "next/server"
import { readCollection, ok, fail } from "@/lib/mockDb"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const users = readCollection<any>("users")
  const user = users.find((u) => u.user_id === id)

  if (!user) {
    return NextResponse.json(fail("User not found"), { status: 404 })
  }
  return NextResponse.json(ok(user))
}

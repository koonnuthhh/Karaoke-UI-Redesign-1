import { NextResponse } from "next/server"

// In-memory storage for maintenance mode (in production, use database)
let maintenanceEnabled = false

export async function GET(request: Request) {
  try {
    return NextResponse.json({
      success: true,
      data: {
        key: "maintenance_enabled",
        value: maintenanceEnabled,
        updated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error fetching maintenance status:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch maintenance status" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { is_enabled } = body.data || body

    if (typeof is_enabled !== "boolean") {
      return NextResponse.json(
        { success: false, message: "is_enabled must be a boolean" },
        { status: 400 }
      )
    }

    maintenanceEnabled = is_enabled

    return NextResponse.json({
      success: true,
      data: {
        key: "maintenance_enabled",
        value: maintenanceEnabled,
        updated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error updating maintenance status:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update maintenance status" },
      { status: 500 }
    )
  }
}

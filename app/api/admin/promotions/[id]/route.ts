import { NextRequest, NextResponse } from "next/server"
import { siteConfig } from "@/config/site-config"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const headers: HeadersInit = {
      apikey: `${process.env.API_KEY}`,
      "Content-Type": "application/json"
    }

    // Forward admin headers if present
    const adminId = req.headers.get("X-Admin-ID")
    const adminUsername = req.headers.get("X-Admin-Username")
    if (adminId) headers["X-Admin-ID"] = adminId
    if (adminUsername) headers["X-Admin-Username"] = adminUsername

    const res = await fetch(`${siteConfig.api.baseURL}/admin/promotions/${id}`, {
      method: "GET",
      headers
    })

    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { success: false, message: text || "Invalid response from server" },
        { status: res.status }
      )
    }

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching promotion:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch promotion" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await params in Next.js 15+
    const { id: paramId } = await params
    const body = await req.json()
    // Try to get ID from URL params first, fallback to body.data.id if params are undefined
    let id = paramId || body.data?.id || body.id

    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: "Promotion ID is required (not found in URL or request body)" } },
        { status: 400 }
      )
    }

    const adminId = req.headers.get("X-Admin-ID")
    const adminUsername = req.headers.get("X-Admin-Username")

    // Validate admin - use fallback from body if header is missing
    const finalAdminId = adminId || body.admin_id || body.data?.admin_id
    if (!finalAdminId) {
      return NextResponse.json(
        { success: false, error: { message: "Admin ID is required. Please login again." } },
        { status: 401 }
      )
    }

    // Extract the actual data - could be wrapped in 'data' or at top level
    const promotionData = body.data || body

    // Filter and map to correct backend field names
    const cleanedData: any = {
      id: id,
      promotion_id: id,
      code: promotionData.code,
      pro_name: promotionData.pro_name || promotionData.name,
      description: promotionData.description,
      type: promotionData.type,
      discount_percent: promotionData.discount_percent,
      discount_value: promotionData.discount_value,
      buy_x_hour: promotionData.buy_x_hour,
      get_y_hour: promotionData.get_y_hour,
      start_date: promotionData.start_date,
      end_date: promotionData.end_date,
      start_time: promotionData.start_time,
      end_time: promotionData.end_time,
      max_usage: promotionData.max_usage || promotionData.maxUses,
      is_active: promotionData.is_active !== undefined ? promotionData.is_active : promotionData.isActive,
      is_room_specific: promotionData.is_room_specific || false,
      applicable_room_ids: promotionData.applicable_room_ids || [],
    }

    // Remove undefined fields
    Object.keys(cleanedData).forEach(
      key => cleanedData[key] === undefined && delete cleanedData[key]
    )

    // Explicitly ensure admin_id is in the data (like DELETE does)
    cleanedData.admin_id = finalAdminId
    cleanedData.requesting_admin_id = finalAdminId

    // Match the DELETE handler structure - include id at top level and in data
    const requestBody = {
      id: id,
      promotion_id: id,
      data: cleanedData,
    }

    const headers: HeadersInit = {
      apikey: `${process.env.API_KEY}`,
      "Content-Type": "application/json"
    }

    // Always forward admin headers if present
    if (finalAdminId) {
      headers["X-Admin-ID"] = finalAdminId
    }
    if (adminUsername) {
      headers["X-Admin-Username"] = adminUsername
    }

    const backendUrl = `${siteConfig.api.baseURL}/admin/promotions/${id}`

    const res = await fetch(backendUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(requestBody)
    })

    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { success: false, message: text || "Invalid response from server" },
        { status: res.status }
      )
    }

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to update promotion" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: paramId } = await params
    const body = await req.json()
    // Try to get ID from URL params first, fallback to body if params are undefined
    let id = paramId || body.data?.id || body.id

    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: "Promotion ID is required (not found in URL or request body)" } },
        { status: 400 }
      )
    }

    const adminId = req.headers.get("X-Admin-ID")
    const adminUsername = req.headers.get("X-Admin-Username")

    // Validate admin - use fallback from body if header is missing
    const finalAdminId = adminId || body.admin_id || body.data?.admin_id
    if (!finalAdminId) {
      return NextResponse.json(
        { success: false, error: { message: "Admin ID is required. Please login again." } },
        { status: 401 }
      )
    }

    const headers: HeadersInit = {
      apikey: `${process.env.API_KEY}`,
      "Content-Type": "application/json"
    }

    // Forward admin headers if present
    if (finalAdminId) {
      headers["X-Admin-ID"] = finalAdminId
    }
    if (adminUsername) {
      headers["X-Admin-Username"] = adminUsername
    }

    // Send minimal request body with admin credentials and ID at both levels
    const requestBody = {
      id: id,
      promotion_id: id,
      data: {
        id: id, // Include the promotion ID
        promotion_id: id, // Also try promotion_id
        admin_id: finalAdminId,
      }
    }

    const backendUrl = `${siteConfig.api.baseURL}/admin/promotions/${id}`

    const res = await fetch(backendUrl, {
      method: "DELETE",
      headers,
      body: JSON.stringify(requestBody)
    })

    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      if (!res.ok) {
        return NextResponse.json(
          { success: false, message: text || "Failed to delete promotion" },
          { status: res.status }
        )
      }
      return NextResponse.json({ success: true })
    }

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to delete promotion" },
      { status: 500 }
    )
  }
}

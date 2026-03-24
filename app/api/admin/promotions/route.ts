import { NextRequest, NextResponse } from "next/server"
import { siteConfig } from "@/config/site-config"

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${siteConfig.api.baseURL}/admin/promotions`, {
      method: "GET",
      headers: {
        apikey: `${process.env.API_KEY}`,
        "Content-Type": "application/json"
      }
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

    // Convert time format from HH:MM:SS to HH:MM for time inputs
    const formatTimeForInput = (time: string | undefined) => {
      if (!time) return undefined
      return time.substring(0, 5) // Take first 5 chars: HH:MM
    }

    // Map backend field names to frontend field names
    const mapPromotionData = (promo: any) => {
      // Ensure we have an ID - check multiple possible field names
      const promotionId = promo.id || promo._id || promo.promotion_id || promo.code

      // Determine discount value based on type
      let discountValue = 0
      if (promo.type === "percentage_discount") {
        discountValue = promo.discount_percent || 0
      } else if (promo.type === "flat_discount") {
        discountValue = promo.discount_value || 0
      } else if (promo.type === "buy_x_get_y") {
        discountValue = promo.buy_x_hour || 0
      }

      const mapped = {
        id: promotionId,
        code: promo.code,
        name: promo.pro_name || promo.name || "",
        pro_name: promo.pro_name || promo.name || "",
        description: promo.description || "",
        type: promo.type || "percentage_discount",
        discountType: promo.type || "percentage_discount",
        discount: discountValue,
        discount_percent: promo.discount_percent,
        discount_value: promo.discount_value,
        buy_x_hour: promo.buy_x_hour,
        get_y_hour: promo.get_y_hour,
        startDate: promo.start_date || "",
        start_date: promo.start_date || "",
        endDate: promo.end_date || "",
        end_date: promo.end_date || "",
        startTime: formatTimeForInput(promo.start_time) || "",
        start_time: promo.start_time,
        endTime: formatTimeForInput(promo.end_time) || "",
        end_time: promo.end_time,
        isActive: promo.is_active !== undefined ? promo.is_active : true,
        is_active: promo.is_active !== undefined ? promo.is_active : true,
        maxUses: promo.max_usage || 0,
        max_usage: promo.max_usage,
        is_room_specific: promo.is_room_specific || false,
        created_by: promo.created_by,
      }

      return mapped
    }

    // Get promotions array from response
    let promotions: any[] = []
    if (data.data) {
      if (Array.isArray(data.data)) {
        promotions = data.data
      } else {
        promotions = [data.data]
      }
    } else if (Array.isArray(data)) {
      promotions = data
    }

    // Map all promotions
    const mappedPromotions = promotions.map(mapPromotionData)

    return NextResponse.json({
      success: true,
      data: mappedPromotions
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch promotions" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    const adminId = req.headers.get("X-Admin-ID")
    const adminUsername = req.headers.get("X-Admin-Username")
    
    // Validate that admin_id is provided
    const finalAdminId = adminId || body.admin_id || body.data?.admin_id
    if (!finalAdminId) {
      return NextResponse.json(
        { success: false, error: { message: "Admin ID is required. Please login again." } },
        { status: 401 }
      )
    }
    
    // Extract the actual data - could be wrapped in 'data' or at top level
    const promotionData = body.data || body
    
    // Filter out invalid fields and map to correct backend field names
    // Only include fields that the backend actually expects
    const cleanedData: any = {
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
      created_by: finalAdminId,
    }

    // Remove undefined fields
    Object.keys(cleanedData).forEach(
      key => cleanedData[key] === undefined && delete cleanedData[key]
    )
    
    // Explicitly ensure admin_id is in the data (like PUT does)
    cleanedData.admin_id = finalAdminId
    cleanedData.requesting_admin_id = finalAdminId
    
    // Match the PUT/DELETE handler structure - include admin_id at top level
    const requestBody = {
      admin_id: finalAdminId,
      requesting_admin_id: finalAdminId,
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

    const backendUrl = `${siteConfig.api.baseURL}/admin/promotions`
    
    const res = await fetch(backendUrl, {
      method: "POST",
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
      { success: false, message: "Failed to create promotion" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const url = new URL(req.url)
    
    // Extract ID from path /api/admin/promotions/[id] or query parameter ?id=
    const pathParts = url.pathname.split('/')
    let id: string | null = pathParts[pathParts.length - 1]
    
    if (!id || id === 'api' || id === 'admin' || id === 'promotions') {
      id = url.searchParams.get("id")
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      )
    }

    const adminId = req.headers.get("X-Admin-ID")
    const adminUsername = req.headers.get("X-Admin-Username")

    console.log("[PUT /api/admin/promotions/" + id + "]")
    console.log("Admin headers received:", { adminId, adminUsername })
    console.log("Request body:", body)

    // Validate that admin_id is provided
    if (!adminId) {
      console.error("Missing Admin ID in headers")
      return NextResponse.json(
        { success: false, error: { message: "Admin ID is required. Please login again." } },
        { status: 401 }
      )
    }

    // Extract the actual data - could be wrapped in 'data' or at top level
    const promotionData = body.data || body
    
    // Filter out invalid fields and map to correct backend field names
    // Only include fields that the backend actually expects
    const cleanedData: any = {
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
    }

    // Remove undefined fields
    Object.keys(cleanedData).forEach(
      key => cleanedData[key] === undefined && delete cleanedData[key]
    )
    
    // Send cleaned data to backend
    const requestBody = {
      data: cleanedData,
    }

    const headers: HeadersInit = {
      apikey: `${process.env.API_KEY}`,
      "Content-Type": "application/json"
    }

    // Always forward admin headers if present
    if (adminId) {
      headers["X-Admin-ID"] = adminId
      console.log("Adding X-Admin-ID header:", adminId)
    }
    if (adminUsername) {
      headers["X-Admin-Username"] = adminUsername
      console.log("Adding X-Admin-Username header:", adminUsername)
    }

    console.log("Headers being sent to backend:", headers)
    const backendUrl = `${siteConfig.api.baseURL}/admin/promotions/${id}`
    console.log("Backend URL:", backendUrl)
    console.log("Request body going to backend:", requestBody)

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
      console.log("Failed to parse response as JSON:", text)
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
    console.error("Error updating promotion:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update promotion" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const url = new URL(req.url)
    
    // Extract ID from path /api/admin/promotions/[id] or query parameter ?id=
    const pathParts = url.pathname.split('/')
    let id: string | null = pathParts[pathParts.length - 1]
    
    if (!id || id === 'api' || id === 'admin' || id === 'promotions') {
      id = url.searchParams.get("id")
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      )
    }

    const adminId = req.headers.get("X-Admin-ID")
    const adminUsername = req.headers.get("X-Admin-Username")

    console.log("[DELETE /api/admin/promotions/" + id + "]")
    console.log("Admin headers received:", { adminId, adminUsername })

    // Validate that admin_id is provided
    if (!adminId) {
      console.error("Missing Admin ID in headers for DELETE")
      return NextResponse.json(
        { success: false, error: { message: "Admin ID is required. Please login again." } },
        { status: 401 }
      )
    }

    // Extract the actual data - could be wrapped in 'data' or at top level
    const promotionData = body.data || body
    
    // Send admin_id inside data object for DELETE
    // The backend API expects 'admin_id' field for delete operations
    const requestBody = {
      data: {
        ...promotionData,
        admin_id: adminId,
      },
    }

    const headers: HeadersInit = {
      apikey: `${process.env.API_KEY}`,
      "Content-Type": "application/json"
    }

    // Always forward admin headers if present
    if (adminId) {
      headers["X-Admin-ID"] = adminId
      console.log("Adding X-Admin-ID header:", adminId)
    }
    if (adminUsername) {
      headers["X-Admin-Username"] = adminUsername
      console.log("Adding X-Admin-Username header:", adminUsername)
    }

    console.log("Headers being sent to backend:", headers)
    const backendUrl = `${siteConfig.api.baseURL}/admin/promotions/${id}`
    console.log("Backend URL:", backendUrl)

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
      console.log("Response not JSON:", text)
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
    console.error("Error deleting promotion:", error)
    return NextResponse.json(
      { success: false, message: "Failed to delete promotion" },
      { status: 500 }
    )
  }
}

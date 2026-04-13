import type { AdminUser } from "@/types"

const API_URL = process.env.NEXT_PUBLIC_API_PATH || ""
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || ""

export const getAdminUser = (): AdminUser | null => {
  if (typeof window === "undefined") return null
  const user = localStorage.getItem("adminUser")
  return user ? JSON.parse(user) : null
}

export const setAdminUser = (user: AdminUser) => {
  if (typeof window === "undefined") return
  localStorage.setItem("adminUser", JSON.stringify(user))
}

export const clearAdminUser = () => {
  if (typeof window === "undefined") return
  localStorage.removeItem("adminUser")
}

/**
 * Admin login - authenticate with username and password
 */
export const loginAdmin = async (username: string, password: string) => {
  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          username,
          password,
        },
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || { message: "Login failed" },
      }
    }

    // Store admin data
    if (data.data) {
      const adminData: AdminUser = {
        admin_id: data.data.admin_id,
        username: data.data.username,
        email: data.data.email,
        role: data.data.role,
        login_time: data.data.login_time,
      }
      setAdminUser(adminData)
    }

    return data
  } catch (error: any) {
    console.error("Login error:", error)
    return {
      success: false,
      error: { message: error.message || "Login failed" },
    }
  }
}

/**
 * Logout admin - clear stored user data
 */
export const logoutAdmin = () => {
  clearAdminUser()
}

/**
 * Generic function to make admin API requests
 */
async function makeAdminRequest(
  method: "get" | "post" | "put" | "delete",
  endpoint: string,
  data?: any
) {
  const adminUser = getAdminUser()

  if (!adminUser) {
    throw new Error("No admin logged in. Please login first.")
  }

  if (!adminUser.admin_id) {
    throw new Error("Admin ID not found in session. Please login again.")
  }

  try {
    const config: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Admin-ID": adminUser.admin_id,
        "X-Admin-Username": adminUser.username,
      },
    }

    if (method === "get") {
      // For GET requests, pass data as query params
      const query = new URLSearchParams(data || {})
      const queryString = query.toString()
      const url = queryString ? `${endpoint}?${queryString}` : endpoint
      const response = await fetch(url, config)
      return await response.json()
    } else {
      // For POST, PUT, DELETE, include admin_id in request body
      const requestBody = {
        admin_id: adminUser.admin_id,
        requesting_admin_id: adminUser.admin_id,
        data: {
          ...data,
          admin_id: adminUser.admin_id,
          requesting_admin_id: adminUser.admin_id,
        },
      }
      config.body = JSON.stringify(requestBody)
      console.log("Request body:", requestBody)
      console.log("Full request body JSON:", JSON.stringify(requestBody, null, 2))
      console.log("Data object keys:", Object.keys(requestBody.data))
      console.log("Data.applicable_room_ids value:", requestBody.data.applicable_room_ids)
      console.log("Data.id value:", requestBody.data.id)
      console.log("=== ABOUT TO SEND FETCH ===")
      console.log("config.body being sent:", config.body)
      console.log("config.body parsed:", JSON.parse(config.body))
      const response = await fetch(endpoint, config)
      console.log("=== FETCH RESPONSE RECEIVED ===")
      const responseData = await response.json()
      console.log(`Response status: ${response.status}`, responseData)
      if (!response.ok) {
        console.error("API Error:", responseData)
        // Enhanced error message from backend
        if (responseData.error?.message) {
          throw new Error(responseData.error.message)
        }
        if (responseData.message) {
          throw new Error(responseData.message)
        }
      }
      return responseData
    }
  } catch (error: any) {
    console.error("Admin request error:", error)
    throw error
  }
}

// Admin Management API Methods
export const adminAPI = {
  // Admin Authentication
  login: (username: string, password: string) => loginAdmin(username, password),
  logout: () => logoutAdmin(),

  // Admin Management
  createAdmin: (adminData: any) =>
    makeAdminRequest("post", "/api/admin", adminData),
  updateAdmin: (adminId: string, adminData: any) =>
    makeAdminRequest("put", `/api/admin/${adminId}`, adminData),
  deleteAdmin: (adminId: string) =>
    makeAdminRequest("delete", `/api/admin/${adminId}`, { id: adminId }),
  getAdmin: (adminId: string) =>
    makeAdminRequest("get", `/api/admin/${adminId}`),
  getAllAdmins: () => makeAdminRequest("get", "/api/admin"),

  // Room Management
  createRoom: (roomData: any) =>
    makeAdminRequest("post", "/api/admin/rooms", roomData),
  updateRoom: (roomId: string, roomData: any) =>
    makeAdminRequest("put", `/api/admin/rooms/${roomId}`, roomData),
  deleteRoom: (roomId: string) =>
    makeAdminRequest("delete", `/api/admin/rooms/${roomId}`, { id: roomId }),
  getRoom: (roomId: string) =>
    makeAdminRequest("get", `/api/admin/rooms/${roomId}`),
  getAllRooms: () => makeAdminRequest("get", "/api/admin/rooms"),

  // Promotion Management
  createPromotion: (promotionData: any) =>
    makeAdminRequest("post", "/api/admin/promotions", promotionData),
  updatePromotion: (promotionId: string, promotionData: any) =>
    makeAdminRequest("put", `/api/admin/promotions/${promotionId}`, promotionData),
  deletePromotion: (promotionId: string) =>
    makeAdminRequest("delete", `/api/admin/promotions/${promotionId}`, { id: promotionId }),
  getPromotion: (promotionId: string) =>
    makeAdminRequest("get", `/api/admin/promotions/${promotionId}`),
  getAllPromotions: () => makeAdminRequest("get", "/api/admin/promotions"),
}

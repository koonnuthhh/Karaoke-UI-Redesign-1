import { siteConfig } from "../config/site-config"
import type { BookingRequest, ScheduleData } from "../types"

class ApiClient {
  private baseUrl: string
  private timeout: number

  constructor() {
    this.baseUrl = ""
    this.timeout = siteConfig.api.timeout
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const config: RequestInit = {
      headers: {
        apikey: `${typeof window === 'undefined' ? process.env.API_KEY : ''}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        // Try to extract error message from response body
        let errorMessage = `API Error: ${response.status} ${response.statusText}`
        try {
          const errorBody = await response.json()
          if (errorBody.error) {
            errorMessage = errorBody.error
          }
        } catch {
          // If parsing fails, use the default error message
        }
        throw new Error(errorMessage)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error) {
        throw new Error(`Network Error: ${error.message}`)
      }
      throw new Error("Unknown API Error")
    }
  }

  async getSchedule(date: string, adminId?: string): Promise<ScheduleData> {
    const headers: Record<string, string> = {}
    if (adminId) {
      headers["X-Admin-ID"] = adminId
    }
    return this.request<ScheduleData>(`/api/schedule?date=${date}`, { headers })
  }
}

export const apiClient = new ApiClient()

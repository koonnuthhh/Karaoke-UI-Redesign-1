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
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
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

  async getSchedule(date: string): Promise<ScheduleData> {
    return this.request<ScheduleData>(`${siteConfig.api.endpoints.schedule}?date=${date}`)
  }
}

export const apiClient = new ApiClient()

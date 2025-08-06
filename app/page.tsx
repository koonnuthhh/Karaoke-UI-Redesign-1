"use client"

import { useState, useEffect } from "react"
import { siteConfig } from "../config/site-config"
import type { ScheduleData } from "../types"
import { apiClient } from "../lib/api-client"
import { ScheduleTable } from "../components/schedule-table"
import { DateSelector } from "../components/date-selector"

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchSchedule = async () => {
    if (!selectedDate) return
    setIsLoading(true)
    setError("")

    try {
      const data = await apiClient.getSchedule(selectedDate)
      setScheduleData(data)
    } catch (err) {
      setError("Failed to load schedule. Please try again.")
      console.error("Schedule fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    setSelectedDate(today)
  }, [])

  //Refresh function
  const handleRefresh = () => {
    fetchSchedule()
  }

  useEffect(() => {

    fetchSchedule()
  }, [selectedDate])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{siteConfig.business.name}</h1>
            <p className="text-lg text-gray-600">{siteConfig.business.tagline}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        {/* <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{siteConfig.content.hero.title}</h2>
          <p className="text-gray-600 mb-6">{siteConfig.content.hero.subtitle}</p>
        </div> */}

        {/* Date Selector */}
        <div className="flex items-center justify-between mb-2">
          <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2  font-semibold rounded-md shadow transition-colors"
            style={{
              backgroundColor: siteConfig.theme.secondary,
              color: "#fff",
              border: "none"
            }}
            disabled={isLoading}
          >
            {/* Refresh Icon */}
            {/* <svg
              className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5a1 1 0 001 1h5M20 20v-5a1 1 0 00-1-1h-5M17.657 6.343A8 8 0 106.343 17.657"
              />
            </svg> */}
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-center">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 mx-auto block px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Schedule Table */}
        {scheduleData && <ScheduleTable scheduleData={scheduleData} isLoading={isLoading} handleRefresh={handleRefresh} />}

        {/* Business Info */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Get in Touch</h4>
              <div className="space-y-2 text-gray-600">
                <p>📞 {siteConfig.business.phone}</p>
                <p>✉️ {siteConfig.business.email}</p>
                <p>📍 {siteConfig.business.address}</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Business Hours</h4>
              <div className="space-y-1 text-sm text-gray-600">
                {Object.entries(siteConfig.businessHours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between">
                    <span className="capitalize">{day}:</span>
                    <span>{hours.closed ? "Closed" : `${hours.open} - ${hours.close}`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

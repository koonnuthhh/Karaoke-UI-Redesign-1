"use client"

import { useState, useEffect } from "react"
import { siteConfig } from "../config/site-config"
import type { ScheduleData } from "../types"
import { apiClient } from "../lib/api-client"
import { ScheduleTable } from "../components/schedule-table"
import { DateSelector } from "../components/date-selector"
import { useRouter } from "next/navigation"

export default function HomePage(
  { adminCredential = null }: { adminCredential: string | null }
) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  // New state to manage admin status

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    setSelectedDate(today)
    //console.log("today: ",today)
  }, [])
 

  //Use for fetch data everytime the date change
  useEffect(() => {
    fetchSchedule()
  }, [selectedDate])


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



  //Refresh function
  const handleRefresh = () => {
    fetchSchedule()
  }

  // Handle logout function
  const handleLogout = () => {
    // Implement actual logout logic here (e.g., clear token, redirect)
    console.log("Admin user logged out.")
    // For this example, we'll just redirect to the homepage.
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center text-center">
            <div className="flex-grow">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{siteConfig.business.name}</h1>
              <p className="text-lg text-gray-600">{siteConfig.business.tagline}</p>
            </div>
            {adminCredential && (
              <button
                onClick={handleLogout}
                className="px-4 py-2 font-semibold text-white rounded-md shadow transition-colors"
                style={{
                  backgroundColor: "#dc2626", // A nice red for logout
                  border: "none",
                }}
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Selector */}
        <div className="flex items-center justify-between mb-2">
          <DateSelector selectedDate={selectedDate ?? ""} onDateChange={setSelectedDate} />
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 font-semibold rounded-md shadow transition-colors"
            style={{
              backgroundColor: siteConfig.theme.secondary,
              color: "#fff",
              border: "none",
            }}
            disabled={isLoading}
          >
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
        {scheduleData && <ScheduleTable scheduleData={scheduleData} isLoading={isLoading} handleRefresh={handleRefresh} adminCredential ={adminCredential}/>}

        {/* Business Info - Only show if the user is NOT an admin */}
        {!adminCredential && (
          <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Get in Touch</h4>
                <div className="space-y-2 text-gray-600">
                  <p>IG: {siteConfig.business.IG}</p>
                  <p>Facebook: {siteConfig.business.facebook}</p>
                  <p>📍 {siteConfig.business.address}</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Opening Hours</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  {Object.entries(siteConfig.Open_hour).map(([day, hours]) => (
                    <div key={day} className="flex justify-between">
                      <span className="capitalize">{day}:</span>
                      <span>{hours.closed ? "Closed" : `${hours.open} - ${hours.close}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

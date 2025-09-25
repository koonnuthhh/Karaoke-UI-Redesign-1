"use client"

import { useState, useEffect } from "react"
import { siteConfig } from "config/site-config"
import { Calendar } from "lucide-react"

interface DateSelectorProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const [currentDate, setCurrentDate] = useState<string>("")
  const [maxDate, setMaxDate] = useState<string>("")

  // Update dates dynamically
  useEffect(() => {
    const updateDates = () => {
      const now = new Date()
      const today = now.toISOString().split("T")[0]
      
      // Calculate max date from current date
      const maxDateCalc = new Date()
      maxDateCalc.setDate(maxDateCalc.getDate() + siteConfig.schedule.maximumPrebook)
      const maxDateString = maxDateCalc.toISOString().split("T")[0]
      
      setCurrentDate(today)
      setMaxDate(maxDateString)
    }

    // Initial update
    updateDates()

    // Update every minute to catch date changes
    const interval = setInterval(updateDates, 60000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-3">
      <Calendar className="w-5 h-5 text-purple-600" />
      <label htmlFor="date-select" className="text-sm font-medium text-gray-700">
        Select Date:
      </label>
      <input
        id="date-select"
        type="date"
        value={selectedDate ?? ""}
        min={currentDate}
        max={maxDate}
        onChange={(e) => onDateChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
      />
    </div>
  )
}

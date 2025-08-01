"use client"

import { siteConfig } from "config/site-config"
import { Calendar } from "lucide-react"

interface DateSelectorProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const today = new Date().toISOString().split("T")[0]
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + siteConfig.schedule.maximumPrebook)
  const maxDateString = maxDate.toISOString().split("T")[0]

  return (
    <div className="flex items-center gap-3 mb-6">
      <Calendar className="w-5 h-5 text-purple-600" />
      <label htmlFor="date-select" className="text-sm font-medium text-gray-700">
        Select Date:
      </label>
      <input
        id="date-select"
        type="date"
        value={selectedDate}
        min={today}
        max={maxDateString}
        onChange={(e) => onDateChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
      />
    </div>
  )
}

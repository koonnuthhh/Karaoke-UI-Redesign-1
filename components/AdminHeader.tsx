"use client"

import { LogOut } from "lucide-react"
import { getAdminUser } from "@/lib/admin-service"

interface AdminHeaderProps {
  onLogout: () => void
}

export function AdminHeader({ onLogout }: AdminHeaderProps) {
  const adminUser = getAdminUser()

  if (!adminUser) return null

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-row items-center justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-shrink-0">
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900">Admin Panel</h1>
          <p className="text-xs sm:text-sm text-slate-600">Alurfia Karaoke Management</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0">
          <div className="text-right">
            <p className="font-semibold text-sm sm:text-base text-slate-900">{adminUser.username}</p>
            <div className="flex items-center gap-1 sm:gap-2 justify-end">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              <p className="text-xs text-slate-600 capitalize">{adminUser.role}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition whitespace-nowrap flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}

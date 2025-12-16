"use client"

import { Users, DoorOpen, Gift, Plus } from "lucide-react"
import type { Admin, Room, Promotion } from "@/types"

interface OverallDashboardProps {
  admins: Admin[]
  rooms: Room[]
  promotions: Promotion[]
  onNavigateToAdmins: () => void
  onNavigateToRooms: () => void
}

export function OverallDashboard({
  admins,
  rooms,
  promotions,
  onNavigateToAdmins,
  onNavigateToRooms,
}: OverallDashboardProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Welcome to Admin Dashboard</h2>
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Admins</p>
              <p className="text-3xl font-bold text-gray-900">{admins.length}</p>
            </div>
            <Users className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Rooms</p>
              <p className="text-3xl font-bold text-gray-900">{rooms.length}</p>
            </div>
            <DoorOpen className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Promotions</p>
              <p className="text-3xl font-bold text-gray-900">{promotions.length}</p>
            </div>
            <Gift className="w-12 h-12 text-purple-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div>
            <p className="text-gray-600 text-sm">Quick Actions</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={onNavigateToAdmins}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                + Admin
              </button>
              <button
                onClick={onNavigateToRooms}
                className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
              >
                + Room
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

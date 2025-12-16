"use client"

import { useState } from "react"
import { Edit, Trash2, Plus, AlertCircle } from "lucide-react"
import type { Room } from "@/types"

interface RoomsTabProps {
  rooms: Room[]
  dataLoading: boolean
  adminCredential: string | null
  onRefresh: () => void
}

export function RoomsTab({ rooms, dataLoading, adminCredential, onRefresh }: RoomsTabProps) {
  const [modalOpen, setModalOpen] = useState<"create" | "edit" | "delete" | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [formData, setFormData] = useState<Partial<Room>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleCreateRoom = async () => {
    try {
      setIsSubmitting(true)
      setError("")
      const res = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })
      
      const data = await res.json()
      if (res.ok) {
        setModalOpen(null)
        setFormData({})
        onRefresh()
      } else {
        setError(data.message || "Failed to create room")
      }
    } catch (err) {
      setError("Network error while creating room")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateRoom = async () => {
    try {
      setIsSubmitting(true)
      setError("")
      const res = await fetch(`/api/admin/rooms/${selectedRoom?.room_id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })
      
      const data = await res.json()
      if (res.ok) {
        setModalOpen(null)
        setFormData({})
        setSelectedRoom(null)
        onRefresh()
      } else {
        setError(data.message || "Failed to update room")
      }
    } catch (err) {
      setError("Network error while updating room")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRoom = async () => {
    try {
      setIsSubmitting(true)
      setError("")
      const res = await fetch(`/api/admin/rooms/${selectedRoom?.room_id}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json"
        }
      })
      
      const data = await res.json()
      if (res.ok) {
        setModalOpen(null)
        setSelectedRoom(null)
        onRefresh()
      } else {
        setError(data.message || "Failed to delete room")
      }
    } catch (err) {
      setError("Network error while deleting room")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Manage Rooms</h2>
          <button
            onClick={() => {
              setModalOpen("create")
              setSelectedRoom(null)
              setFormData({})
              setError("")
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Plus className="w-4 h-4" /> Create Room
          </button>
        </div>

        {dataLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Room Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Capacity</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Price/30min</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Array.isArray(rooms) ? rooms.map((room) => (
                  <tr key={room.room_id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{room.room_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{room.capacity}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">฿{room.price_per_half_hour}</td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => {
                          setSelectedRoom(room)
                          setFormData(room)
                          setModalOpen("edit")
                          setError("")
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRoom(room)
                          setModalOpen("delete")
                          setError("")
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr key="no-rooms">
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No rooms found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Room Modal */}
      {(modalOpen === "create" || modalOpen === "edit") && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {modalOpen === "create" ? "Create New Room" : "Edit Room"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                <input
                  type="text"
                  value={formData.room_name || ""}
                  onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input
                  type="text"
                  value={formData.capacity || ""}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per 30 min</label>
                <input
                  type="number"
                  value={formData.price_per_half_hour || ""}
                  onChange={(e) => setFormData({ ...formData, price_per_half_hour: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Features (comma separated)</label>
                <input
                  type="text"
                  value={Array.isArray(formData.features) ? formData.features.join(", ") : ""}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value.split(",").map(f => f.trim()) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setModalOpen(null)
                  setFormData({})
                  setError("")
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={modalOpen === "create" ? handleCreateRoom : handleUpdateRoom}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : modalOpen === "create" ? "Create" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalOpen === "delete" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-bold text-gray-900">Delete Room</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this room? This action cannot be undone.</p>
            {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalOpen(null)
                  setSelectedRoom(null)
                  setError("")
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRoom}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

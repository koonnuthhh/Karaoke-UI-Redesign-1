"use client"

import { useState } from "react"
import { Edit, Trash2, Plus, AlertCircle, X } from "lucide-react"
import { adminAPI, getAdminUser } from "@/lib/admin-service"
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
      
      const adminUser = getAdminUser()
      if (!adminUser) {
        setError("Authentication required. Please login again.")
        return
      }

      const result = await adminAPI.createRoom(formData)
      
      if (result.success || result.data) {
        setModalOpen(null)
        setFormData({})
        onRefresh()
      } else {
        setError(result.message || result.error?.message || "Failed to create room")
      }
    } catch (err: any) {
      setError(err.message || "Error creating room")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateRoom = async () => {
    try {
      setIsSubmitting(true)
      setError("")
      
      const adminUser = getAdminUser()
      if (!adminUser) {
        setError("Authentication required. Please login again.")
        return
      }

      if (!selectedRoom?.room_id) {
        setError("Invalid room ID")
        return
      }

      const result = await adminAPI.updateRoom(selectedRoom.room_id, formData)
      
      if (result.success || result.data) {
        setModalOpen(null)
        setFormData({})
        setSelectedRoom(null)
        onRefresh()
      } else {
        setError(result.message || result.error?.message || "Failed to update room")
      }
    } catch (err: any) {
      setError(err.message || "Error updating room")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRoom = async () => {
    const adminUser = getAdminUser()
    if (!adminUser) {
      setError("Authentication required. Please login again.")
      return
    }

    if (!selectedRoom?.room_id) {
      setError("Invalid room ID. Please try again.")
      return
    }

    try {
      setIsSubmitting(true)
      setError("")
      
      const result = await adminAPI.deleteRoom(selectedRoom.room_id)
      
      if (result.success || result.data) {
        setModalOpen(null)
        setSelectedRoom(null)
        onRefresh()
      } else {
        const message = result.message || result.error?.message || "Failed to delete room"
        setError(message === "NOT_FOUND" ? "Room not found or already deleted" : message)
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Manage Rooms</h2>
          {getAdminUser()?.role === "admin" && (
            <button
              onClick={() => {
                setModalOpen("create")
                setSelectedRoom(null)
                setFormData({})
                setError("")
              }}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white text-sm sm:text-base rounded-md hover:bg-green-700 transition w-full sm:w-auto justify-center sm:justify-start"
            >
              <Plus className="w-4 h-4" /> Create Room
            </button>
          )}
        </div>

        {dataLoading ? (
          <div className="text-center py-8 text-sm text-gray-600">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Room Name</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Price/30min</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Active</th>
                    <th className="px-3 sm:px-6 py-3 text-right text-xs sm:text-sm font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Array.isArray(rooms) ? rooms.map((room) => (
                    <tr key={room.room_id}>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900">{room.room_name}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600">฿{room.price_per_half_hour}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm">
                        <span className={`px-2 py-1 rounded text-white text-xs font-medium ${room.is_active ? 'bg-green-500' : 'bg-gray-500'}`}>
                          {room.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-right text-xs sm:text-sm">
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
                      {getAdminUser()?.role === "admin" && (
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
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr key="no-rooms">
                    <td colSpan={4} className="px-3 sm:px-6 py-2 sm:py-4 text-center text-xs sm:text-sm text-gray-500">
                      No rooms found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Room Modal */}
      {(modalOpen === "create" || modalOpen === "edit") && (() => {
        const currentAdmin = getAdminUser()
        const isAuthorized = currentAdmin?.role === "admin"
        const isCreateMode = modalOpen === "create"
        
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                {isCreateMode ? "Create New Room" : "Edit Room"}
              </h3>
              <button
                onClick={() => {
                  setModalOpen(null)
                  setFormData({})
                  setSelectedRoom(null)
                  setError("")
                }}
                className="text-gray-500 hover:text-gray-700 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {!isCreateMode && !isAuthorized && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 sm:p-3 mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-yellow-800">You don't have permission to edit this room. Viewing in read-only mode.</p>
              </div>
            )}
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Room Name</label>
                <input
                  type="text"
                  value={formData.room_name || ""}
                  onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                  disabled={!isCreateMode && !isAuthorized}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Price per 30 min</label>
                <input
                  type="number"
                  value={formData.price_per_half_hour || ""}
                  onChange={(e) => setFormData({ ...formData, price_per_half_hour: parseFloat(e.target.value) })}
                  disabled={!isCreateMode && !isAuthorized}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Active Status</label>
                <select
                  value={formData.is_active ? "active" : "inactive"}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "active" })}
                  disabled={!isCreateMode && !isAuthorized}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setModalOpen(null)
                  setFormData({})
                  setSelectedRoom(null)
                  setError("")
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Go Back
              </button>
              {(isCreateMode || isAuthorized) && (
                <button
                  onClick={isCreateMode ? handleCreateRoom : handleUpdateRoom}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : isCreateMode ? "Create" : "Update"}
                </button>
              )}
            </div>
          </div>
        </div>
      )})()}

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

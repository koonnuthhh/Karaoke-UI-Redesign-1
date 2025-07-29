"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react"
import { siteConfig } from "../../../config/site-config"
import type { Room } from "../../../types"

export default function AdminRooms() {
  const [rooms, setRooms] = useState<Room[]>(siteConfig.rooms as unknown as Room[])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    capacity: "",
    hourlyRate: 0,
    features: "",
    color: "bg-blue-500",
  })
  const router = useRouter()

  const handleAddRoom = () => {
    setEditingRoom(null)
    setFormData({
      name: "",
      capacity: "",
      hourlyRate: 0,
      features: "",
      color: "bg-blue-500",
    })
    setIsModalOpen(true)
  }

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room)
    setFormData({
      name: room.name,
      capacity: room.capacity,
      hourlyRate: room.hourlyRate,
      features: room.features.join(", "),
      color: room.color,
    })
    setIsModalOpen(true)
  }

  const handleDeleteRoom = (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return
    setRooms((prev) => prev.filter((room) => room.id !== roomId))
    alert("Room deleted successfully")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const roomData: Room = {
      id: editingRoom?.id || `room-${Date.now()}`,
      name: formData.name,
      capacity: formData.capacity,
      hourlyRate: formData.hourlyRate,
      features: formData.features.split(",").map((f) => f.trim()),
      color: formData.color,
    }

    if (editingRoom) {
      setRooms((prev) => prev.map((room) => (room.id === editingRoom.id ? roomData : room)))
      alert("Room updated successfully")
    } else {
      setRooms((prev) => [...prev, roomData])
      alert("Room added successfully")
    }

    setIsModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/admin")}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Manage Rooms</h1>
            </div>
            <button
              onClick={handleAddRoom}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Room
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div key={room.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className={`h-4 ${room.color}`}></div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                    <p className="text-sm text-gray-600">{room.capacity}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditRoom(room)}
                      className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="p-2 text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-2xl font-bold text-purple-600">${room.hourlyRate}/hr</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Features:</h4>
                  <div className="flex flex-wrap gap-1">
                    {room.features.map((feature, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">{editingRoom ? "Edit Room" : "Add New Room"}</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <input
                    type="text"
                    value={formData.capacity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, capacity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., 2-4 people"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                  <input
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, hourlyRate: Number.parseFloat(e.target.value) }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Features (comma-separated)</label>
                  <textarea
                    value={formData.features}
                    onChange={(e) => setFormData((prev) => ({ ...prev, features: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    placeholder="Premium sound system, Mood lighting, Snack service"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color Theme</label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="bg-blue-500">Blue</option>
                    <option value="bg-purple-500">Purple</option>
                    <option value="bg-green-500">Green</option>
                    <option value="bg-red-500">Red</option>
                    <option value="bg-yellow-500">Yellow</option>
                    <option value="bg-pink-500">Pink</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    {editingRoom ? "Update Room" : "Add Room"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

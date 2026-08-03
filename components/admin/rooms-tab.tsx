"use client"

import { useState } from "react"
import { Edit, Trash2, Plus, AlertCircle, X, CalendarOff } from "lucide-react"
import { adminAPI, getAdminUser } from "@/lib/admin-service"
import { TimeSelect } from "@/components/ui/time-select"
import type { Room } from "@/types"

interface RoomsTabProps {
  rooms: Room[]
  dataLoading: boolean
  adminCredential: string | null
  onRefresh: () => void
}

// Plans how to insert a room (existing, identified by targetRoomId, or new when
// targetRoomId is null) at requestedOrder among the other rooms that already
// have an explicit display_order. Rooms without an order aren't part of the
// numbered sequence and are left untouched. Returns the clamped rank the target
// room should actually be saved with, plus the other rooms that must shift by
// one to make room for it (only those whose value actually changes).
function planRoomReorder(
  rooms: Room[],
  targetRoomId: string | null,
  requestedOrder: number
): { targetOrder: number; otherUpdates: Array<{ room_id: string; display_order: number }> } {
  const others = rooms
    .filter((r) => r.room_id !== targetRoomId && r.display_order !== undefined && r.display_order !== null)
    .sort((a, b) => (a.display_order as number) - (b.display_order as number))

  const insertAt = Math.max(0, Math.min(Math.trunc(requestedOrder) - 1, others.length))

  const otherUpdates: Array<{ room_id: string; display_order: number }> = []
  others.forEach((room, i) => {
    const newOrder = i < insertAt ? i + 1 : i + 2
    if (room.display_order !== newOrder) {
      otherUpdates.push({ room_id: room.room_id, display_order: newOrder })
    }
  })

  return { targetOrder: insertAt + 1, otherUpdates }
}

// Explicit nulls (not undefined) so JSON.stringify keeps the keys and the
// backend actually clears the stored window - see the Room type notes.
const EMPTY_BLACKOUT: Partial<Room> = {
  blackout_start_date: null,
  blackout_end_date: null,
  blackout_start_time: null,
  blackout_end_time: null,
}

export function RoomsTab({ rooms, dataLoading, adminCredential, onRefresh }: RoomsTabProps) {
  const [modalOpen, setModalOpen] = useState<"create" | "edit" | "delete" | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [formData, setFormData] = useState<Partial<Room>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false)
  const [batchError, setBatchError] = useState("")
  const [blackoutModalOpen, setBlackoutModalOpen] = useState(false)
  const [batchBlackout, setBatchBlackout] = useState<Partial<Room>>(EMPTY_BLACKOUT)

  const isAdmin = getAdminUser()?.role === "admin"
  // Ascending by display_order; rooms with no order set sort after ordered
  // ones, falling back to alphabetical by name so ties (or all-unset) stay stable.
  const roomList = (Array.isArray(rooms) ? [...rooms] : []).sort((a, b) => {
    const aOrder = a.display_order ?? null
    const bOrder = b.display_order ?? null
    if (aOrder !== null && bOrder !== null && aOrder !== bOrder) return aOrder - bOrder
    if (aOrder !== null && bOrder === null) return -1
    if (aOrder === null && bOrder !== null) return 1
    return a.room_name.localeCompare(b.room_name)
  })
  const allSelected = roomList.length > 0 && selectedRoomIds.length === roomList.length

  const toggleRoomSelected = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    )
  }

  const toggleSelectAll = () => {
    setSelectedRoomIds(allSelected ? [] : roomList.map((r) => r.room_id))
  }

  // Applies the same field patch to every selected room. The full room is spread
  // back in so a backend treating PUT as a replace doesn't drop untouched fields.
  const applyToSelectedRooms = async (patch: Partial<Room>): Promise<boolean> => {
    const targets = roomList.filter((r) => selectedRoomIds.includes(r.room_id))
    const results = await Promise.all(
      targets.map((room) => adminAPI.updateRoom(room.room_id, { ...room, ...patch }))
    )
    return results.every((result) => result.success || result.data)
  }

  const handleBatchSetActive = async (active: boolean) => {
    setIsBatchSubmitting(true)
    setBatchError("")
    try {
      if (await applyToSelectedRooms({ is_active: active })) {
        setSelectedRoomIds([])
      } else {
        setBatchError("Some rooms failed to update. Please try again.")
      }
      onRefresh()
    } catch (err) {
      setBatchError("Network error while updating rooms")
    } finally {
      setIsBatchSubmitting(false)
    }
  }

  const handleBatchBlackout = async (patch: Partial<Room>) => {
    const blackoutError = validateBlackoutFields(patch)
    if (blackoutError) {
      setBatchError(blackoutError)
      return
    }

    setIsBatchSubmitting(true)
    setBatchError("")
    try {
      if (await applyToSelectedRooms(patch)) {
        setSelectedRoomIds([])
        setBlackoutModalOpen(false)
        setBatchBlackout(EMPTY_BLACKOUT)
      } else {
        setBatchError("Some rooms failed to update. Please try again.")
      }
      onRefresh()
    } catch (err) {
      setBatchError("Network error while updating rooms")
    } finally {
      setIsBatchSubmitting(false)
    }
  }

  // Blackout dates/times must be set in pairs (or not at all), and the range must
  // be chronological, since a lone start/end is ambiguous for the schedule check.
  const validateBlackoutFields = (data: Partial<Room>): string | null => {
    const hasStartDate = !!data.blackout_start_date
    const hasEndDate = !!data.blackout_end_date
    const hasStartTime = !!data.blackout_start_time
    const hasEndTime = !!data.blackout_end_time

    if (hasStartDate !== hasEndDate) {
      return "Blackout start and end date must both be set (or both left blank)"
    }
    if (hasStartTime !== hasEndTime) {
      return "Blackout start and end time must both be set (or both left blank)"
    }
    if ((hasStartTime || hasEndTime) && !hasStartDate) {
      return "Blackout time range requires a blackout date range"
    }
    if (hasStartDate && hasEndDate && data.blackout_end_date! < data.blackout_start_date!) {
      return "Blackout end date must be on or after the start date"
    }
    return null
  }

  const clearBlackout = () => {
    setFormData({
      ...formData,
      blackout_start_date: null,
      blackout_end_date: null,
      blackout_start_time: null,
      blackout_end_time: null,
    })
  }

  const handleCreateRoom = async () => {
    try {
      setIsSubmitting(true)
      setError("")

      const adminUser = getAdminUser()
      if (!adminUser) {
        setError("Authentication required. Please login again.")
        return
      }

      const blackoutError = validateBlackoutFields(formData)
      if (blackoutError) {
        setError(blackoutError)
        return
      }

      let submitData: Partial<Room> = formData
      let otherOrderUpdates: Array<{ room_id: string; display_order: number }> = []
      if (formData.display_order !== undefined && formData.display_order !== null) {
        const plan = planRoomReorder(roomList, null, formData.display_order)
        submitData = { ...formData, display_order: plan.targetOrder }
        otherOrderUpdates = plan.otherUpdates
      }

      const result = await adminAPI.createRoom(submitData)

      if (result.success || result.data) {
        if (otherOrderUpdates.length > 0) {
          await Promise.all(
            otherOrderUpdates.map((u) => adminAPI.updateRoom(u.room_id, { display_order: u.display_order }))
          )
        }
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

      const blackoutError = validateBlackoutFields(formData)
      if (blackoutError) {
        setError(blackoutError)
        return
      }

      let submitData: Partial<Room> = formData
      let otherOrderUpdates: Array<{ room_id: string; display_order: number }> = []
      if (formData.display_order !== undefined && formData.display_order !== null) {
        const plan = planRoomReorder(roomList, selectedRoom.room_id, formData.display_order)
        submitData = { ...formData, display_order: plan.targetOrder }
        otherOrderUpdates = plan.otherUpdates
      }

      const result = await adminAPI.updateRoom(selectedRoom.room_id, submitData)

      if (result.success || result.data) {
        if (otherOrderUpdates.length > 0) {
          await Promise.all(
            otherOrderUpdates.map((u) => adminAPI.updateRoom(u.room_id, { display_order: u.display_order }))
          )
        }
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

        {isAdmin && selectedRoomIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 bg-purple-50 border border-purple-200 rounded-lg px-3 sm:px-4 py-2 sm:py-3 mb-4">
            <span className="text-xs sm:text-sm font-medium text-purple-900">
              {selectedRoomIds.length} room{selectedRoomIds.length > 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => handleBatchSetActive(true)}
              disabled={isBatchSubmitting}
              className="px-3 py-1.5 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isBatchSubmitting ? "Updating..." : "Set Active"}
            </button>
            <button
              onClick={() => handleBatchSetActive(false)}
              disabled={isBatchSubmitting}
              className="px-3 py-1.5 text-xs sm:text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              {isBatchSubmitting ? "Updating..." : "Set Inactive"}
            </button>
            <button
              onClick={() => {
                setBatchBlackout(EMPTY_BLACKOUT)
                setBatchError("")
                setBlackoutModalOpen(true)
              }}
              disabled={isBatchSubmitting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              <CalendarOff className="w-3.5 h-3.5" /> Set Blackout
            </button>
            <button
              onClick={() => setSelectedRoomIds([])}
              disabled={isBatchSubmitting}
              className="text-xs sm:text-sm text-gray-600 hover:text-gray-900"
            >
              Clear selection
            </button>
            {batchError && <span className="text-xs sm:text-sm text-red-600">{batchError}</span>}
          </div>
        )}

        {dataLoading ? (
          <div className="text-center py-8 text-sm text-gray-600">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    {isAdmin && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900 w-8">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all rooms"
                          className="h-4 w-4"
                        />
                      </th>
                    )}
                    <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Order</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Room Name</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Price/30min</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Active</th>
                    <th className="px-3 sm:px-6 py-3 text-right text-xs sm:text-sm font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Array.isArray(rooms) ? roomList.map((room) => (
                    <tr key={room.room_id}>
                      {isAdmin && (
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm">
                          <input
                            type="checkbox"
                            checked={selectedRoomIds.includes(room.room_id)}
                            onChange={() => toggleRoomSelected(room.room_id)}
                            aria-label={`Select ${room.room_name}`}
                            className="h-4 w-4"
                          />
                        </td>
                      )}
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600">{room.display_order ?? "-"}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900">
                        <div>
                          {room.room_name}
                          {room.blackout_start_date && room.blackout_end_date && (
                            <div className="text-xs text-orange-600 mt-1">
                              Blackout: {room.blackout_start_date} – {room.blackout_end_date}
                              {room.blackout_start_time && room.blackout_end_time && (
                                <> ({room.blackout_start_time.slice(0, 5)}–{room.blackout_end_time.slice(0, 5)})</>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
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
                    <td colSpan={isAdmin ? 6 : 5} className="px-3 sm:px-6 py-2 sm:py-4 text-center text-xs sm:text-sm text-gray-500">
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

      {/* Batch Blackout Modal */}
      {blackoutModalOpen && (() => {
        const roomCount = selectedRoomIds.length
        const selectedNames = roomList
          .filter((r) => selectedRoomIds.includes(r.room_id))
          .map((r) => r.room_name)
        const hasAnyValue =
          !!batchBlackout.blackout_start_date ||
          !!batchBlackout.blackout_end_date ||
          !!batchBlackout.blackout_start_time ||
          !!batchBlackout.blackout_end_time
        const closeModal = () => {
          setBlackoutModalOpen(false)
          setBatchBlackout(EMPTY_BLACKOUT)
          setBatchError("")
        }

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Set Blackout for Selected Rooms</h3>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-md p-2 sm:p-3 mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-orange-900 font-medium">
                  Applies to {roomCount} room{roomCount > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-orange-800 mt-0.5 break-words">{selectedNames.join(", ")}</p>
              </div>

              <p className="text-xs text-gray-500 mb-3">
                Blocks bookings for every selected room on each date in this range, during this daily time window.
                Leave the times blank to block the whole day. This replaces any blackout those rooms already have.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-0.5">Start Date</label>
                  <input
                    type="date"
                    value={batchBlackout.blackout_start_date || ""}
                    onChange={(e) =>
                      setBatchBlackout({ ...batchBlackout, blackout_start_date: e.target.value || null })
                    }
                    className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-0.5">End Date</label>
                  <input
                    type="date"
                    value={batchBlackout.blackout_end_date || ""}
                    onChange={(e) =>
                      setBatchBlackout({ ...batchBlackout, blackout_end_date: e.target.value || null })
                    }
                    className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-0.5">Start Time (daily)</label>
                  <TimeSelect
                    value={batchBlackout.blackout_start_time || ""}
                    onChange={(time) => setBatchBlackout({ ...batchBlackout, blackout_start_time: time || null })}
                    allowClear
                    className="w-full"
                    selectClassName="flex-1 min-w-0 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-0.5">End Time (daily)</label>
                  <TimeSelect
                    value={batchBlackout.blackout_end_time || ""}
                    onChange={(time) => setBatchBlackout({ ...batchBlackout, blackout_end_time: time || null })}
                    allowClear
                    className="w-full"
                    selectClassName="flex-1 min-w-0 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {batchError && <p className="text-red-600 mt-3 text-sm">{batchError}</p>}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeModal}
                  disabled={isBatchSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Go Back
                </button>
                <button
                  onClick={() => handleBatchBlackout(batchBlackout)}
                  disabled={isBatchSubmitting || !hasAnyValue}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {isBatchSubmitting ? "Saving..." : `Apply to ${roomCount} room${roomCount > 1 ? "s" : ""}`}
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleBatchBlackout(EMPTY_BLACKOUT)}
                disabled={isBatchSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-3 text-xs sm:text-sm font-medium border border-red-300 text-red-600 bg-white rounded-md hover:bg-red-50 hover:border-red-400 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear blackout on selected rooms
              </button>
            </div>
          </div>
        )
      })()}

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
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <p className="text-xs text-gray-500 mb-1">Controls column order in the schedule grid (lower first). Leave blank to sort alphabetically.</p>
                <input
                  type="number"
                  value={formData.display_order ?? ""}
                  onChange={(e) => setFormData({ ...formData, display_order: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
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
              <div className="border-t pt-3 sm:pt-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Scheduled Unavailability (optional)</label>
                <p className="text-xs text-gray-500 mb-2">
                  Blocks bookings for this room on each date in this range, during this daily time window. Leave everything blank for no blackout.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">Start Date</label>
                    <input
                      type="date"
                      value={formData.blackout_start_date || ""}
                      onChange={(e) => setFormData({ ...formData, blackout_start_date: e.target.value || null })}
                      disabled={!isCreateMode && !isAuthorized}
                      className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">End Date</label>
                    <input
                      type="date"
                      value={formData.blackout_end_date || ""}
                      onChange={(e) => setFormData({ ...formData, blackout_end_date: e.target.value || null })}
                      disabled={!isCreateMode && !isAuthorized}
                      className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">Start Time (daily)</label>
                    <TimeSelect
                      value={formData.blackout_start_time || ""}
                      onChange={(time) => setFormData({ ...formData, blackout_start_time: time || null })}
                      disabled={!isCreateMode && !isAuthorized}
                      allowClear
                      className="w-full"
                      selectClassName="flex-1 min-w-0 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">End Time (daily)</label>
                    <TimeSelect
                      value={formData.blackout_end_time || ""}
                      onChange={(time) => setFormData({ ...formData, blackout_end_time: time || null })}
                      disabled={!isCreateMode && !isAuthorized}
                      allowClear
                      className="w-full"
                      selectClassName="flex-1 min-w-0 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                {(isCreateMode || isAuthorized) &&
                  (formData.blackout_start_date || formData.blackout_end_date || formData.blackout_start_time || formData.blackout_end_time) && (
                    <button
                      type="button"
                      onClick={clearBlackout}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-3 text-xs sm:text-sm font-medium border border-red-300 text-red-600 bg-white rounded-md hover:bg-red-50 hover:border-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear blackout window
                    </button>
                  )}
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

"use client"

import { useState } from "react"
import { Edit, Trash2, Plus, AlertCircle } from "lucide-react"
import { adminAPI, getAdminUser } from "@/lib/admin-service"
import { TimeSelect } from "@/components/ui/time-select"
import type { Promotion } from "@/types"

interface Room {
  room_id: string
  room_name: string
  [key: string]: any
}

interface PromotionsTabProps {
  promotions: Promotion[]
  dataLoading: boolean
  adminCredential: string | null
  onRefresh: () => void
  rooms?: Room[]
}

export function PromotionsTab({ promotions, dataLoading, adminCredential, onRefresh, rooms = [] }: PromotionsTabProps) {
  const [modalOpen, setModalOpen] = useState<"create" | "edit" | "delete" | null>(null)
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)
  const [formData, setFormData] = useState<Partial<Promotion>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])

  // Helper function to convert form data to backend format
  const convertPromotionData = (formData: Partial<Promotion>) => {
    // Convert time format from HH:MM to HH:MM:SS
    const formatTime = (time: string | undefined, defaultTime: string): string => {
      if (!time) return defaultTime
      // If already in HH:MM:SS format, return as-is
      if (time.match(/^\d{2}:\d{2}:\d{2}$/)) {
        return time
      }
      // If in HH:MM format, add seconds
      if (time.match(/^\d{2}:\d{2}$/)) {
        return `${time}:00`
      }
      return defaultTime
    }

    // Determine the discount type (handle both camelCase and snake_case)
    const discountType = formData.discountType || formData.type || "percentage_discount"

    // Format dates to include time for backend (yyyy-MM-DD becomes yyyy-MM-DDTHH:MM:SS)
    const formatDateForBackend = (dateStr: string | undefined, defaultTime: string = "00:00:00") => {
      if (!dateStr) return undefined
      // If already ISO format with T, return as-is
      if (dateStr.includes("T")) return dateStr
      // If just date (yyyy-MM-dd), append time
      return `${dateStr}T${defaultTime}`
    }

    const backendData: any = {
      code: formData.code?.toUpperCase(),
      pro_name: formData.name || formData.pro_name,
      description: formData.description,
      type: discountType,
      start_date: formatDateForBackend(formData.startDate || formData.start_date, "00:00:00"),
      end_date: formatDateForBackend(formData.endDate || formData.end_date, "23:59:59"),
      start_time: formatTime(formData.start_time, "00:00:00"),
      end_time: formatTime(formData.end_time, "23:59:59"),
      max_usage: formData.maxUses || formData.max_usage,
      is_active: formData.isActive !== undefined ? formData.isActive : (formData.is_active !== undefined ? formData.is_active : true),
      is_room_specific: formData.is_room_specific || false,
      applicable_room_ids: formData.applicable_room_ids || [],
      applicable_days: formData.applicable_days || [],
    }

    // Convert discount field based on type
    const discountValue = formData.discount || formData.discount_percent || formData.discount_value || formData.buy_x_hour || 0

    if (discountType === "percentage_discount") {
      backendData.discount_percent = discountValue
    } else if (discountType === "flat_discount") {
      backendData.discount_value = discountValue
    } else if (discountType === "buy_x_get_y") {
      backendData.buy_x_hour = discountValue
      backendData.get_y_hour = formData.get_y_hour || 1
    }

    return backendData
  }

  const handleCreatePromotion = async () => {
    try {
      setIsSubmitting(true)
      setError("")
      
      // Validate required fields
      if (!formData.name?.trim()) {
        setError("Promotion name is required")
        setIsSubmitting(false)
        return
      }
      if (!formData.code?.trim()) {
        setError("Promo code is required")
        setIsSubmitting(false)
        return
      }
      if (!formData.discount && formData.discount !== 0) {
        setError("Discount value is required")
        setIsSubmitting(false)
        return
      }
      if (!formData.endDate) {
        setError("End date is required")
        setIsSubmitting(false)
        return
      }
      
      // If room-specific, validate that rooms are selected
      if (formData.is_room_specific && selectedRooms.length === 0) {
        setError("Please select at least one room for this promotion")
        setIsSubmitting(false)
        return
      }

      const adminUser = getAdminUser()
      if (!adminUser) {
        setError("Authentication required. Please login again.")
        setIsSubmitting(false)
        return
      }

      // Sync selectedRooms to formData
      const promotionData = {
        ...formData,
        applicable_room_ids: selectedRooms,
      }

      // Convert form data to backend format
      const promotionPayload = convertPromotionData(promotionData)

      const result = await adminAPI.createPromotion(promotionPayload)
      
      if (result.success || result.data) {
        setModalOpen(null)
        setFormData({})
        setSelectedRooms([])
        onRefresh()
      } else {
        setError(result.message || result.error?.message || "Failed to create promotion")
      }
    } catch (err: any) {
      setError(err.message || "Error creating promotion")
      console.error("Create promotion error:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdatePromotion = async () => {
    try {
      setIsSubmitting(true)
      setError("")
      
      // Validate required fields
      if (!formData.name?.trim()) {
        setError("Promotion name is required")
        setIsSubmitting(false)
        return
      }
      if (!formData.code?.trim()) {
        setError("Promo code is required")
        setIsSubmitting(false)
        return
      }
      if (!formData.discount && formData.discount !== 0) {
        setError("Discount value is required")
        setIsSubmitting(false)
        return
      }
      if (!formData.endDate) {
        setError("End date is required")
        setIsSubmitting(false)
        return
      }
      
      // If room-specific, validate that rooms are selected
      if (formData.is_room_specific && selectedRooms.length === 0) {
        setError("Please select at least one room for this promotion")
        setIsSubmitting(false)
        return
      }

      const adminUser = getAdminUser()
      if (!adminUser) {
        setError("Authentication required. Please login again.")
        setIsSubmitting(false)
        return
      }

      // Get promotion ID from formData (which has the UUID)
      const promotionId = formData.id
      
      console.log("=== handleUpdatePromotion Validation ===")
      console.log("formData.id (UUID):", formData.id)
      console.log("promotionId being used:", promotionId)

      if (!promotionId) {
        setError("Invalid promotion ID. The promotion ID must be set when editing.")
        console.error("Cannot update: promotionId is missing", {
          formDataId: formData.id,
          selectedPromotionId: selectedPromotion?.id
        })
        setIsSubmitting(false)
        return
      }

      // Sync selectedRooms to formData
      const promotionData = {
        ...formData,
        applicable_room_ids: selectedRooms,
      }

      // Convert form data to backend format
      const promotionPayload = convertPromotionData(promotionData)
      
      console.log("=== AFTER convertPromotionData (UPDATE) ===")
      console.log("promotionPayload:", promotionPayload)
      console.log("promotionPayload.applicable_room_ids:", promotionPayload.applicable_room_ids)
      console.log("promotionPayload keys:", Object.keys(promotionPayload))
      
      // Ensure ID is included in the payload for backend validation
      const promotionPayloadWithId = {
        ...promotionPayload,
        id: promotionId,
      }
      
      console.log("=== FINAL PAYLOAD WITH ID (UPDATE) ===")
      console.log("promotionPayloadWithId:", promotionPayloadWithId)
      console.log("promotionPayloadWithId.applicable_room_ids:", promotionPayloadWithId.applicable_room_ids)
      
      console.log("handleUpdatePromotion - promotionPayload keys:", Object.keys(promotionPayload))
      console.log("handleUpdatePromotion - promotionPayloadWithId keys:", Object.keys(promotionPayloadWithId))
      console.log("handleUpdatePromotion - promotionPayloadWithId.id:", promotionPayloadWithId.id)
      console.log("handleUpdatePromotion - Full promotionPayloadWithId:", JSON.stringify(promotionPayloadWithId, null, 2))
      console.log("handleUpdatePromotion - About to update with payload:", {
        promotionId,
        promotionPayload: promotionPayloadWithId
      })

      console.log("BEFORE UPDATE CALL - promotionId value:", promotionId)
      console.log("BEFORE UPDATE CALL - promotionId type:", typeof promotionId)
      console.log("BEFORE UPDATE CALL - promotionId is truthy?", !!promotionId)
      
      const result = await adminAPI.updatePromotion(promotionId, promotionPayloadWithId)
      
      console.log("AFTER UPDATE CALL - result:", result)
      
      if (result.success || result.data) {
        setModalOpen(null)
        setFormData({})
        setSelectedPromotion(null)
        setSelectedRooms([])
        onRefresh()
      } else {
        setError(result.message || result.error?.message || "Failed to update promotion")
      }
    } catch (err: any) {
      setError(err.message || "Error updating promotion")
      console.error("Update promotion error:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePromotion = async () => {
    const adminUser = getAdminUser()
    if (!adminUser) {
      setError("Authentication required. Please login again.")
      return
    }

    console.log("=== handleDeletePromotion ===")
    console.log("selectedPromotion:", selectedPromotion)
    console.log("selectedPromotion.id (UUID):", selectedPromotion?.id)

    // Use the UUID id from selectedPromotion
    const promotionId = selectedPromotion?.id

    if (!promotionId) {
      setError("Invalid promotion ID. Please ensure the promotion ID is present.")
      console.error("Cannot delete: promotionId is missing", {
        selectedPromotion,
        id: selectedPromotion?.id
      })
      return
    }

    try {
      setIsSubmitting(true)
      setError("")
      
      console.log("Attempting to delete promotion with UUID:", promotionId)
      
      const result = await adminAPI.deletePromotion(promotionId)
      
      console.log("Delete result:", result)
      
      if (result.success || result.data) {
        setModalOpen(null)
        setSelectedPromotion(null)
        onRefresh()
      } else {
        const message = result.message || result.error?.message || "Failed to delete promotion"
        setError(message === "NOT_FOUND" ? "Promotion not found or already deleted" : message)
      }
    } catch (err: any) {
      console.error("Error in handleDeletePromotion:", err)
      setError(err.message || "Error deleting promotion")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Manage Promotions</h2>
          {getAdminUser()?.role === "admin" && (
            <button
              onClick={() => {
                console.log("=== CREATE PROMOTION BUTTON CLICKED ===")
                setModalOpen("create")
                setSelectedPromotion(null)
                setFormData({})
                setSelectedRooms([])
                console.log("selectedRooms reset to:", [])
                setError("")
              }}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white text-sm sm:text-base rounded-md hover:bg-purple-700 transition w-full sm:w-auto justify-center sm:justify-start"
            >
              <Plus className="w-4 h-4" /> Create Promotion
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
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Name</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Code</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Discount</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Usage</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Max Usage</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Active</th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs sm:text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Array.isArray(promotions) ? promotions.map((promo) => {
                  // Handle discount display based on type
                  const discountDisplay = promo.discountType === "percentage_discount" || promo.type === "percentage_discount"
                    ? `${promo.discount}%`
                    : promo.discountType === "flat_discount" || promo.type === "flat_discount"
                    ? `฿${promo.discount}`
                    : `${promo.discount} hours`

                  return (
                    <tr key={promo.id}>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900">
                        <div>
                          {promo.name || promo.pro_name}
                          {promo.is_room_specific && (
                            <div className="text-xs text-blue-600 mt-1">Room-Specific</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600">{promo.code}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600">{discountDisplay}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600">{promo.used_count ?? promo.usedCount ?? 0}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600">{promo.max_usage ?? promo.maxUses ?? "Unlimited"}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm">
                        <span className={`px-2 py-1 rounded text-white text-xs font-medium ${promo.isActive || promo.is_active ? 'bg-green-500' : 'bg-gray-500'}`}>
                          {promo.isActive || promo.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-right text-xs sm:text-sm">
                        <button
                          onClick={() => {
                            // Direct UUID extraction from the response object
                            const promotionId = promo.id
                            
                            console.log("=== EDIT BUTTON CLICKED ===")
                            console.log("Raw promo object keys:", Object.keys(promo || {}))
                            console.log("promo.id (UUID):", promotionId)
                            console.log("promo.code:", promo?.code)
                            
                            // Transform promo data to form format when editing
                            // Extract date in yyyy-MM-dd format for HTML date inputs
                            const extractDateOnly = (dateStr: string | undefined) => {
                              if (!dateStr) return ""
                              if (dateStr.includes("T")) {
                                // ISO format like 2026-03-22T00:00:00
                                return dateStr.split("T")[0]
                              }
                              // Already in yyyy-MM-dd format
                              return dateStr
                            }
                            
                            const editData: Partial<Promotion> = {
                              id: promotionId, // Use the UUID from promo.id
                              code: promo.code,
                              name: promo.name || promo.pro_name,
                              description: promo.description,
                              discountType: promo.discountType || promo.type,
                              discount: promo.discount,
                              startDate: extractDateOnly(promo.startDate || promo.start_date),
                              endDate: extractDateOnly(promo.endDate || promo.end_date),
                              start_time: promo.start_time?.substring(0, 5),
                              end_time: promo.end_time?.substring(0, 5),
                              maxUses: promo.maxUses || promo.max_usage,
                              isActive: promo.isActive ?? promo.is_active ?? true,
                              is_room_specific: promo.is_room_specific || false,
                              applicable_room_ids: promo.applicable_room_ids || [],
                              applicable_days: promo.applicable_days || [],
                            }
                            
                            console.log("EditData.id will be:", editData.id)
                            console.log("Full editData:", editData)
                            
                            setSelectedPromotion(promo)
                            setFormData(editData)
                            console.log("=== EDIT MODE: Setting selectedRooms ===")
                            console.log("promo.applicable_room_ids:", promo.applicable_room_ids)
                            setSelectedRooms(promo.applicable_room_ids || [])
                            console.log("selectedRooms set to:", promo.applicable_room_ids || [])
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
                              console.log("=== DELETE BUTTON CLICKED ===")
                              console.log("promo.id (UUID):", promo?.id)
                              console.log("promo.code:", promo?.code)
                              setSelectedPromotion(promo)
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
                  )
                }) : (
                  <tr key="no-promotions">
                    <td colSpan={7} className="px-3 sm:px-6 py-2 sm:py-4 text-center text-xs sm:text-sm text-gray-500">
                      No promotions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Promotion Modal */}
      {(modalOpen === "create" || modalOpen === "edit") && (() => {
        const currentAdmin = getAdminUser()
        const isAuthorized = currentAdmin?.role === "admin"
        const isCreateMode = modalOpen === "create"
        
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-3 sm:p-6 w-full max-w-xs sm:max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
              {isCreateMode ? "Create New Promotion" : "Edit Promotion"}
            </h3>
            {!isCreateMode && !isAuthorized && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 sm:p-3 mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-yellow-800">You don't have permission to edit this promotion. Viewing in read-only mode.</p>
              </div>
            )}
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isCreateMode && !isAuthorized}
                  placeholder="e.g., Summer Special"
                  className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Promo Code</label>
                <input
                  type="text"
                  value={formData.code || ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  disabled={!isCreateMode && !isAuthorized}
                  placeholder="e.g., SUMMER2024"
                  className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <select
                  value={formData.discountType || "percentage_discount"}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  disabled={!isCreateMode && !isAuthorized}
                  className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="percentage_discount">Percentage Discount</option>
                  <option value="flat_discount">Flat Discount</option>
                  {/* <option value="buy_x_get_y">Buy X Get Y</option> */}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  {formData.discountType === "flat_discount" ? "Discount Amount (฿)" : "Discount (%)"}
                </label>
                <input
                  type="number"
                  value={formData.discount || ""}
                  onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) })}
                  disabled={!isCreateMode && !isAuthorized}
                  placeholder={formData.discountType === "flat_discount" ? "e.g., 100" : "e.g., 30"}
                  className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <p className="text-xs text-gray-500 mb-2">Promotion begins on this date</p>
                <input
                  type="date"
                  value={formData.startDate || ""}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  disabled={!isCreateMode && !isAuthorized}
                  className="w-full px-1 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">End Date</label>
                <p className="text-xs text-gray-500 mb-2">Promotion ends on this date</p>
                <input
                  type="date"
                  value={formData.endDate || ""}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  disabled={!isCreateMode && !isAuthorized}
                  className="w-full px-1 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <p className="text-xs text-gray-500 mb-2">Promotion is only active from this time each day</p>
                <TimeSelect
                  value={formData.start_time || "00:00"}
                  onChange={(time) => setFormData({ ...formData, start_time: time })}
                  disabled={!isCreateMode && !isAuthorized}
                  className="w-full"
                  selectClassName="flex-1 min-w-0 px-1 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">End Time</label>
                <p className="text-xs text-gray-500 mb-2">...until this time, every day (e.g. 12:00 - 16:00)</p>
                <TimeSelect
                  value={formData.end_time || "23:30"}
                  onChange={(time) => setFormData({ ...formData, end_time: time })}
                  disabled={!isCreateMode && !isAuthorized}
                  className="w-full"
                  selectClassName="flex-1 min-w-0 px-1 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Active Days</label>
                <p className="text-xs text-gray-500 mb-2">Leave all unchecked to apply every day</p>
                <div className="flex flex-wrap gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, dayIndex) => {
                    const selectedDays = formData.applicable_days || []
                    const isChecked = selectedDays.includes(dayIndex)
                    return (
                      <label
                        key={dayIndex}
                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border cursor-pointer ${
                          isChecked ? "bg-purple-50 border-purple-400 text-purple-700" : "border-gray-300 text-gray-700"
                        } ${!isCreateMode && !isAuthorized ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newDays = e.target.checked
                              ? [...selectedDays, dayIndex]
                              : selectedDays.filter((d) => d !== dayIndex)
                            setFormData({ ...formData, applicable_days: newDays })
                          }}
                          disabled={!isCreateMode && !isAuthorized}
                          className="w-3 h-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:cursor-not-allowed"
                        />
                        {label}
                      </label>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Max Uses</label>
                <input
                  type="number"
                  value={formData.maxUses || ""}
                  onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
                  disabled={!isCreateMode && !isAuthorized}
                  placeholder="e.g., 500 (leave empty for unlimited)"
                  className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4">
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={formData.is_room_specific || false}
                    onChange={(e) => {
                      setFormData({ ...formData, is_room_specific: e.target.checked })
                      if (!e.target.checked) {
                        setSelectedRooms([])
                      }
                    }}
                    disabled={!isCreateMode && !isAuthorized}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Make this promotion room-specific?</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">Only allow this promotion for specific rooms</p>
                
                {formData.is_room_specific && rooms.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-2 sm:p-3">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Select Rooms</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {rooms.map((room) => (
                        <label key={room.room_id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedRooms.includes(room.room_id)}
                            onChange={(e) => {
                              console.log(`Room checkbox changed for ${room.room_id}:`, e.target.checked)
                              if (e.target.checked) {
                                const newRooms = [...selectedRooms, room.room_id]
                                console.log("Adding room, new selectedRooms:", newRooms)
                                setSelectedRooms(newRooms)
                              } else {
                                const newRooms = selectedRooms.filter(id => id !== room.room_id)
                                console.log("Removing room, new selectedRooms:", newRooms)
                                setSelectedRooms(newRooms)
                              }
                            }}
                            disabled={!isCreateMode && !isAuthorized}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-xs sm:text-sm text-gray-700">{room.room_name}</span>
                        </label>
                      ))}
                    </div>
                    {selectedRooms.length > 0 && (
                      <div className="mt-2 p-2 bg-white rounded text-xs text-gray-600">
                        {selectedRooms.length} room(s) selected
                      </div>
                    )}
                  </div>
                )}
                
                {formData.is_room_specific && rooms.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 sm:p-3 text-xs text-yellow-800">
                    No rooms available. Please create rooms first.
                  </div>
                )}
              </div>
              <div className="mb-2 sm:mb-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.isActive ? "active" : "inactive"}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "active" })}
                  disabled={!isCreateMode && !isAuthorized}
                  className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            {error && <p className="text-red-600 mt-3 text-xs sm:text-sm">{error}</p>}
            <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => {
                  setModalOpen(null)
                  setFormData({})
                  setSelectedPromotion(null)
                  setError("")
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 text-xs sm:text-sm hover:bg-gray-50"
              >
                {isCreateMode ? "Cancel" : "Go Back"}
              </button>
              {(isCreateMode || isAuthorized) && (
                <button
                  onClick={isCreateMode ? handleCreatePromotion : handleUpdatePromotion}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white text-xs sm:text-base rounded-md hover:bg-purple-700 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Delete Promotion</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this promotion? This action cannot be undone.</p>
            {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalOpen(null)
                  setSelectedPromotion(null)
                  setError("")
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePromotion}
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

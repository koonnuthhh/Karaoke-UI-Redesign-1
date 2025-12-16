"use client"

import { useState } from "react"
import { Edit, Trash2, Plus, AlertCircle } from "lucide-react"
import type { Promotion } from "@/types"

interface PromotionsTabProps {
  promotions: Promotion[]
  dataLoading: boolean
  adminCredential: string | null
  onRefresh: () => void
}

export function PromotionsTab({ promotions, dataLoading, adminCredential, onRefresh }: PromotionsTabProps) {
  const [modalOpen, setModalOpen] = useState<"create" | "edit" | "delete" | null>(null)
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)
  const [formData, setFormData] = useState<Partial<Promotion>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleCreatePromotion = async () => {
    try {
      setIsSubmitting(true)
      setError("")
      const res = await fetch("/api/admin/promotions", {
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
        setError(data.message || "Failed to create promotion")
      }
    } catch (err) {
      setError("Network error while creating promotion")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdatePromotion = async () => {
    try {
      setIsSubmitting(true)
      setError("")
      const res = await fetch(`/api/admin/promotions/${selectedPromotion?.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data: formData })
      })
      
      const data = await res.json()
      if (res.ok) {
        setModalOpen(null)
        setFormData({})
        setSelectedPromotion(null)
        onRefresh()
      } else {
        setError(data.message || "Failed to update promotion")
      }
    } catch (err) {
      setError("Network error while updating promotion")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePromotion = async () => {
    if (!adminCredential) {
      setError("Authentication required. Please login again.")
      return
    }

    if (!selectedPromotion?.id) {
      setError("Invalid promotion ID. Please try again.")
      return
    }

    try {
      setIsSubmitting(true)
      setError("")
      const res = await fetch(`/api/admin/promotions/${selectedPromotion.id}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data: { admin_id: adminCredential } })
      })
      
      const data = await res.json()
      if (res.ok) {
        setModalOpen(null)
        setSelectedPromotion(null)
        onRefresh()
      } else {
        const message = data.message || "Failed to delete promotion"
        setError(message === "NOT_FOUND" ? "Promotion not found or already deleted" : message)
      }
    } catch (err) {
      setError("Network error while deleting promotion")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Manage Promotions</h2>
          <button
            onClick={() => {
              setModalOpen("create")
              setSelectedPromotion(null)
              setFormData({})
              setError("")
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" /> Create Promotion
          </button>
        </div>

        {dataLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Code</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Discount</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Valid Until</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Array.isArray(promotions) ? promotions.map((promo) => (
                  <tr key={promo.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{promo.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{promo.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{promo.discount}%</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{promo.endDate}</td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => {
                          setSelectedPromotion(promo)
                          setFormData(promo)
                          setModalOpen("edit")
                          setError("")
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPromotion(promo)
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
                  <tr key="no-promotions">
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No promotions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Promotion Modal */}
      {(modalOpen === "create" || modalOpen === "edit") && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {modalOpen === "create" ? "Create New Promotion" : "Edit Promotion"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
                <input
                  type="text"
                  value={formData.code || ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                <input
                  type="number"
                  value={formData.discount || ""}
                  onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate || ""}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.endDate || ""}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
                <input
                  type="number"
                  value={formData.maxUses || ""}
                  onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
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
                onClick={modalOpen === "create" ? handleCreatePromotion : handleUpdatePromotion}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
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
              <h3 className="text-lg font-bold text-gray-900">Delete Promotion</h3>
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

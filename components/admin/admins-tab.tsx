"use client"

import { useState } from "react"
import { Edit, Trash2, Plus, AlertCircle, X } from "lucide-react"
import { adminAPI, getAdminUser } from "@/lib/admin-service"
import type { Admin } from "@/types"

interface AdminsTabProps {
  admins: Admin[]
  dataLoading: boolean
  adminCredential: string | null
  onRefresh: () => void
}

export function AdminsTab({ admins, dataLoading, adminCredential, onRefresh }: AdminsTabProps) {
  const [modalOpen, setModalOpen] = useState<"create" | "edit" | "delete" | null>(null)
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
  const [formData, setFormData] = useState<Partial<Admin>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleCreateAdmin = async () => {
    try {
      setIsSubmitting(true)
      setError("")
      
      const adminUser = getAdminUser()
      if (!adminUser) {
        setError("Authentication required. Please login again.")
        return
      }

      // Use name as username when creating admin
      const adminData = {
        ...formData,
        username: formData.name
      }
      
      const result = await adminAPI.createAdmin(adminData)
      
      if (result.success || result.data) {
        setModalOpen(null)
        setFormData({})
        onRefresh()
      } else {
        setError(result.message || result.error?.message || "Failed to create admin")
      }
    } catch (err: any) {
      setError(err.message || "Error creating admin")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateAdmin = async () => {
    try {
      setIsSubmitting(true)
      setError("")
      
      const adminUser = getAdminUser()
      if (!adminUser) {
        setError("Authentication required. Please login again.")
        return
      }

      const adminId = selectedAdmin?.id || selectedAdmin?.admin_id
      if (!adminId) {
        setError("Invalid admin ID")
        return
      }

      // Use name as username when updating admin
      const adminData = {
        ...formData,
        username: formData.name
      }

      const result = await adminAPI.updateAdmin(adminId, adminData)
      
      if (result.success || result.data) {
        setModalOpen(null)
        setFormData({})
        setSelectedAdmin(null)
        onRefresh()
      } else {
        setError(result.message || result.error?.message || "Failed to update admin")
      }
    } catch (err: any) {
      setError(err.message || "Error updating admin")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAdmin = async () => {
    const adminUser = getAdminUser()
    if (!adminUser) {
      setError("Authentication required. Please login again.")
      return
    }

    // Get ID from either id or admin_id field
    const adminId = selectedAdmin?.id || selectedAdmin?.admin_id
    if (!adminId) {
      setError("Invalid admin ID. Please try again.")
      return
    }

    // Prevent admin from deleting themselves
    if (adminId === adminUser.admin_id) {
      setError("You cannot delete your own account.")
      return
    }

    try {
      setIsSubmitting(true)
      setError("")
      
      const result = await adminAPI.deleteAdmin(adminId)
      if (result.success || result.data) {
        setModalOpen(null)
        setSelectedAdmin(null)
        onRefresh()
      } else {
        const message = result.message || result.error?.message || "Failed to delete admin"
        setError(message === "NOT_FOUND" ? "Admin not found or already deleted" : message)
      }
    } catch (err: any) {
      setError(err.message || "Error deleting admin")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Manage Admins</h2>
          {getAdminUser()?.role === "admin" && (
            <button
              onClick={() => {
                setModalOpen("create")
                setSelectedAdmin(null)
                setFormData({})
                setError("")
              }}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm sm:text-base rounded-md hover:bg-blue-700 transition w-full sm:w-auto justify-center sm:justify-start"
            >
              <Plus className="w-4 h-4" /> Create Admin
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
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Role</th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs sm:text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Array.isArray(admins) ? admins.map((admin, index) => (
                  <tr key={admin.id || admin.admin_id || `admin-${index}`}>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">{admin.name || admin.username}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{admin.role}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm">
                      <button
                        onClick={() => {
                          const normalizedAdmin = {
                            ...admin,
                            id: admin.id || admin.admin_id
                          }
                          setSelectedAdmin(normalizedAdmin)
                          setFormData({
                            ...normalizedAdmin,
                            name: normalizedAdmin.name || normalizedAdmin.username
                          })
                          setModalOpen("edit")
                          setError("")
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {getAdminUser()?.role === "admin" && (admin.id || admin.admin_id) !== getAdminUser()?.admin_id && (
                        <button
                          onClick={() => {
                            const normalizedAdmin = {
                              ...admin,
                              id: admin.id || admin.admin_id
                            }
                            setSelectedAdmin(normalizedAdmin)
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
                  <tr key="no-admins">
                    <td colSpan={3} className="px-3 sm:px-6 py-2 sm:py-4 text-center text-xs sm:text-sm text-gray-500">
                      No admins found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Admin Modal */}
      {(modalOpen === "create" || modalOpen === "edit") && (() => {
        const currentAdmin = getAdminUser()
        const isAuthorized = currentAdmin?.role === "admin"
        const isCreateMode = modalOpen === "create"
        
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                {isCreateMode ? "Create New Admin" : "Edit Admin"}
              </h3>
              <button
                onClick={() => {
                  setModalOpen(null)
                  setFormData({})
                  setSelectedAdmin(null)
                  setError("")
                }}
                className="text-gray-500 hover:text-gray-700 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {!isCreateMode && !isAuthorized && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <p className="text-sm text-yellow-800">You don't have permission to edit this admin. Viewing in read-only mode.</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isCreateMode && !isAuthorized}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password || ""}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={!isCreateMode && !isAuthorized}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role || ""}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  disabled={!isCreateMode && !isAuthorized}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select a role</option>
                  <option value="admin">Admin</option>
                  <option value="modulator">Modulator</option>
                </select>
              </div>
            </div>
            {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setModalOpen(null)
                  setFormData({})
                  setSelectedAdmin(null)
                  setError("")
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Go Back
              </button>
              {(isCreateMode || isAuthorized) && (
                <button
                  onClick={isCreateMode ? handleCreateAdmin : handleUpdateAdmin}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
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
              <h3 className="text-lg font-bold text-gray-900">Delete Admin</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this admin? This action cannot be undone.</p>
            {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalOpen(null)
                  setSelectedAdmin(null)
                  setError("")
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAdmin}
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

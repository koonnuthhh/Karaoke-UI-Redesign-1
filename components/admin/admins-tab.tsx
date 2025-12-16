"use client"

import { useState } from "react"
import { Edit, Trash2, Plus, AlertCircle } from "lucide-react"
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
      const res = await fetch("/api/admin", {
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
        setError(data.message || "Failed to create admin")
      }
    } catch (err) {
      setError("Network error while creating admin")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateAdmin = async () => {
    try {
      setIsSubmitting(true)
      setError("")
      const res = await fetch(`/api/admin/${selectedAdmin?.id}`, {
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
        setSelectedAdmin(null)
        onRefresh()
      } else {
        setError(data.message || "Failed to update admin")
      }
    } catch (err) {
      setError("Network error while updating admin")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAdmin = async () => {
    if (!adminCredential) {
      setError("Authentication required. Please login again.")
      return
    }

    if (!selectedAdmin?.id) {
      setError("Invalid admin ID. Please try again.")
      return
    }

    try {
      setIsSubmitting(true)
      setError("")
      const res = await fetch(`/api/admin/${selectedAdmin.id}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data: { admin_id: adminCredential } })
      })
      
      const data = await res.json()
      if (res.ok) {
        setModalOpen(null)
        setSelectedAdmin(null)
        onRefresh()
      } else {
        const message = data.message || "Failed to delete admin"
        setError(message === "NOT_FOUND" ? "Admin not found or already deleted" : message)
      }
    } catch (err) {
      setError("Network error while deleting admin")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Manage Admins</h2>
          <button
            onClick={() => {
              setModalOpen("create")
              setSelectedAdmin(null)
              setFormData({})
              setError("")
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Create Admin
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
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Username</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Role</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Array.isArray(admins) ? admins.map((admin, index) => (
                  <tr key={admin.id || `admin-${index}`}>
                    <td className="px-6 py-4 text-sm text-gray-900">{admin.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{admin.username}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{admin.role}</td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => {
                          setSelectedAdmin(admin)
                          setFormData(admin)
                          setModalOpen("edit")
                          setError("")
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAdmin(admin)
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
                  <tr key="no-admins">
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No admins found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Admin Modal */}
      {(modalOpen === "create" || modalOpen === "edit") && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {modalOpen === "create" ? "Create New Admin" : "Edit Admin"}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username || ""}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password || ""}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input
                  type="text"
                  value={formData.role || ""}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
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
                onClick={modalOpen === "create" ? handleCreateAdmin : handleUpdateAdmin}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
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

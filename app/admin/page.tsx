"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar } from "lucide-react"
import HomePage from "app/page"

export default function AdminBookings() {
  const [adminCredential, setAdminCredential] = useState()
  const [credentials, setCredentials] = useState({ username: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("https://686ff7bae602.ngrok-free.app/api/admin", {
        method: "GET",
        headers: {
          "username": credentials.username,
          "password": credentials.password
        },
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || "Login failed")
      }

      const data = await res.json()

      if (data.success) {
        setAdminCredential(data.credential)
      } else {
        throw new Error(data.message || "Invalid credentials")
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  // If not authenticated, show the login form
  if (!adminCredential) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-96">
          <div className="text-center mb-6">
            <Calendar className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
            <p className="text-gray-600 mt-2">Access booking management system</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login to Admin Panel"}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // If authenticated, show the HomePage component
  return <HomePage adminCredential={adminCredential} />
}
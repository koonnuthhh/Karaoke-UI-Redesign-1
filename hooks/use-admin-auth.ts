import { useEffect, useState } from "react"
import type { AdminUser } from "@/types"
import { getAdminUser, setAdminUser, clearAdminUser, loginAdmin, logoutAdmin } from "@/lib/admin-service"

export interface AdminAuthState {
  adminUser: AdminUser | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export function useAdminAuth() {
  const [authState, setAuthState] = useState<AdminAuthState>({
    adminUser: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  })

  // Check stored admin user on mount
  useEffect(() => {
    const checkStoredUser = () => {
      try {
        const storedUser = getAdminUser()
        
        if (storedUser) {
          setAuthState({
            adminUser: storedUser,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          })
        } else {
          setAuthState({
            adminUser: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          })
        }
      } catch (error) {
        console.error("Auth check error:", error)
        clearAdminUser()
        setAuthState({
          adminUser: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        })
      }
    }

    checkStoredUser()
  }, [])

  const login = async (username: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await loginAdmin(username, password)
      
      if (response.success && response.data) {
        const adminUser: AdminUser = {
          admin_id: response.data.admin_id,
          username: response.data.username,
          email: response.data.email,
          role: response.data.role,
          login_time: response.data.login_time,
        }
        setAdminUser(adminUser)
        setAuthState({
          adminUser,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        })
        return { success: true }
      } else {
        const errorMsg = response.error?.message || "Login failed"
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMsg,
        }))
        return { success: false, error: errorMsg }
      }
    } catch (error: any) {
      const errorMsg = error.message || "An error occurred during login"
      console.error("Login error:", error)
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMsg,
      }))
      return { success: false, error: errorMsg }
    }
  }

  const logout = () => {
    logoutAdmin()
    setAuthState({
      adminUser: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    })
  }

  return {
    adminUser: authState.adminUser,
    adminCredential: authState.adminUser?.admin_id || null,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    error: authState.error,
    login,
    logout,
  }
}


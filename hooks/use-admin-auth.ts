import { useEffect, useState } from "react"

export interface AdminAuthState {
  adminCredential: string | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export function useAdminAuth() {
  const [authState, setAuthState] = useState<AdminAuthState>({
    adminCredential: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  })

  // Check and validate stored credential on mount
  useEffect(() => {
    const validateStoredCredential = async () => {
      try {
        const storedCredential = localStorage.getItem("admin_credential")

        if (!storedCredential) {
          setAuthState({
            adminCredential: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          })
          return
        }

        // Validate credential with backend
        const res = await fetch("/api/admin/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            credential: storedCredential,
          },
        })

        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setAuthState({
              adminCredential: storedCredential,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            })
          } else {
            // Invalid credential
            localStorage.removeItem("admin_credential")
            setAuthState({
              adminCredential: null,
              isLoading: false,
              isAuthenticated: false,
              error: "Session expired. Please login again.",
            })
          }
        } else {
          // Backend error or credential invalid
          localStorage.removeItem("admin_credential")
          setAuthState({
            adminCredential: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          })
        }
      } catch (error) {
        console.error("Auth validation error:", error)
        localStorage.removeItem("admin_credential")
        setAuthState({
          adminCredential: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        })
      }
    }

    validateStoredCredential()
  }, [])

  const login = (credential: string) => {
    localStorage.setItem("admin_credential", credential)
    setAuthState({
      adminCredential: credential,
      isLoading: false,
      isAuthenticated: true,
      error: null,
    })
  }

  const logout = () => {
    localStorage.removeItem("admin_credential")
    setAuthState({
      adminCredential: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    })
  }

  const clearError = () => {
    setAuthState(prev => ({
      ...prev,
      error: null,
    }))
  }

  return {
    ...authState,
    login,
    logout,
    clearError,
  }
}

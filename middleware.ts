import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Store maintenance status in memory (in production, use database)
let maintenanceEnabled = false

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip middleware for admin pages and API routes
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/maintenance")
  ) {
    return NextResponse.next()
  }

  // Check maintenance status for public pages
  if (maintenanceEnabled) {
    return NextResponse.redirect(new URL("/maintenance", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}

// Utility to update maintenance status (used by API routes)
export function setMaintenanceEnabled(enabled: boolean) {
  maintenanceEnabled = enabled
}

export function isMaintenanceEnabled() {
  return maintenanceEnabled
}

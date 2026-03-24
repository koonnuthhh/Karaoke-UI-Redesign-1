"use client"

import { siteConfig } from "@/config/site-config"

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gray-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: "2s" }}></div>

      <div className="text-center relative z-10">
        {/* Favicon with bounce animation */}
        <div className="mb-8 flex justify-center">
          <div >
            <img
              src="/favicon.ico"
              alt="Favicon"
              className="w-20 h-20 drop-shadow-lg"
            />
          </div>
        </div>

        {/* Under Maintenance Text */}
        <h1 className="text-5xl sm:text-6xl font-bold text-red-600 mb-4 tracking-tight">
          Under Maintenance
        </h1>

        {/* Please Wait Text */}
        <p className="text-lg sm:text-xl text-gray-600 mb-8 font-medium">
          Please wait while we improve your experience
        </p>

        {/* Extra decoration - dots */}
        <div className="flex justify-center items-center gap-2 mb-8">
          <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: siteConfig.theme.primary }}></span>
          <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: siteConfig.theme.primary, animationDelay: "0.2s" }}></span>
          <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: siteConfig.theme.primary, animationDelay: "0.4s" }}></span>
        </div>

        {/* Secondary message */}
        <p className="text-sm sm:text-base text-gray-500 mt-6">
          We'll be back online shortly
        </p>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  )
}

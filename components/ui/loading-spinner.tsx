import { siteConfig } from "../../config/site-config"

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  return (
    <div 
      className={`animate-spin rounded-full border-2 ${sizeClasses[size]}`}
      style={{
        borderColor: '#e5e7eb',
        borderTopColor: siteConfig.theme.primary
      }}
    />
  )
}

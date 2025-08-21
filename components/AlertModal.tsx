"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { siteConfig } from "../config/site-config"

interface Action {
  label: string
  onClick: () => void | Promise<void>
  variant?: keyof typeof siteConfig.theme
  textcolor?: string
}

interface AlertModalProps {
  isOpen: boolean
  message: string
  onClose: () => void
  actions?: Action[]
}

export function AlertModal({ isOpen, message, onClose, actions }: AlertModalProps) {
  const [clickedIndex, setClickedIndex] = useState<number | null>(null)

  if (!isOpen) return null

  const getButtonStyle = (variant: Action["variant"], isClicked: boolean, textColor?: Action["textcolor"]) => {
    const base = {
      padding: "0.5rem 1.5rem",
      borderRadius: "0.375rem",
      cursor: isClicked ? "not-allowed" : "pointer",
      opacity: isClicked ? 0.6 : 1,
      transition: "all 0.2s",
      color: textColor || "#000000ff",
      fontWeight: 500,
    }

    const bgColor = variant ? siteConfig.theme[variant] : siteConfig.theme.roomavailable

    return { ...base, backgroundColor: bgColor }
  }

  const handleClick = async (action: Action, index: number) => {
    setClickedIndex(index)
    try {
      await action.onClick()
    } finally {
      // keep button faded after click
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {siteConfig.content.booking.modalTitle}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-center">
          <p className="text-gray-700 text-lg font-medium">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-3 p-6 border-t flex-wrap">
          {actions && actions.length > 0 ? (
            actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleClick(action, idx)}
                disabled={clickedIndex !== null}
                style={getButtonStyle(action.variant, clickedIndex === idx, action.textcolor)}
              >
                {clickedIndex === idx ? "Processing..." : action.label}
              </button>
            ))
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={getButtonStyle("roomavailable", false,)}
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

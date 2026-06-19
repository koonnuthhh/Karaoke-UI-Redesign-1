"use client"

import { useState, useEffect } from "react"
import { Check, X, Loader2 } from "lucide-react"
import { siteConfig } from "@/config/site-config"

interface PromoInputProps {
  cartTotal: number
  roomId?: string
  onPromoApplied?: (finalPrice: number, discountAmount: number, promoCode: string, promotionId?: string) => void
  externalDiscount?: { original_price: number; discount_amount: number; final_price: number; promotion_id?: string } | null
}

interface DiscountResult {
  original_price: number
  discount_amount: number
  final_price: number
  type?: string
  message?: string
}

export function PromoInput({ cartTotal, roomId, onPromoApplied, externalDiscount }: PromoInputProps) {
  const [code, setCode] = useState("")
  const [discount, setDiscount] = useState<DiscountResult | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [validationMessage, setValidationMessage] = useState("")
  const [validationSuccess, setValidationSuccess] = useState(false)

  // Use external discount from parent when available
  const displayDiscount = externalDiscount || discount

  const handleValidateCode = async () => {
    const trimmedCode = code.trim().toUpperCase()

    if (!trimmedCode) {
      setError("Please enter a promotion code")
      setValidationMessage("")
      return
    }

    setLoading(true)
    setError("")
    setValidationMessage("")

    try {
      const response = await fetch("/api/user/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          data: { 
            code: trimmedCode,
            ...(roomId && { roomId })
          } 
        }),
      })

      const result = await response.json()

      if (result.success && result.data) {
        setValidationMessage(` ${result.data.message || "Code is valid!"}`)
        setValidationSuccess(true)
        setError("")
      } else {
        setValidationMessage(` ${result.error?.message || "Invalid promotion code"}`)
        setValidationSuccess(false)
      }
    } catch (err: any) {
      setValidationMessage(` ${err.message || "Failed to validate code"}`)
      setValidationSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyPromo = async () => {
    const trimmedCode = code.trim().toUpperCase()

    if (!trimmedCode) {
      setError("Please enter a promotion code")
      return
    }

    setLoading(true)
    setError("")

    try {
      const requestBody: any = {
        data: {
          code: trimmedCode,
          total_price: cartTotal,
        },
      }
      
      // Include roomId if provided (for room-specific promotions)
      if (roomId) {
        requestBody.data.roomId = roomId
      }
      
      const response = await fetch("/api/user/promotions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (result.success && result.data) {
        const discountData = result.data
        setDiscount(discountData)
        setError("")
        setValidationMessage("")
        
        // Notify parent component before clearing code
        if (onPromoApplied) {
          // Use promotion_id from API, or fall back to using the trimmed code as identifier
          const promotionIdentifier = discountData.promotion_id || trimmedCode
          onPromoApplied(discountData.final_price, discountData.discount_amount, trimmedCode, promotionIdentifier)
        }
        
        setCode("")  
      } else {
        setError(
          result.error?.message ||
          result.message ||
          "Failed to apply promotion code"
        )
        setDiscount(null)
      }
    } catch (err: any) {
      setError(err.message || "Failed to apply promo code")
      setDiscount(null)
    } finally {
      setLoading(false)
    }
  }

  const handleClearDiscount = () => {
    setDiscount(null)
    setCode("")
    setValidationMessage("")
    setValidationSuccess(false)
    setError("")
    
    // Notify parent component to reset price to original
    if (onPromoApplied) {
      onPromoApplied(cartTotal, 0, "", "")
    }
  }

  return (
    <div className="promo-input-section space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900">Have a promotion code?</h3>

      {displayDiscount ? (
        // Display discount summary
        <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Original Price:</span>
            <span className="text-gray-900 font-medium">
              ฿{displayDiscount.original_price.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-green-200 pt-2">
            <span className="text-gray-600">Discount:</span>
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-medium">
                -฿{displayDiscount.discount_amount.toFixed(2)}
              </span>
              {displayDiscount.discount_amount > 0 && (
                <span className="text-green-600 text-xs font-semibold bg-green-100 px-2 py-1 rounded">
                  {((displayDiscount.discount_amount / displayDiscount.original_price) * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-base border-t border-green-200 pt-2">
            <span className="font-semibold text-gray-900">Final Price:</span>
            <span className="font-bold text-green-600 text-lg">
              ฿{displayDiscount.final_price.toFixed(2)}
            </span>
          </div>
          <button
            onClick={handleClearDiscount}
            className="w-full mt-2 text-xs px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-white transition"
          >
            Remove Promo Code
          </button>
        </div>
      ) : (
        // Input field and buttons
        <div className="space-y-2">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setValidationMessage("")
              setValidationSuccess(false)
            }}
            placeholder="Enter promo code"
            disabled={loading}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />

          <div className="flex gap-2">
            <button
              onClick={handleValidateCode}
              disabled={loading || !code.trim()}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking...
                </>
              ) : (
                "Validate"
              )}
            </button>
            <button
              onClick={handleApplyPromo}
              disabled={loading || !code.trim()}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Applying...
                </>
              ) : (
                "Apply"
              )}
            </button>
          </div>

          {validationMessage && (
            <div
              className={`flex items-center gap-2 text-sm p-2 rounded ${
                validationSuccess
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {validationSuccess ? (
                <Check className="w-4 h-4 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{validationMessage}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm p-2 bg-red-50 text-red-700 rounded border border-red-200">
              <X className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

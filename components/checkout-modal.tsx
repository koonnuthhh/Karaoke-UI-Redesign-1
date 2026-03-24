"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { X, Upload, Check, AlertCircle, Loader2 } from "lucide-react"
import { LoadingSpinner } from "../components/ui/loading-spinner"
import { PromoInput } from "./promo-input"
import { BookingRequest } from "types"
import promptpay from "promptpay-qr"
import { QRCodeCanvas } from "qrcode.react"

import { siteConfig } from "config/site-config"
import { on } from "events"
interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  bookingData: BookingRequest
}

type CheckoutStep = "booking" | "payment" | "slip-upload" | "verification" | "success"

interface PaymentData {
  qrPayload: string
  promptPayNumber: string
  amount: number
  accountName: string
  bookingId: string
}

interface SlipVerificationResult {
  success: boolean
  amount: number
  timestamp: string
  transactionId: string
  message: string
}

export function CheckoutModal({ isOpen, onClose, bookingData }: CheckoutModalProps) {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("booking")
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [verificationResult, setVerificationResult] = useState<SlipVerificationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [Timeout, setTimeoutState] = useState(300); // 5 minutes in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutStartedRef = useRef(false);
  const [isTimeoutExpired, setIsTimeoutExpired] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0)
  const [finalPrice, setFinalPrice] = useState(bookingData.totalPrice);
  const [promotionId, setPromotionId] = useState<string>("")

  // Handle timeout expiration
  useEffect(() => {
    if (isTimeoutExpired) {
      setError("Session timed out. Please start your booking again.");
      onClose();
    }
  }, [isTimeoutExpired, onClose]);

  // Start timeout countdown when payment step begins
  useEffect(() => {
    if (currentStep === "payment" && !timeoutStartedRef.current) {
      timeoutStartedRef.current = true;
      console.log("Payment timeout started");
      
      timerRef.current = setInterval(() => {
        setTimeoutState(prevTimeout => {
          const newTimeout = prevTimeout - 1;
          console.log("Session time remaining: ", newTimeout);
          
          if (newTimeout <= 0) {
            setIsTimeoutExpired(true);
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          
          return newTimeout;
        });
      }, 1000); // Update every second
    }

    // // Cleanup function to clear the timer when component unmounts
    // return () => {
    //   if (timerRef.current) {
    //     console.log("Cleaning up payment timeout timer");
    //     clearInterval(timerRef.current);
    //     timerRef.current = null;
    //   }
    // };
  }, [currentStep]) // Only depend on currentStep

  // Helper function to format time
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleBookingSubmit = async () => {
    setIsLoading(true)
    setError("")
    //console.log("bookingData.roomName: ", bookingData.roomName)
    try {
      // Step 1: Submit booking request
      //console.log("bookingData: ",bookingData)
      // console.log("bookingData: ", bookingData)
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      })

      const result = await response.json()
      if (result.success && result.data.booking_id) {
        // Step 2: Generate QR code for payment (use finalPrice which includes discount)
        const promptPayNumber = siteConfig.payment.promptPayNumber
        const qrPayload = promptpay(promptPayNumber, { amount: finalPrice })
        //console.log('qrCodeUrl: ', qrCodeUrl)

        setPaymentData({
          qrPayload,
          promptPayNumber,
          accountName: siteConfig.payment.accountName,
          amount: finalPrice,
          bookingId: result.data.booking_id,
        })

        setCurrentStep("payment")
      } else {
        setError(result.message || "Failed to create booking")
      }
    } catch (err) {
      console.error("Booking Error: ", err)
      setError("Network error or Someone has booked This time already. Please reload and try again ")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSlipUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file")
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB")
        return
      }

      setSlipFile(file)
      setError("")

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setSlipPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSlipVerification = async () => {
    if (!slipFile || !paymentData) return;
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("bookingId", paymentData.bookingId);
      formData.append("expectedAmount", paymentData.amount.toString());
      formData.append("slipFile", slipFile);

      const response = await fetch("/api/verify-slip", {
        method: "POST",
        body: formData,
      });

      const result: SlipVerificationResult = await response.json();

      if (result.success) {
        const booked_response = await fetch("/api/bookings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            booking_id: paymentData.bookingId,
            booking_status: "booked",
            ...(promotionId && { promotion_id: promotionId }),
          }),
        });

        const booked_result = await booked_response.json();

        if (booked_result.success) {
          setVerificationResult(result);
          setCurrentStep("success");
        }
      } else {
        setError(result.message || "Payment verification failed");
        setCurrentStep("slip-upload");
      }
    } catch (err) {
      setError("Failed to verify payment slip. Please try again or crop out the QR section in your slip.");
      setCurrentStep("slip-upload");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!paymentData) return;
    
    try {
      const response = await fetch("/api/bookings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_id: paymentData.bookingId,
          booking_status: "cancelled",
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Reset state and go back to booking step
        setPaymentData(null);
        setSlipFile(null);
        setSlipPreview(null);
        setCurrentStep("booking");
        setError("");
      }
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      setError("Failed to cancel booking. Please try again.");
    }
  };


  const renderBookingStep = () => (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4" style={{ color: siteConfig.theme.maintext }}>Confirm Your Booking</h2>

      <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#f3f4f6' }}>
        <h3 className="font-semibold mb-2" style={{ color: siteConfig.theme.maintext }}>Booking Summary</h3>
        <div className="space-y-1 text-sm" style={{ color: siteConfig.theme.secondary }}>
          <p>
            <span className="font-medium">Date:</span> {new Date(bookingData.date).toLocaleDateString()}
          </p>
          <p>
            <span className="font-medium">Room:</span> {bookingData.roomName}
          </p>
          <p>
            <span className="font-medium">Time: </span>
            {bookingData.timeSlots[0]} - {bookingData.timeSlots[1]}
          </p>
          <p>
            <span className="font-medium">Duration: </span>
            {bookingData.duration} minutes
          </p>
          <p>
            <span className="font-medium">Customer:</span> {bookingData.customerName}
          </p>
          {/* <p>
            <span className="font-medium">Email:</span> {bookingData.customerEmail || "None"}
          </p> */}
          <p>
            <span className="font-medium">Phone:</span> {bookingData.customerPhone}
          </p>
          <p className={discountAmount > 0 ? "line-through" : ""}>
            <span className="font-medium">Original Amount:</span> ฿{bookingData.totalPrice.toFixed(2)}
          </p>
          {discountAmount > 0 && (
            <>
              <p>
                <span className="font-medium text-green-600">Discount:</span> <span className="text-green-600">-฿{discountAmount.toFixed(2)}</span>
              </p>
              <p>
                <span className="font-medium">Total Amount:</span> <span className="font-bold text-lg text-green-600">฿{finalPrice.toFixed(2)}</span>
              </p>
            </>
          )}
          {discountAmount === 0 && (
            <p>
              <span className="font-medium">Total Amount:</span> ฿{finalPrice.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Promo Input Component */}
      <PromoInput 
        cartTotal={bookingData.totalPrice} 
        onPromoApplied={(newFinalPrice, discount, promoCode, promotionId) => {
          setFinalPrice(newFinalPrice)
          setDiscountAmount(discount)
          setPromotionId(promotionId || "")
        }}
      />

      {error && (
        <div className="p-3 border rounded-md mb-4 mt-4" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
          <p className="text-sm" style={{ color: siteConfig.theme.error }}>{error}</p>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 rounded-md transition-colors"
          style={{ 
            color: siteConfig.theme.maintext, 
            backgroundColor: '#f3f4f6',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
        >
          Cancel
        </button>
        <button
          onClick={handleBookingSubmit}
          disabled={isLoading}
          className="flex-1 px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 flex items-center justify-center"
          style={{ backgroundColor: siteConfig.theme.primary }}
          onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = siteConfig.theme.secondary)}
          onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = siteConfig.theme.primary)}
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-2">Processing...</span>
            </>
          ) : (
            "Proceed to Payment"
          )}
        </button>
      </div>
    </div>
  )

  const renderPaymentStep = () => (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4" style={{ color: siteConfig.theme.maintext }}>Payment via PromptPay</h2>

      <div className="text-center mb-6">
        <div className="bg-white p-4 rounded-lg border-2 border-dashed mb-4" style={{ borderColor: '#d1d5db' }}>
          {paymentData?.qrPayload && (
            <QRCodeCanvas
              value={paymentData.qrPayload}
              size={256} // Sharp resolution
              level="H"  // High error correction
              className="mx-auto"
            />
          )}
        </div>

        <div className="space-y-2" style={{ color: siteConfig.theme.maintext }}>
          <p className="text-lg font-semibold">Amount to Pay: ฿{finalPrice.toFixed(2)}</p>
          <p className="text-sm">PromptPay Number: {paymentData?.promptPayNumber}</p>
          <p className="text-sm">Account Name: {paymentData?.accountName}</p>
          <p className="text-sm" style={{ color: '#6b7280' }}>Booking ID: {paymentData?.bookingId}</p>
        </div>
      </div>

      <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#eff6ff' }}>
        <h3 className="font-semibold mb-2" style={{ color: siteConfig.theme.secondary }}>Payment Instructions</h3>
        <ol className="text-sm space-y-1" style={{ color: siteConfig.theme.secondary }}>
          <li>1. Scan the QR code with your banking app</li>
          <li>2. Verify the amount and PromptPay number</li>
          <li>3. Complete the payment</li>
          <li>4. Take a screenshot of the payment slip</li>
          <li>5. Upload the slip in the next step</li>
        </ol>
        <ol className="text-sm font-semibold mb-2" style={{ color: siteConfig.theme.error }}>
          *If you can't scan please transfer money using the promptpay number*
        </ol>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCancelBooking}
          className="flex-1 px-4 py-2 rounded-md transition-colors"
          style={{ 
            color: siteConfig.theme.primary, 
            backgroundColor: '#f3f4f6'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep("slip-upload")}
          // onClick={() => setCurrentStep("success")}
          className="flex-1 px-4 py-2 text-white rounded-md transition-colors"
          style={{ backgroundColor: siteConfig.theme.primary }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = siteConfig.theme.secondary}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = siteConfig.theme.primary}
        >
          I've Made Payment
        </button>
      </div>
    </div>
  )

  const renderSlipUploadStep = () => (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4" style={{ color: siteConfig.theme.maintext }}>Upload Payment Slip</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2" style={{ color: siteConfig.theme.maintext }}>Upload your payment slip screenshot</label>

        <div className="border-2 border-dashed rounded-lg p-6 text-center transition-colors" 
             style={{ borderColor: '#d1d5db' }}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = siteConfig.theme.maintext}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
        >
          {slipPreview ? (
            <div className="space-y-4">
              <img
                src={slipPreview || "/placeholder.svg"}
                alt="Payment slip preview"
                className="mx-auto max-h-48 rounded-lg"
              />
              <p className="text-sm" style={{ color: siteConfig.theme.maintext }}>{slipFile?.name}</p>
              <button
                onClick={() => {
                  setSlipFile(null)
                  setSlipPreview(null)
                }}
                className="text-sm transition-colors"
                style={{ color: siteConfig.theme.error }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="mx-auto w-12 h-12" style={{ color: '#9ca3af' }} />
              <div>
                <label className="cursor-pointer">
                  <span className="font-medium transition-colors" 
                        style={{ color: siteConfig.theme.primary }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >Click to upload</span>
                  <span style={{ color: siteConfig.theme.primary }}> or drag and drop</span>
                  <input type="file" accept="image/*" onChange={handleSlipUpload} className="hidden" />
                </label>
              </div>
              <p className="text-xs" style={{ color: '#6b7280' }}>PNG, JPG, GIF up to 5MB</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 border rounded-md mb-4" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" style={{ color: siteConfig.theme.error }} />
            <p className="text-sm" style={{ color: siteConfig.theme.error }}>{error}</p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setCurrentStep("payment")}
          className="flex-1 px-4 py-2 rounded-md transition-colors"
          style={{ 
            color: siteConfig.theme.primary, 
            backgroundColor: '#f3f4f6'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep("verification")}
          disabled={!slipFile}
          className="flex-1 px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50"
          style={{ backgroundColor: siteConfig.theme.primary }}
          onMouseEnter={(e) => !(!slipFile) && (e.currentTarget.style.backgroundColor = siteConfig.theme.secondary)}
          onMouseLeave={(e) => !(!slipFile) && (e.currentTarget.style.backgroundColor = siteConfig.theme.primary)}
        >
          Verify Payment
        </button>
      </div>
    </div>
  )

  const renderVerificationStep = () => (
    <div className="p-6 text-center">
      <div className="mb-6">
        <Loader2 className="mx-auto w-16 h-16 animate-spin" style={{ color: siteConfig.theme.maintext }} />
        <h2 className="text-xl font-bold mt-4 mb-2" style={{ color: siteConfig.theme.maintext }}>Verifying Payment</h2>
        <p style={{ color: siteConfig.theme.secondary }}>Please wait while we verify your payment slip...</p>
      </div>

      <div className="rounded-lg p-4" style={{ backgroundColor: '#eff6ff' }}>
        <p className="text-sm" style={{ color: siteConfig.theme.secondary }}>
          This process usually takes 10-30 seconds. Please don't close this window.
        </p>
      </div>
    </div>
  )

  const renderSuccessStep = () => (
    <div className="p-6 text-center">
      <div className="mb-6">
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#f0fdf4' }}>
          <Check className="w-8 h-8" style={{ color: siteConfig.theme.success }} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
        <p className="text-gray-600">Your payment has been verified and your booking is confirmed.</p>

      </div>

      {verificationResult && paymentData && (
        <div className="bg-green-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-green-900 mb-3">Booking Details</h3>
          <div className="space-y-2 text-sm text-green-800">
            <div className="flex justify-between">
              <span>Booking ID:</span>
              <span className="font-mono">{paymentData.bookingId}</span>
            </div>
            {/* <div className="flex justify-between">
              <span>Transaction ID:</span>
              <span className="font-mono">{verificationResult.transactionId}</span>
            </div> */}
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span>฿{verificationResult.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Time:</span>
              <span>{new Date(verificationResult.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{bookingData.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(bookingData.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Room:</span>
              <span>{bookingData.roomName}</span>
            </div>
            <div className="flex justify-between">
              <span>Time: </span>
              <span>{bookingData.timeSlots[0]} - {bookingData.timeSlots[1]}</span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{bookingData.duration} minutes</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* <p className="text-sm text-gray-600">A confirmation email has been sent to {bookingData.customerEmail}</p> */}
        <p style={{ color: siteConfig.theme.error }}>Don't forget to capture this screen!!</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 text-white rounded-md transition-colors"
          style={{ backgroundColor: siteConfig.theme.primary }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = siteConfig.theme.secondary}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = siteConfig.theme.primary}
        >
          Close
        </button>
      </div>
    </div>
  )

  // Auto-start verification when reaching verification step
  if (currentStep === "verification" && !isLoading) {
    handleSlipVerification()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold" style={{ color: siteConfig.theme.maintext }}>
              {currentStep === "booking" && "Checkout"}
              {currentStep === "payment" && "Payment"}
              {currentStep === "slip-upload" && "Upload Slip"}
              {currentStep === "verification" && "Verification"}
              {currentStep === "success" && "Success"}
            </h2>
            {(currentStep === "payment" || currentStep === "slip-upload") && timeoutStartedRef.current && (
              <div className="bg-white px-2 py-2 border rounded text-sm font-medium" 
                   style={{ 
                     color: siteConfig.theme.maintext, 
                     borderColor: '#d1d5db' 
                   }}>
                ⏱️ {formatTime(Timeout)}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: '#9ca3af' }}
            disabled={currentStep === "verification"}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.color = '#6b7280')}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.color = '#9ca3af')}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-between text-xs">
            <div className={`flex items-center ${currentStep === "booking" ? "text-purple-600" : "text-gray-400"}`}>
              <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
              Booking
            </div>
            <div className={`flex items-center ${currentStep === "payment" ? "text-purple-600" : "text-gray-400"}`}>
              <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
              Payment
            </div>
            <div className={`flex items-center ${currentStep === "slip-upload" ? "text-purple-600" : "text-gray-400"}`}>
              <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
              Upload
            </div>
            <div
              className={`flex items-center ${currentStep === "verification" ? "text-purple-600" : "text-gray-400"}`}
            >
              <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
              Verify
            </div>
            <div className={`flex items-center ${currentStep === "success" ? "text-green-600" : "text-gray-400"}`}>
              <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
              Success
            </div>
          </div>
        </div>

        {currentStep === "booking" && renderBookingStep()}
        {currentStep === "payment" && renderPaymentStep()}
        {currentStep === "slip-upload" && renderSlipUploadStep()}
        {currentStep === "verification" && renderVerificationStep()}
        {currentStep === "success" && renderSuccessStep()}
      </div>
    </div>
  )
}

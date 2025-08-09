"use client"

import type React from "react"
import { useState } from "react"
import { X, Upload, Check, AlertCircle, Loader2 } from "lucide-react"
import { LoadingSpinner } from "../components/ui/loading-spinner"
import { BookingRequest } from "types"

import { siteConfig } from "config/site-config"
import { tr } from "date-fns/locale"

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  bookingData: BookingRequest
}

type CheckoutStep = "booking" | "payment" | "slip-upload" | "verification" | "success"

interface PaymentData {
  qrCodeUrl: string
  promptPayNumber: string
  amount: number
  bookingId: string
}

interface SlipVerificationResult {
  success: boolean
  amount: number
  timestamp: string
  transactionId: string
  message: string
}

async function decodeSlipQR(slipFile: File) {
  const reader = new BrowserQRCodeReader()

  const imageUrl = URL.createObjectURL(slipFile)
  const img = new Image()
  img.src = imageUrl

  return new Promise<string>((resolve, reject) => {
    img.onload = async () => {
      try {
        const result = await reader.decodeFromImageElement(img)
        resolve(result.getText()) // ✅ this is your QR content
      } catch (err) {
        reject("Failed to decode QR")
      }
    }
    img.onerror = () => reject("Failed to load image")
  })
}

export function CheckoutModal({ isOpen, onClose, bookingData }: CheckoutModalProps) {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("booking")
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [verificationResult, setVerificationResult] = useState<SlipVerificationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleBookingSubmit = async () => {
    setIsLoading(true)
    setError("")

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
        // Step 2: Generate QR code for payment
        const promptPayNumber = siteConfig.payment.promptPayNumber
        const qrCodeUrl = `https://promptpay.io/${promptPayNumber}/${bookingData.totalPrice}`
        //console.log('qrCodeUrl: ', qrCodeUrl)

        setPaymentData({
          qrCodeUrl,
          promptPayNumber,
          amount: bookingData.totalPrice,
          bookingId: result.data.booking_id,
        })

        setCurrentStep("payment")
      } else {
        setError(result.message || "Failed to create booking")
      }
    } catch (err) {
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


  const renderBookingStep = () => (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Your Booking</h2>

      <div className="bg-purple-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-purple-900 mb-2">Booking Summary</h3>
        <div className="space-y-1 text-sm text-purple-800">
          <p>
            <span className="font-medium">Date:</span> {new Date(bookingData.date).toLocaleDateString()}
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
          <p>
            <span className="font-medium">Email:</span> {bookingData.customerEmail || "None"}
          </p>
          <p>
            <span className="font-medium">Phone:</span> {bookingData.customerPhone}
          </p>
          <p>
            <span className="font-medium">Total Amount:</span> ฿{bookingData.totalPrice.toFixed(2)}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleBookingSubmit}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center"
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
      <h2 className="text-xl font-bold text-gray-900 mb-4">Payment via PromptPay</h2>

      <div className="text-center mb-6">
        <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 mb-4">
          {paymentData && (
            <img
              src={paymentData.qrCodeUrl || "/placeholder.svg"}
              alt="PromptPay QR Code"
              className="mx-auto w-48 h-48 object-contain"
            />
          )}
        </div>

        <div className="space-y-2 text-gray-700">
          <p className="text-lg font-semibold">Amount to Pay: ฿{paymentData?.amount.toFixed(2)}</p>
          <p className="text-sm">PromptPay Number: {paymentData?.promptPayNumber}</p>
          <p className="text-sm text-gray-500">Booking ID: {paymentData?.bookingId}</p>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">Payment Instructions</h3>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Scan the QR code with your banking app</li>
          <li>2. Verify the amount and PromptPay number</li>
          <li>3. Complete the payment</li>
          <li>4. Take a screenshot of the payment slip</li>
          <li>5. Upload the slip in the next step</li>
        </ol>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setCurrentStep("booking")}
          className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep("slip-upload")}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
        >
          I've Made Payment
        </button>
      </div>
    </div>
  )

  const renderSlipUploadStep = () => (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Upload Payment Slip</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Upload your payment slip screenshot</label>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
          {slipPreview ? (
            <div className="space-y-4">
              <img
                src={slipPreview || "/placeholder.svg"}
                alt="Payment slip preview"
                className="mx-auto max-h-48 rounded-lg"
              />
              <p className="text-sm text-gray-600">{slipFile?.name}</p>
              <button
                onClick={() => {
                  setSlipFile(null)
                  setSlipPreview(null)
                }}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="mx-auto w-12 h-12 text-gray-400" />
              <div>
                <label className="cursor-pointer">
                  <span className="text-purple-600 hover:text-purple-700 font-medium">Click to upload</span>
                  <span className="text-gray-600"> or drag and drop</span>
                  <input type="file" accept="image/*" onChange={handleSlipUpload} className="hidden" />
                </label>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setCurrentStep("payment")}
          className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep("verification")}
          disabled={!slipFile}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          Verify Payment
        </button>
      </div>
    </div>
  )

  const renderVerificationStep = () => (
    <div className="p-6 text-center">
      <div className="mb-6">
        <Loader2 className="mx-auto w-16 h-16 text-purple-600 animate-spin" />
        <h2 className="text-xl font-bold text-gray-900 mt-4 mb-2">Verifying Payment</h2>
        <p className="text-gray-600">Please wait while we verify your payment slip...</p>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          This process usually takes 10-30 seconds. Please don't close this window.
        </p>
      </div>
    </div>
  )

  const renderSuccessStep = () => (
    <div className="p-6 text-center">
      <div className="mb-6">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-600" />
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
        <p className="text-red-600">Don't forget to capture this screen!!</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
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
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {currentStep === "booking" && "Checkout"}
            {currentStep === "payment" && "Payment"}
            {currentStep === "slip-upload" && "Upload Slip"}
            {currentStep === "verification" && "Verification"}
            {currentStep === "success" && "Success"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={currentStep === "verification"}
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

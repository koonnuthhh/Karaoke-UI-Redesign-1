"use client"

import { useMemo } from "react"
import QRCode from "qrcode.react"
import promptpay from "promptpay-qr"

export default function PromptPayQR({ number, amount }: { number: string; amount?: number }) {
  // Generate QR data once
  const qrData = useMemo(() => {
    return promptpay(number, { amount }) // amount is optional
  }, [number, amount])

  return (
    <div className="flex flex-col items-center space-y-3">
      <QRCode value={qrData} size={200} level="H" />
      <p className="text-sm text-gray-700">
        PromptPay: <strong>{number}</strong>
      </p>
      {amount && (
        <p className="text-sm">
          Amount: <strong>฿{amount.toFixed(2)}</strong>
        </p>
      )}
    </div>
  )
}

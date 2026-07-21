// Thai mobile numbers: 10 digits starting with 0 (e.g. 08x/09x/06x-xxx-xxxx).
// Accepts spaces/dashes in the input, validates the digits only.
export function isValidThaiPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "")
  return /^0\d{9}$/.test(digits)
}

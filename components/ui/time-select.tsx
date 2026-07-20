"use client"

interface TimeSelectProps {
  value: string // "HH:MM", or "" when allowClear and unset
  onChange: (value: string) => void
  disabled?: boolean
  // Shows a "--" hour option that clears the whole value to "" (for optional
  // time fields, e.g. a blackout window that can be left unset).
  allowClear?: boolean
  selectClassName?: string
  className?: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
const MINUTES = ["00", "30"] as const

// Nearest allowed minute for a raw stored value, so legacy/off-grid data
// (e.g. a "23:59" sentinel) still renders instead of going blank.
function nearestHalfHour(minute: number): "00" | "30" {
  return minute >= 15 && minute < 45 ? "30" : "00"
}

const DEFAULT_SELECT_CLASSNAME =
  "flex-1 min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"

export function TimeSelect({
  value,
  onChange,
  disabled,
  allowClear,
  selectClassName = DEFAULT_SELECT_CLASSNAME,
  className,
}: TimeSelectProps) {
  const [hourPart, minutePart] = value ? value.split(":") : ["", ""]
  const hour = hourPart || "00"
  const minute = (MINUTES as readonly string[]).includes(minutePart)
    ? minutePart
    : nearestHalfHour(Number(minutePart) || 0)
  const isCleared = !!allowClear && !value

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <select
        value={isCleared ? "" : hour}
        onChange={(e) => (e.target.value === "" ? onChange("") : onChange(`${e.target.value}:${minute}`))}
        disabled={disabled}
        className={selectClassName}
      >
        {allowClear && <option value="">--</option>}
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-gray-500">:</span>
      <select
        value={minute}
        onChange={(e) => onChange(`${hour}:${e.target.value}`)}
        disabled={disabled || isCleared}
        className={selectClassName}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  )
}

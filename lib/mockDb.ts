import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "mock-data")

export type Collection = "rooms" | "bookings" | "admins" | "promotions" | "users"

function filePath(collection: Collection): string {
  return path.join(DATA_DIR, `${collection}.json`)
}

export function readCollection<T = any>(collection: Collection): T[] {
  const raw = fs.readFileSync(filePath(collection), "utf-8")
  return JSON.parse(raw) as T[]
}

export function writeCollection<T = any>(collection: Collection, data: T[]): void {
  fs.writeFileSync(filePath(collection), JSON.stringify(data, null, 2), "utf-8")
}

export function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

export function ok(data: any) {
  return { success: true, data }
}

export function fail(message: string) {
  return { success: false, message, error: { message } }
}

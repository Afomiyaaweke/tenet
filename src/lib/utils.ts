import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { NextResponse } from "next/server"
import { isDatabaseConfigured } from "./db"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Guard for API routes that need a database.
 * Returns a 503 response if no real DATABASE_URL is configured in production.
 * Call this at the top of any POST/GET handler that uses `db`.
 */
export function requireDatabase(): NextResponse | null {
  if (process.env.NODE_ENV === 'production' && !isDatabaseConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Database not configured. Please set DATABASE_URL in your Vercel project settings.',
        code: 'DB_NOT_CONFIGURED',
      },
      { status: 503 },
    )
  }
  return null
}
